"""Thực nghiệm SSRC: cùng JSON đã trích xuất -> Prompt A/B -> 4 điểm 1--5.

Dùng SDK/LLMManager sẵn có của ATS, không mở DB/RabbitMQ, không sửa scoring production.
LỆNH LIVE CHỈ ĐỌC CV ĐÃ DUYỆT ẨN DANH; tuyệt đối không đưa PDF gốc tới Gemini.
"""
from __future__ import annotations
import csv
import hashlib
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from research.preflight import BASE, PLACEHOLDER_RE, read_pairs, validate_manifest
from research.privacy import quote_in_source, sha, remaining_contact_indicators
from research.prompts import (
    PROMPT_A_VERSION, PROMPT_B_VERSION, EXTRACT_CV_VERSION, EXTRACT_JD_VERSION,
    cv_extraction_prompt, jd_extraction_prompt, score_prompt,
)
from research.schema import CVFacts, JDFacts, ScoreFour, CertPolicy, validate_scoring

PRIVATE = BASE / "private"
REVIEW = PRIVATE / "review"
APPROVALS = PRIVATE / "approvals.json"
OUTPUT = BASE / "output"
EXTRACT_DIR = OUTPUT / "extracted"
SCORE_DIR = OUTPUT / "scores"
POLICY_PATH = BASE / "data" / "jd_policies.csv"
REQUIRED_POLICIES = {"REQUIRED", "PREFERRED", "NOT_SPECIFIED"}


class StudyError(RuntimeError):
    pass


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_policies(path: Path = POLICY_PATH, only_jds: set[str] | None = None) -> dict[str, CertPolicy]:
    if not path.exists():
        raise StudyError("Thiếu research/data/jd_policies.csv")
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    result = {}
    for row in rows:
        key = row.get("jd_id", "").strip()
        if only_jds is not None and key not in only_jds:
            continue
        policy = row.get("cert_policy", "").strip()
        verified = row.get("verified", "").strip().upper()
        if key in result:
            raise StudyError(f"JD bị lặp trong jd_policies.csv: {key}")
        if policy not in REQUIRED_POLICIES or verified != "YES":
            raise StudyError(f"Chưa xác nhận Certifications ở {key}: kiểm tra jd_policies.csv và ghi verified=YES")
        result[key] = policy
    return result


def jd_text(jd_id: str) -> str:
    path = BASE / "data" / "jds" / (jd_id + ".txt")
    if not path.is_file():
        raise StudyError(f"Chưa có nguyên văn: {path.name}")
    text = path.read_text(encoding="utf-8-sig").strip()
    if len(text) < 150 or PLACEHOLDER_RE.search(text):
        raise StudyError(f"{path.name} là placeholder hoặc quá ngắn; cần dán nguyên văn JD")
    return text


