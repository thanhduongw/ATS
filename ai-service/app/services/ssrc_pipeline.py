"""Ba lời gọi AI của quy trình SSRC (trích xuất JD, trích xuất CV, chấm điểm) kèm kiểm tra trích dẫn.

Logic chép từ `research/pipeline.py` (không import từ đó). Mỗi lời gọi: gọi Gemini → kiểm tra đầu ra → nếu SAI TRÍCH DẪN
thì gửi lại đúng một lần kèm đoạn "YÊU CẦU SỬA…" → vẫn sai thì ném `CitationError` (hồ sơ FAILED, HR thấy câu ở
`public_errors.CITATION_MISMATCH`). Lỗi khác của đầu ra (điểm sai luật, thiếu dẫn chứng JD…) không gửi lại: ném
`InvalidOutputError`.

Module này không đụng DB/RabbitMQ để dễ kiểm thử; phần lưu nằm ở `facts_store.py`.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Callable, TypeVar

from pydantic import BaseModel

from app.core.llm_client import LLMManager
from app.schemas.ssrc import (
    DIMENSION_FIELDS,
    CertPolicy,
    CVFacts,
    JDFacts,
    ScoreFour,
    validate_scoring,
)
from app.services.privacy import quote_in_source
from app.services.prompts.ssrc import (
    REFERENCE_DATE_PLACEHOLDER,
    cv_extraction_prompt,
    jd_extraction_prompt,
    score_prompt_b,
)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

MAX_CV_FACTS = 120


class SsrcOutputError(Exception):
    """Đầu ra của AI không đạt kiểm tra."""


class CitationError(SsrcOutputError):
    """Câu trích dẫn không có trong nguồn (CV/JD). Được gửi lại AI một lần."""


class InvalidOutputError(SsrcOutputError):
    """Đầu ra sai luật chấm hoặc thiếu bằng chứng (không gửi lại)."""


@dataclass
class CallStats:
    """Cộng dồn token/chi phí của một bước (kể cả lần gửi lại vì trích dẫn sai)."""
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    retries: int = 0
    validation_retries: int = 0

    def add(self, other: "CallStats") -> None:
        self.model = self.model or other.model
        self.input_tokens += other.input_tokens
        self.output_tokens += other.output_tokens
        self.estimated_cost_usd += other.estimated_cost_usd
        self.latency_ms += other.latency_ms
        self.retries += other.retries
        self.validation_retries += other.validation_retries


# --- Kiểm tra đầu ra (chép từ research/pipeline.py) --------------------------------------------------------------

def _check_quotes(evidence: list[str], source: str, name: str) -> None:
    for index, excerpt in enumerate(evidence, start=1):
        if not quote_in_source(excerpt, source):
            raise CitationError(f"{name}: trích dẫn thứ {index} không có trong nguồn")


def verify_cv(out: CVFacts, text: str) -> None:
    """Loại dữ kiện có quote sai; hết dữ kiện thì lỗi."""
    if not out.facts:
        raise InvalidOutputError("CV extraction không có dữ kiện")
    if len(out.facts) > MAX_CV_FACTS:
        raise InvalidOutputError(f"CV có quá nhiều dữ kiện (>{MAX_CV_FACTS})")
    valid = [f for f in out.facts if quote_in_source(f.quote, text)]
    invalid_positions = [i for i, f in enumerate(out.facts, start=1) if not quote_in_source(f.quote, text)]
    if not valid:
        raise CitationError("Tất cả trích dẫn đều không khớp CV")
    if invalid_positions:
        out.facts = valid
        out.limitations.append(
            f"Đã loại {len(invalid_positions)} dữ kiện không có quote hợp lệ tại vị trí {invalid_positions}. "
            f"Cần rà soát độ đầy đủ của dữ liệu.")
        logger.warning("CV extraction: loại quote không hợp lệ tại %s", invalid_positions)


def verify_jd(out: JDFacts, text: str) -> None:
    if not out.requirements:
        raise InvalidOutputError("JD extraction rỗng")
    _check_quotes([r.quote for r in out.requirements], text, "JD extraction")


_CREDENTIAL = re.compile(r"\b(?:TOEIC|IELTS|TOEFL|CEFR|JLPT|HSK|MOS|AWS|AZURE|CISCO|CCNA|B1|B2|C1)\b", re.I)


def verify_score(out: ScoreFour, policy: CertPolicy, cv: CVFacts, jd: JDFacts) -> None:
    try:
        validate_scoring(out, policy, config="B")
    except ValueError as exc:
        raise InvalidOutputError(str(exc)) from exc
    cv_source = "\n".join(x.quote for x in cv.facts)
    jd_source = "\n".join(x.quote for x in jd.requirements)
    for key, dimension in DIMENSION_FIELDS.items():
        rating = getattr(out, key)
        _check_quotes(rating.cv_evidence, cv_source, f"B/{key}/CV")
        _check_quotes(rating.jd_evidence, jd_source, f"B/{key}/JD")
        if rating.score is not None and any(r.dimension == dimension for r in jd.requirements) \
                and not rating.jd_evidence:
            raise InvalidOutputError(f"Prompt B thiếu dẫn chứng JD ở {key}")
    if policy == "PREFERRED" and not any(f.category == "CERTIFICATIONS" or _CREDENTIAL.search(f.quote)
                                         for f in cv.facts):
        # Không có chứng chỉ trong CV -> không được phạt khi JD chỉ ưu tiên.
        if out.certifications.score != 3:
            raise InvalidOutputError("Certifications=PREFERRED và CV không có chứng chỉ: điểm phải là 3")


# --- Đoạn yêu cầu sửa khi gửi lại (chép từ research/pipeline.py) -----------------------------------------------

_RETRY_EXTRACT = (
    "\n\nKIỂM TRA LẠI TRÍCH DẪN: Lần trả lời trước có quote không "
    "khớp nguyên văn nguồn. Hãy tạo JSON mới; với mỗi quote, chép "
    "đúng một đoạn ký tự liên tiếp từ nguồn đã cung cấp ở trên. "
    "Không diễn giải, dịch, nối các dòng hoặc sửa chính tả trong quote. "
    "Bỏ dữ kiện nếu không tìm thấy trích dẫn chính xác."
)

_RETRY_SCORE = (
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


async def _invoke(
    manager: LLMManager, prompt: str, response_type: type[T], validate: Callable[[T], None], correction: str,
) -> tuple[T, CallStats]:
    """Gọi AI; sai trích dẫn lần đầu thì gửi lại một lần kèm `correction`."""
    stats = CallStats()
    current = prompt
    for attempt in range(2):
        out, usage = await manager.generate_structured(current, response_type)
        stats.model = usage.model
        stats.input_tokens += usage.input_tokens
        stats.output_tokens += usage.output_tokens
        stats.estimated_cost_usd += usage.estimated_cost_usd
        stats.latency_ms += usage.latency_ms
        stats.retries += usage.retries
        try:
            validate(out)
        except CitationError as exc:
            if attempt == 0:
                logger.info("Trích dẫn sai (%s) — yêu cầu AI sửa một lần", exc)
                current = prompt + correction
                stats.validation_retries += 1
                continue
            raise
        return out, stats
    raise AssertionError("unreachable")  # pragma: no cover


async def extract_jd_facts(jd_text: str, manager: LLMManager) -> tuple[JDFacts, CallStats]:
    return await _invoke(manager, jd_extraction_prompt(jd_text), JDFacts,
                         lambda out: verify_jd(out, jd_text), _RETRY_EXTRACT)


async def extract_cv_facts(cv_text: str, manager: LLMManager, reference_date: str = REFERENCE_DATE_PLACEHOLDER,
                          ) -> tuple[CVFacts, CallStats]:
    """`cv_text` là CV đã che PII; câu trích được kiểm tra với đúng văn bản này.
    `reference_date` (dd/mm/yyyy): mốc quy đổi "nay"/"hiện tại" trong prompt v2 — nơi gọi truyền ngày chấm."""
    return await _invoke(manager, cv_extraction_prompt(cv_text, reference_date), CVFacts,
                         lambda out: verify_cv(out, cv_text), _RETRY_EXTRACT)


async def score_four(cv: CVFacts, jd: JDFacts, policy: CertPolicy, manager: LLMManager) -> tuple[ScoreFour, CallStats]:
    return await _invoke(manager, score_prompt_b(cv, jd, policy), ScoreFour,
                         lambda out: verify_score(out, policy, cv, jd), _RETRY_SCORE)
