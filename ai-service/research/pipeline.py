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
    PROMPT_VERSIONS, EXTRACT_CV_VERSION, EXTRACT_JD_VERSION,
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
# Ngày tham chiếu của prompt trích xuất CV v2 ("nay"/"hiện tại" quy đổi tới ngày này). CỐ ĐỊNH cho cả một đợt chạy:
# đổi ngày = đổi prompt = cache CV mất hiệu lực. Đặt bằng biến môi trường SSRC_REFERENCE_DATE (dd/mm/yyyy).
REFERENCE_DATE = os.environ.get("SSRC_REFERENCE_DATE", "19/11/2026")


# Bản trích xuất dùng cho mọi lượt chấm của bài báo (đợt 04–05/11/2026). Đợt chạy thêm đọc thẳng các JSON này
# qua --extraction-dir, không gọi lại bước trích xuất (prompt trích xuất CV hiện tại đã là v2).
# Đợt chạy thêm đọc lại đúng bản trích xuất hiện hành (CV v2 từ 21/11/2026), không trộn phiên bản.
FROZEN_EXTRACT_VERSIONS = {"cv": EXTRACT_CV_VERSION, "jd": EXTRACT_JD_VERSION}


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


def expected_calls(pairs: list[dict], configs: tuple[str, ...] = ("A", "B"), *,
                   frozen_extraction: bool = False) -> dict[str, int]:
    return {"cv_extractions": 0 if frozen_extraction else len({p["cv_id"] for p in pairs}),
            "jd_extractions": 0 if frozen_extraction else len({p["jd_id"] for p in pairs}),
            "scores": len(configs) * len(pairs)}


def load_frozen_extraction(directory: Path, kind: str, item_id: str, content: str, model: str):
    """Đọc bản trích xuất đã có (phiên bản hiện hành), KHÔNG gọi API. Kiểm tra phiên bản, model, nguồn và quote; không sửa dữ liệu."""
    path = directory / kind / f"{item_id}.json"
    if not path.is_file():
        raise StudyError(f"Thiếu bản trích xuất {kind} {item_id} ở {path}")
    try:
        text = path.read_text(encoding="utf-8")
        raw = json.loads(text)
        meta = raw["meta"]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise StudyError(f"Không đọc được {path}") from exc
    expected = FROZEN_EXTRACT_VERSIONS[kind]
    if meta.get("step_version") != expected:
        raise StudyError(f"{path.name}: step_version={meta.get('step_version')}, cần {expected}")
    if meta.get("model") != model:
        raise StudyError(f"{path.name}: trích xuất bằng {meta.get('model')}, đợt chấm dùng {model}")
    if meta.get("source_hash") != sha(content):
        raise StudyError(f"{path.name}: nguồn {kind} đã đổi so với lúc trích xuất")
    if kind == "cv" and meta.get("reference_date") != REFERENCE_DATE:
        raise StudyError(f"{path.name}: ngày tham chiếu {meta.get('reference_date')}, đợt này dùng {REFERENCE_DATE}")
    if kind == "cv":
        data = CVFacts.model_validate(raw["data"])
        if not data.facts:
            raise StudyError(f"{item_id}: bản trích xuất rỗng")
        _check_extraction([f.quote for f in data.facts], content, f"{item_id} (trích xuất cố định)")
    else:
        data = JDFacts.model_validate(raw["data"])
        _verify_jd(data, content)
    return data, {"file": path.name, "step_version": expected, "file_sha256": sha(text)}


