"""Kiểm tra trích dẫn, gửi lại một lần, PII và luật chấm của quy trình SSRC (AI giả, không gọi mạng)."""
import asyncio

import pytest

from app.core.llm_client import LLMUsage
from app.schemas.ssrc import CVFacts, Fact, JDFacts, Rating, Requirement, ScoreFour
from app.services.privacy import quote_in_source, redact, remaining_contact_indicators
from app.services.ssrc_pipeline import (
    CitationError,
    InvalidOutputError,
    extract_cv_facts,
    extract_jd_facts,
    score_four,
    verify_cv,
    verify_score,
)

CV_TEXT = "Backend Developer tại ABC (2021-2024)\nKỹ năng: Java, Spring Boot\nIELTS 7.0\n"
JD_TEXT = "Vị trí: Java Developer\nYêu cầu: 2 năm Java Spring Boot. Ưu tiên chứng chỉ AWS."


class FakeManager:
    """Trả lần lượt các kết quả đã soạn; ghi lại prompt đã nhận."""

    def __init__(self, *outputs):
        self.outputs = list(outputs)
        self.prompts: list[str] = []

    async def generate_structured(self, prompt, response_type, system_prompt=None):
        self.prompts.append(prompt)
        usage = LLMUsage(model="fake", input_tokens=100, output_tokens=10, estimated_cost_usd=0.001, latency_ms=5)
        return self.outputs.pop(0), usage


def fact(category, quote, note="ghi chú"):
    return Fact(category=category, quote=quote, note=note)


def cv_facts(*facts):
    return CVFacts(facts=list(facts), limitations=[])


def jd_facts(*reqs):
    return JDFacts(job_title="Java Developer", requirements=list(reqs), limitations=[])


def req(dimension, priority, quote):
    return Requirement(dimension=dimension, priority=priority, requirement="yêu cầu chuẩn hoá", quote=quote)


def rating(score, cv=(), jd=(), reason="Lý do ngắn gọn"):
    return Rating(score=score, reason=reason, cv_evidence=list(cv), jd_evidence=list(jd))


GOOD_CV = cv_facts(fact("WORK_EXPERIENCE", "Backend Developer tại ABC (2021-2024)"),
                   fact("SKILLS", "Java, Spring Boot"))
GOOD_JD = jd_facts(req("SKILLS", "REQUIRED", "2 năm Java Spring Boot"))


def run(coro):
    return asyncio.run(coro)


# --- quote_in_source / PII -------------------------------------------------------------------------------------

def test_quote_in_source_tolerates_line_breaks_and_punctuation():
    assert quote_in_source("Java,  Spring\nBoot", CV_TEXT)
    assert not quote_in_source("Python, Django", CV_TEXT)
    assert not quote_in_source("ab", "ab cd")  # quá ngắn


def test_redact_hides_contact_and_name():
    raw = "NGUYỄN VĂN A\nEmail: a@b.com\nĐiện thoại 0912345678\nJava Developer tại ABC\ngithub.com/abc"
    out = redact(raw)
    assert "a@b.com" not in out and "0912345678" not in out and "github.com" not in out
    assert "NGUYỄN VĂN A" not in out and "Java Developer tại ABC" in out
    assert remaining_contact_indicators(out) == []


def test_remaining_contact_indicators_detects_leftovers():
    assert "email" in remaining_contact_indicators("liên hệ nva@gmail.com")


# --- trích xuất CV / JD ------------------------------------------------------------------------------------------

def test_cv_drops_facts_with_bad_quotes_but_keeps_valid_ones():
    out = cv_facts(fact("SKILLS", "Java, Spring Boot"), fact("SKILLS", "Rust và Go thành thạo"))
    manager = FakeManager(out)
    facts, stats = run(extract_cv_facts(CV_TEXT, manager))
    assert [f.quote for f in facts.facts] == ["Java, Spring Boot"]
    assert any("Đã loại 1 dữ kiện" in x for x in facts.limitations)
    assert len(manager.prompts) == 1 and stats.validation_retries == 0


def test_cv_all_bad_quotes_retries_once_then_fails():
    bad = cv_facts(fact("SKILLS", "không có trong cv"))
    manager = FakeManager(bad, bad)
    with pytest.raises(CitationError):
        run(extract_cv_facts(CV_TEXT, manager))
    assert len(manager.prompts) == 2
    assert "KIỂM TRA LẠI TRÍCH DẪN" in manager.prompts[1] and "KIỂM TRA LẠI" not in manager.prompts[0]


def test_cv_retry_recovers_and_sums_usage():
    manager = FakeManager(cv_facts(fact("SKILLS", "bịa hoàn toàn")), cv_facts(fact("SKILLS", "Java, Spring Boot")))
    facts, stats = run(extract_cv_facts(CV_TEXT, manager))
    assert len(facts.facts) == 1 and stats.validation_retries == 1
    assert stats.input_tokens == 200 and stats.output_tokens == 20
    assert stats.estimated_cost_usd == pytest.approx(0.002)


def test_cv_without_facts_is_invalid_not_retried():
    manager = FakeManager(cv_facts())
    with pytest.raises(InvalidOutputError):
        run(extract_cv_facts(CV_TEXT, manager))
    assert len(manager.prompts) == 1