def approved_text(cv_id: str) -> str:
    path = REVIEW / (cv_id + ".txt")
    if not path.is_file() or not APPROVALS.is_file():
        raise StudyError(f"{cv_id}: chưa có file ẩn danh đã được duyệt; chạy prepare rồi approve")
    try:
        approved = json.loads(APPROVALS.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        raise StudyError("Không đọc được approvals.json") from exc
    raw = path.read_text(encoding="utf-8")
    if approved.get(cv_id) != sha(raw):
        raise StudyError(f"{cv_id}: nội dung đã đổi sau khi duyệt; cần duyệt lại")
    if len(raw.strip()) < 200:
        raise StudyError(f"{cv_id}: nội dung đã ẩn danh quá ngắn")
    leftover = remaining_contact_indicators(raw)
    if leftover:
        raise StudyError(f"{cv_id}: vẫn thấy dấu hiệu PII kiểu {','.join(leftover)}; sửa file trước khi duyệt")
    return raw


def _save_json_atomic(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(temp, path)


def _json_cache(path: Path, *, model: str, fingerprint: str, model_type):
    if not path.is_file():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw["meta"]["model"] != model or raw["meta"]["fingerprint"] != fingerprint:
            return None
        return model_type.model_validate(raw["data"])
    except (OSError, ValueError, KeyError, TypeError):
        return None


def _fingerprint(*pieces: str) -> str:
    return sha("\x1e".join(pieces))



def _check_extraction(evidence: list[str], source: str, name: str) -> None:
    for index, excerpt in enumerate(evidence, start=1):
        if not quote_in_source(excerpt, source):
            raise StudyError(
                f"{name}: quote thứ {index} không có trong nguồn; kết quả không được lưu"
            )




def _verify_cv(out: CVFacts, text: str):
    if not out.facts:
        raise StudyError(
            "CV extraction không có dữ kiện"
        )

    if len(out.facts) > 120:
        raise StudyError(
            "CV có quá nhiều dữ kiện (>120)"
        )

    valid_facts = []
    invalid_positions = []

    for pos, fact in enumerate(out.facts, start=1):
        if quote_in_source(fact.quote, text):
            valid_facts.append(fact)
        else:
            invalid_positions.append(pos)

    if not valid_facts:
        raise StudyError(
            "Tất cả quote đều không khớp CV; cần kiểm tra"
        )

    if invalid_positions:
        out.facts = valid_facts

        out.limitations.append(
            f"Đã loại {len(invalid_positions)} dữ kiện "
            f"không có quote hợp lệ tại vị trí "
            f"{invalid_positions}. "
            f"Cần rà soát độ đầy đủ của dữ liệu."
        )

        print(
            f"[WARN] CV extraction: "
            f"loại quote không hợp lệ tại "
            f"{invalid_positions}"
        )



def _verify_jd(out: JDFacts, text: str):
    if not out.requirements:
        raise StudyError("JD extraction rỗng; cần kiểm tra nguyên văn JD")
    _check_extraction([f.quote for f in out.requirements], text, "JD extraction")


def _verify_score(out: ScoreFour, config: str, policy: CertPolicy, cv: CVFacts, jd: JDFacts):
    validate_scoring(out, policy, config=config)
    cv_source = "\n".join(x.quote for x in cv.facts)
    jd_source = "\n".join(x.quote for x in jd.requirements)
    for key in ("work_experience", "skills", "education", "certifications"):
        rating = getattr(out, key)
        _check_extraction(rating.cv_evidence, cv_source, f"{config}/{key}/CV")
        _check_extraction(rating.jd_evidence, jd_source, f"{config}/{key}/JD")
        if config == "B" and rating.score is not None:
            dimension = {"work_experience":"WORK_EXPERIENCE", "skills":"SKILLS", "education":"EDUCATION", "certifications":"CERTIFICATIONS"}[key]
            if any(r.dimension == dimension for r in jd.requirements) and not rating.jd_evidence:
                raise StudyError(f"Prompt B thiếu dẫn chứng JD ở {key}")
    credential = re.compile(r"\b(?:TOEIC|IELTS|TOEFL|CEFR|JLPT|HSK|MOS|AWS|AZURE|CISCO|CCNA|B1|B2|C1)\b", re.I)
    if policy == "PREFERRED" and not any(f.category == "CERTIFICATIONS" or credential.search(f.quote) for f in cv.facts):
        # Không có chứng chỉ trong CV -> không được phạt khi JD chỉ ưu tiên.
        if out.certifications.score != 3:
            raise StudyError("Certifications=PREFERRED và CV không có chứng chỉ: điểm phải là 3")


def expected_calls(pairs: list[dict]) -> dict[str, int]:
    return {"cv_extractions": len({p["cv_id"] for p in pairs}),
            "jd_extractions": len({p["jd_id"] for p in pairs}),
            "scores": 2 * len(pairs)}


@dataclass
class StudyRunner:
    manager: Any
    model: str

    async def _invoke(self, prompt: str, response_type, path: Path, *, identifier: str,
                      version: str, source_hash: str, validate):
        fp = _fingerprint(prompt, response_type.__name__, version, source_hash)
        cache = _json_cache(path, model=self.model, fingerprint=fp, model_type=response_type)
        if cache is not None:
            validate(cache)
            print(f"[CACHE] {identifier}")
            return cache, False
        
        # Chỉ retry khi trích xuất CV/JD có quote không hợp lệ.
        retry_note = (
            "\n\nKIỂM TRA LẠI TRÍCH DẪN: Lần trả lời trước có quote không "
            "khớp nguyên văn nguồn. Hãy tạo JSON mới; với mỗi quote, chép "
            "đúng một đoạn ký tự liên tiếp từ nguồn đã cung cấp ở trên. "
            "Không diễn giải, dịch, nối các dòng hoặc sửa chính tả trong quote. "
            "Bỏ dữ kiện nếu không tìm thấy trích dẫn chính xác."
        )

        current_prompt = prompt
        total_in = total_out = 0

        for attempt in range(2):
            out, usage = await self.manager.generate_structured(
                current_prompt, response_type
            )

            total_in += usage.input_tokens
            total_out += usage.output_tokens

            try:
                validate(out)
            
            except StudyError as exc:
                if attempt == 0 and "quote" in str(exc).lower():

                    if response_type in (CVFacts, JDFacts):
                        correction = retry_note

                    elif response_type is ScoreFour:
                        correction = (
                            "\n\nYÊU CẦU SỬA BẰNG CHỨNG: "
                            "Hãy trả lại toàn bộ JSON chấm điểm. "
                            "Với cv_evidence, chỉ sao chép nguyên văn "
                            "một chuỗi trong CV_JSON.facts[].quote. "
                            "Với jd_evidence, chỉ sao chép nguyên văn "
                            "một chuỗi trong JD_JSON.requirements[].quote. "
                            "Không dịch, diễn giải hoặc ghép các quote. "
                            "Nếu không có bằng chứng phù hợp, trả [] "
                            "và giải thích trong reason. "
                            "Điểm số và lý do phải nhất quán "
                            "với các dữ kiện thực tế."
                        )

                    else:
                        raise StudyError(
                            f"{identifier}: {exc}"
                        ) from exc

                    print(
                        f"[RETRY] {identifier}: {exc}; "
                        "yêu cầu Gemini sửa quote"
                    )

                    current_prompt = prompt + correction
                    continue

                raise StudyError(
                    f"{identifier}: {exc}"
                ) from exc


            _save_json_atomic(path, {
                "meta": {
                    "id": identifier,
                    "step_version": version,
                    "model": self.model,
                    "fingerprint": fp,
                    "source_hash": source_hash,
                    "prompt_hash": sha(prompt),
                    "actual_request_hash": sha(current_prompt),
                    "created_at_utc": timestamp(),
                    "input_tokens": total_in,
                    "output_tokens": total_out,
                    "latency_ms": usage.latency_ms,
                    "retries": usage.retries + attempt,
                    "validation_retries": attempt,
                },
                "data": out.model_dump(),
            })

            print(
                f"[API] {identifier}: "
                f"{total_in}+{total_out} tokens"
            )
            return out, True

    async def cv(self, cv_id: str, content: str):
        prompt = cv_extraction_prompt(content)
        path = EXTRACT_DIR / "cv" / f"{cv_id}.json"
        return await self._invoke(prompt, CVFacts, path, identifier=cv_id,
                                  version=EXTRACT_CV_VERSION, source_hash=sha(content),
                                  validate=lambda x: _verify_cv(x, content))

    async def jd(self, jd_id: str, content: str):
        prompt = jd_extraction_prompt(content)
        path = EXTRACT_DIR / "jd" / f"{jd_id}.json"
        return await self._invoke(prompt, JDFacts, path, identifier=jd_id,
                                  version=EXTRACT_JD_VERSION, source_hash=sha(content),
                                  validate=lambda x: _verify_jd(x, content))

    async def score(self, pair: dict, config: str, cv: CVFacts, jd: JDFacts, policy: CertPolicy):
        prompt = score_prompt(config, cv, jd, policy)
        version = PROMPT_A_VERSION if config == "A" else PROMPT_B_VERSION
        path = SCORE_DIR / (pair["pair_id"] + f"__{config}.json")
        source_hash = _fingerprint(json.dumps(cv.model_dump(), ensure_ascii=False, sort_keys=True),
                                   json.dumps(jd.model_dump(), ensure_ascii=False, sort_keys=True), policy)
        out, fresh = await self._invoke(
            prompt, ScoreFour, path, identifier=pair["pair_id"] + "/" + config,
            version=version, source_hash=source_hash,
            validate=lambda x: _verify_score(x, config, policy, cv, jd),
        )
        # Score metadata có ID CV/JD, không lưu tên/email hoặc raw PDF.
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw.get("meta", {}).get("cv_id") != pair["cv_id"] or raw.get("meta", {}).get("jd_id") != pair["jd_id"]:
            raw["meta"].update({"pair_id":pair["pair_id"], "cv_id":pair["cv_id"], "jd_id":pair["jd_id"], "prompt_config":config, "cert_policy":policy})
            _save_json_atomic(path, raw)
        return out, fresh


async def run_study(pairs: list[dict], *, stage: str = "all", model: str = "gemini-3.5-flash-lite", manager=None):
    """Run prevalidated selected pairs, caches/checkpoints handle resume."""
    if stage not in {"extract", "score", "all"}:
        raise StudyError("stage không hợp lệ")
    policies = read_policies(only_jds={p["jd_id"] for p in pairs})
    cvs = {p["cv_id"]: approved_text(p["cv_id"]) for p in pairs}
    jds = {p["jd_id"]: jd_text(p["jd_id"]) for p in pairs}
    missing = {p["jd_id"] for p in pairs} - set(policies)
    if missing:
        raise StudyError(f"jd_policies.csv thiếu: {', '.join(sorted(missing))}")
    if manager is None:
        from dotenv import load_dotenv
        load_dotenv(BASE / ".env", override=False)   
        from app.core.llm_client import LLMManager
        from research.gemini_client import ResearchGeminiClient
        if not os.getenv("GOOGLE_API_KEY"):
            raise StudyError("Thiếu GOOGLE_API_KEY trong research/.env hoặc biến môi trường")
        manager = LLMManager(
            primary=ResearchGeminiClient(model),
            use_fallback=False,
        )
    runner = StudyRunner(manager, model)
    cv_data, jd_data = {}, {}
    for id, content in cvs.items():
        cv_data[id], _ = await runner.cv(id, content)
    for id, content in jds.items():
        jd_data[id], _ = await runner.jd(id, content)
    if stage == "extract":
        print(f"[DONE] Trích xuất {len(cvs)} CV + {len(jds)} JD. Không chấm điểm.")
        return
    finished = 0
    for pair in pairs:
        for config in ("A", "B"):
            await runner.score(pair, config, cv_data[pair["cv_id"]], jd_data[pair["jd_id"]], policies[pair["jd_id"]])
            finished += 1
    print(f"[DONE] {finished}/{2*len(pairs)} lượt chấm; xem research/output/scores và chạy export")


def export_scores(pairs: list[dict], path: Path) -> tuple[int, int]:
    fields = ["pair_id", "cv_id", "jd_id", "config", "model", "prompt_version", "cert_policy", "created_at_utc",
              "work_experience", "skills", "education", "certifications", "certifications_na",
              "reason_work_experience", "reason_skills", "reason_education", "reason_certifications",
              "cv_evidence_work_experience", "cv_evidence_skills", "cv_evidence_education", "cv_evidence_certifications",
              "jd_evidence_work_experience", "jd_evidence_skills", "jd_evidence_education", "jd_evidence_certifications"]
    output_rows = []
    missing = []
    for p in pairs:
        for config in ("A", "B"):
            cache = SCORE_DIR / f"{p['pair_id']}__{config}.json"
            if not cache.is_file():
                missing.append(f"{p['pair_id']}/{config}")
                continue
            raw = json.loads(cache.read_text(encoding="utf-8"))
            meta = raw["meta"]
            if meta.get("pair_id") != p["pair_id"] or meta.get("cv_id") != p["cv_id"] or meta.get("jd_id") != p["jd_id"] or meta.get("prompt_config") != config:
                missing.append(f"{p['pair_id']}/{config} (cache không khớp)")
                continue
            out = ScoreFour.model_validate(raw["data"])
            row = {"pair_id":p["pair_id"], "cv_id":p["cv_id"], "jd_id":p["jd_id"], "config":config,
                   "model":meta["model"], "prompt_version":meta["step_version"],
                   "cert_policy":meta["cert_policy"], "created_at_utc":meta["created_at_utc"]}
            for key in ("work_experience", "skills", "education", "certifications"):
                r = getattr(out, key)
                row[key] = "" if r.score is None else r.score
                row[f"reason_{key}"] = r.reason
                row[f"cv_evidence_{key}"] = " || ".join(r.cv_evidence)
                row[f"jd_evidence_{key}"] = " || ".join(r.jd_evidence)
            row["certifications_na"] = "YES" if out.certifications.score is None else "NO"
            output_rows.append(row)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(output_rows)
    return len(output_rows), len(missing)