@dataclass
class StudyRunner:
    manager: Any
    model: str
    score_dir: Path | None = None   # None = SCORE_DIR (output/scores)
    run_tag: str | None = None

    async def _invoke(self, prompt: str, response_type, path: Path, *, identifier: str,
                      version: str, source_hash: str, validate, extra_meta: dict | None = None):
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
        total_in = total_out = total_latency = 0

        for attempt in range(2):
            try:
                out, usage = await self.manager.generate_structured(
                    current_prompt, response_type
                )
            except Exception as exc:
                # Token của lượt trước (đã trả lời nhưng sai quote) vẫn được tính khi báo cáo.
                exc.ssrc_tokens = (total_in, total_out)
                raise

            total_in += usage.input_tokens
            total_out += usage.output_tokens
            total_latency += usage.latency_ms

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

                err = StudyError(f"{identifier}: {exc}")
                err.ssrc_tokens = (total_in, total_out)
                raise err from exc

            from app.core.config import get_settings
            settings = get_settings()
            _save_json_atomic(path, {
                "meta": {
                    "id": identifier,
                    "step_version": version,
                    "model": self.model,
                    "fingerprint": fp,
                    "source_hash": source_hash,
                    "prompt_hash": sha(prompt),
                    "reference_date": REFERENCE_DATE if response_type is CVFacts else None,
                    "actual_request_hash": sha(current_prompt),
                    "created_at_utc": timestamp(),
                    "input_tokens": total_in,
                    "output_tokens": total_out,
                    "latency_ms": usage.latency_ms,
                    "retries": usage.retries + attempt,
                    "validation_retries": attempt,
                    "latency_ms_total": total_latency,
                    "temperature": settings.llm_temperature,
                    "seed": settings.llm_seed,
                    "run_tag": self.run_tag,
                    **(extra_meta or {}),
                },
                "data": out.model_dump(),
            })

            print(
                f"[API] {identifier}: "
                f"{total_in}+{total_out} tokens"
            )
            return out, True

    async def cv(self, cv_id: str, content: str):
        prompt = cv_extraction_prompt(content, REFERENCE_DATE)
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

    async def score(self, pair: dict, config: str, cv: CVFacts, jd: JDFacts, policy: CertPolicy,
                    extra_meta: dict | None = None):
        prompt = score_prompt(config, cv, jd, policy)
        version = PROMPT_VERSIONS[config]
        path = (self.score_dir or SCORE_DIR) / (pair["pair_id"] + f"__{config}.json")
        source_hash = _fingerprint(json.dumps(cv.model_dump(), ensure_ascii=False, sort_keys=True),
                                   json.dumps(jd.model_dump(), ensure_ascii=False, sort_keys=True), policy)
        out, fresh = await self._invoke(
            prompt, ScoreFour, path, identifier=pair["pair_id"] + "/" + config,
            version=version, source_hash=source_hash,
            validate=lambda x: _verify_score(x, config, policy, cv, jd), extra_meta=extra_meta,
        )
        # Score metadata có ID CV/JD, không lưu tên/email hoặc raw PDF.
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw.get("meta", {}).get("cv_id") != pair["cv_id"] or raw.get("meta", {}).get("jd_id") != pair["jd_id"]:
            raw["meta"].update({"pair_id":pair["pair_id"], "cv_id":pair["cv_id"], "jd_id":pair["jd_id"], "prompt_config":config, "cert_policy":policy})
            _save_json_atomic(path, raw)
        return out, fresh