def test_jd_wrong_quote_retries_once_then_fails():
    bad = jd_facts(req("SKILLS", "REQUIRED", "yêu cầu không có trong JD"))
    manager = FakeManager(bad, bad)
    with pytest.raises(CitationError):
        run(extract_jd_facts(JD_TEXT, manager))
    assert len(manager.prompts) == 2


def test_jd_empty_requirements_is_invalid():
    with pytest.raises(InvalidOutputError):
        run(extract_jd_facts(JD_TEXT, FakeManager(jd_facts())))


# --- chấm điểm -----------------------------------------------------------------------------------------------------

def four(we, sk, ed, ce):
    return ScoreFour(work_experience=we, skills=sk, education=ed, certifications=ce)


NA = rating(None, reason="N/A: JD không đề cập chứng chỉ")


def test_score_ok_and_prompt_contains_policy():
    out = four(rating(4, ["Backend Developer tại ABC (2021-2024)"]),
               rating(4, ["Java, Spring Boot"], ["2 năm Java Spring Boot"]), rating(3), NA)
    manager = FakeManager(out)
    got, _ = run(score_four(GOOD_CV, GOOD_JD, "NOT_SPECIFIED", manager))
    assert got.skills.score == 4
    assert "CERTIFICATIONS_POLICY ĐÃ ĐƯỢC NGƯỜI NGHIÊN CỨU XÁC NHẬN = NOT_SPECIFIED." in manager.prompts[0]


def test_score_evidence_not_in_cv_retries_once_then_fails():
    bad = four(rating(4, ["Tôi từng làm ở Google"]), rating(4, [], ["2 năm Java Spring Boot"]), rating(3), NA)
    manager = FakeManager(bad, bad)
    with pytest.raises(CitationError):
        run(score_four(GOOD_CV, GOOD_JD, "NOT_SPECIFIED", manager))
    assert len(manager.prompts) == 2 and "YÊU CẦU SỬA BẰNG CHỨNG" in manager.prompts[1]


def test_score_retry_can_fix_evidence():
    bad = four(rating(4, ["Tôi từng làm ở Google"]), rating(4, [], ["2 năm Java Spring Boot"]), rating(3), NA)
    good = four(rating(4, ["Backend Developer tại ABC (2021-2024)"]), rating(4, [], ["2 năm Java Spring Boot"]),
                rating(3), NA)
    manager = FakeManager(bad, good)
    got, stats = run(score_four(GOOD_CV, GOOD_JD, "NOT_SPECIFIED", manager))
    assert got.work_experience.score == 4 and stats.validation_retries == 1


def test_score_missing_jd_evidence_where_jd_has_requirement():
    out = four(rating(4), rating(4, [], []), rating(3), NA)  # skills có yêu cầu trong JD nhưng không dẫn chứng JD
    with pytest.raises(InvalidOutputError, match="thiếu dẫn chứng JD ở skills"):
        verify_score(out, "NOT_SPECIFIED", GOOD_CV, GOOD_JD)


def test_score_certifications_must_follow_policy():
    not_specified_with_score = four(rating(3), rating(3, [], ["2 năm Java Spring Boot"]), rating(3), rating(3))
    with pytest.raises(InvalidOutputError):
        verify_score(not_specified_with_score, "NOT_SPECIFIED", GOOD_CV, GOOD_JD)
    required_without_score = four(rating(3), rating(3, [], ["2 năm Java Spring Boot"]), rating(3), NA)
    with pytest.raises(InvalidOutputError):
        verify_score(required_without_score, "REQUIRED", GOOD_CV, GOOD_JD)


def test_score_preferred_without_cv_certificate_must_be_three():
    jd = jd_facts(req("SKILLS", "REQUIRED", "2 năm Java Spring Boot"),
                  req("CERTIFICATIONS", "PREFERRED", "Ưu tiên chứng chỉ AWS"))
    cv = cv_facts(fact("SKILLS", "Java, Spring Boot"))
    base = dict(work_experience=rating(3), skills=rating(3, [], ["2 năm Java Spring Boot"]), education=rating(3))
    with pytest.raises(InvalidOutputError, match="phải là 3"):
        verify_score(ScoreFour(**base, certifications=rating(2, [], ["Ưu tiên chứng chỉ AWS"])),
                     "PREFERRED", cv, jd)
    verify_score(ScoreFour(**base, certifications=rating(3, [], ["Ưu tiên chứng chỉ AWS"])), "PREFERRED", cv, jd)


def test_score_preferred_with_cv_certificate_can_be_higher():
    jd = jd_facts(req("CERTIFICATIONS", "PREFERRED", "Ưu tiên chứng chỉ AWS"))
    cv = cv_facts(fact("CERTIFICATIONS", "AWS Certified Developer"))
    out = four(rating(3), rating(3), rating(3), rating(4, ["AWS Certified Developer"], ["Ưu tiên chứng chỉ AWS"]))
    verify_score(out, "PREFERRED", cv, jd)


def test_rating_range_is_validated_by_schema():
    with pytest.raises(ValueError):
        rating(6)
    with pytest.raises(ValueError):
        rating(0)


def test_verify_cv_limit():
    many = cv_facts(*[fact("SKILLS", "Java, Spring Boot") for _ in range(121)])
    with pytest.raises(InvalidOutputError):
        verify_cv(many, CV_TEXT)