async def run_study(pairs: list[dict], *, stage: str = "all", model: str = "gemini-3.5-flash-lite", manager=None,
                    configs: tuple[str, ...] = ("A", "B"), extraction_dir: Path | None = None,
                    score_dir: Path | None = None, run_tag: str | None = None, keep_going: bool = False) -> dict:
    """Run prevalidated selected pairs, caches/checkpoints handle resume.

    extraction_dir: đọc thẳng bản trích xuất hiện hành ở đó, không gọi API trích xuất.
    keep_going: một lượt chấm lỗi thì ghi lại rồi chạy tiếp các lượt khác.
    """
    if stage not in {"extract", "score", "all"}:
        raise StudyError("stage không hợp lệ")
    if extraction_dir is not None and stage == "extract":
        raise StudyError("--extraction-dir dùng bản trích xuất có sẵn; không chạy stage extract")
    unknown = [c for c in configs if c not in PROMPT_VERSIONS]
    if unknown:
        raise StudyError(f"Cấu hình không hợp lệ: {unknown}")
    policies = read_policies(only_jds={p["jd_id"] for p in pairs})
    cvs = {p["cv_id"]: approved_text(p["cv_id"]) for p in pairs}
    jds = {p["jd_id"]: jd_text(p["jd_id"]) for p in pairs}
    missing = {p["jd_id"] for p in pairs} - set(policies)
    if missing:
        raise StudyError(f"jd_policies.csv thiếu: {', '.join(sorted(missing))}")
    # Nạp bản trích xuất cố định TRƯỚC khi tạo client: thiếu/sai phiên bản thì dừng khi chưa gọi API nào.
    cv_data, jd_data, extraction_meta = {}, {}, {}
    if extraction_dir is not None:
        for id, content in cvs.items():
            cv_data[id], extraction_meta[id] = load_frozen_extraction(extraction_dir, "cv", id, content, model)
        for id, content in jds.items():
            jd_data[id], extraction_meta[id] = load_frozen_extraction(extraction_dir, "jd", id, content, model)
        print(f"[FROZEN] {len(cv_data)} CV + {len(jd_data)} JD trích xuất cố định từ {extraction_dir}; không gọi API trích xuất")
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
    runner = StudyRunner(manager, model, score_dir=score_dir, run_tag=run_tag)
    if extraction_dir is None:
        for id, content in cvs.items():
            cv_data[id], _ = await runner.cv(id, content)
        for id, content in jds.items():
            jd_data[id], _ = await runner.jd(id, content)
    if stage == "extract":
        print(f"[DONE] Trích xuất {len(cvs)} CV + {len(jds)} JD. Không chấm điểm.")
        return {}
    summary = {"ok": 0, "cached": 0, "failed": 0, "failures": []}
    for pair in pairs:
        for config in configs:
            extra = None
            if extraction_dir is not None:
                extra = {"extraction_cv": extraction_meta[pair["cv_id"]],
                         "extraction_jd": extraction_meta[pair["jd_id"]]}
            try:
                _, fresh = await runner.score(pair, config, cv_data[pair["cv_id"]], jd_data[pair["jd_id"]],
                                              policies[pair["jd_id"]], extra_meta=extra)
            except Exception as exc:
                if not keep_going:
                    raise
                tokens = getattr(exc, "ssrc_tokens", (0, 0))
                code = re.search(r"\b(400|401|403|404|408|429|500|502|503|504)\b", str(exc))
                # Lỗi xác minh chỉ nêu tiêu chí/vị trí quote; lỗi API chỉ ghi loại + mã HTTP, không ghi payload.
                if isinstance(exc, StudyError):
                    message = str(exc)
                else:
                    message = type(exc).__name__ + (f" HTTP {code.group(1)}" if code else "")
                summary["failed"] += 1
                summary["failures"].append({"pair_id": pair["pair_id"], "config": config, "error": message[:300],
                                            "input_tokens": tokens[0], "output_tokens": tokens[1]})
                print(f"[FAIL] {pair['pair_id']}/{config}: {message[:200]}")
                continue
            summary["ok" if fresh else "cached"] += 1
    done = summary["ok"] + summary["cached"]
    print(f"[DONE] {done}/{len(configs) * len(pairs)} lượt chấm (mới {summary['ok']}, cache {summary['cached']}, "
          f"lỗi {summary['failed']}); xem {score_dir or SCORE_DIR} và chạy export")
    return summary


METRIC_FIELDS = ["input_tokens", "output_tokens", "latency_ms", "retries", "validation_retries"]


def export_scores(pairs: list[dict], path: Path, *, configs: tuple[str, ...] = ("A", "B"),
                  score_dir: Path | None = None, extra_metrics: bool = False) -> tuple[int, int]:
    """extra_metrics=False giữ nguyên định dạng results_100_pairs_2_prompts.csv; True thêm cột đo ở cuối."""
    score_dir = score_dir or SCORE_DIR
    fields = ["pair_id", "cv_id", "jd_id", "config", "model", "prompt_version", "cert_policy", "created_at_utc",
              "work_experience", "skills", "education", "certifications", "certifications_na",
              "reason_work_experience", "reason_skills", "reason_education", "reason_certifications",
              "cv_evidence_work_experience", "cv_evidence_skills", "cv_evidence_education", "cv_evidence_certifications",
              "jd_evidence_work_experience", "jd_evidence_skills", "jd_evidence_education", "jd_evidence_certifications"]
    if extra_metrics:
        fields = fields + METRIC_FIELDS + ["run_tag"]
    output_rows = []
    missing = []
    for p in pairs:
        for config in configs:
            cache = score_dir / f"{p['pair_id']}__{config}.json"
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
            if extra_metrics:
                for key in METRIC_FIELDS:
                    row[key] = meta.get(key, "")
                row["run_tag"] = meta.get("run_tag") or ""
            output_rows.append(row)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(output_rows)
    return len(output_rows), len(missing)
