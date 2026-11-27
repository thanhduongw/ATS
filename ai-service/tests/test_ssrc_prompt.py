"""Prompt của sản phẩm phải TRÙNG KÝ TỰ với `research/` (bài báo SSRC 2026).

Đây là test duy nhất import thư mục `research` (đã gỡ khỏi repo; chép vào `ai-service/research/` để chạy,
không có thì test tự bỏ qua); mã trong `app/` không được import từ đó. Nếu test này đỏ nghĩa là
prompt của sản phẩm đã lệch khỏi prompt đã dùng để thực nghiệm: sửa `app/services/prompts/ssrc.py`, không sửa `research/`.
"""
from pathlib import Path

import pytest

from app.schemas.ssrc import CVFacts, Fact, JDFacts, Requirement
from app.services.prompts import ssrc as product

research_prompts = pytest.importorskip("research.prompts")
research_schema = pytest.importorskip("research.schema")

ROOT = Path(__file__).resolve().parents[1]

CV_TEXT = "Kinh nghiệm\nBackend Developer tại ABC (2021-2024)\nKỹ năng: Java, Spring Boot\nIELTS 7.0\n"
JD_TEXT = "Vị trí: Java Developer\nYêu cầu: 2 năm Java Spring Boot. Ưu tiên chứng chỉ AWS."


def _cv():
    return CVFacts(
        facts=[Fact(category="WORK_EXPERIENCE", quote="Backend Developer tại ABC (2021-2024)", note="3 năm backend"),
               Fact(category="SKILLS", quote="Java, Spring Boot", note="Kỹ năng chính")],
        limitations=["CV ngắn"])


def _jd():
    return JDFacts(
        job_title="Java Developer",
        requirements=[Requirement(dimension="SKILLS", priority="REQUIRED", requirement="Java Spring Boot",
                                  quote="2 năm Java Spring Boot"),
                      Requirement(dimension="CERTIFICATIONS", priority="PREFERRED", requirement="AWS",
                                  quote="Ưu tiên chứng chỉ AWS")],
        limitations=[])


def _research_cv():
    return research_schema.CVFacts.model_validate(_cv().model_dump())


def _research_jd():
    return research_schema.JDFacts.model_validate(_jd().model_dump())


@pytest.mark.parametrize("policy", ["REQUIRED", "PREFERRED", "NOT_SPECIFIED"])
def test_score_prompt_b_identical_to_research(policy):
    mine = product.score_prompt_b(_cv(), _jd(), policy)
    theirs = research_prompts.score_prompt("B", _research_cv(), _research_jd(), policy)
    assert mine == theirs


def test_extraction_prompts_identical_to_research():
    assert product.cv_extraction_prompt(CV_TEXT) == research_prompts.cv_extraction_prompt(CV_TEXT)
    assert product.cv_extraction_prompt(CV_TEXT, "19/11/2026") == research_prompts.cv_extraction_prompt(CV_TEXT, "19/11/2026")
    assert "NGÀY THAM CHIẾU: 19/11/2026" in product.cv_extraction_prompt(CV_TEXT, "19/11/2026")
    assert product.jd_extraction_prompt(JD_TEXT) == research_prompts.jd_extraction_prompt(JD_TEXT)


def test_prompt_versions_match_research():
    assert product.EXTRACT_CV_VERSION == research_prompts.EXTRACT_CV_VERSION
    assert product.EXTRACT_JD_VERSION == research_prompts.EXTRACT_JD_VERSION
    assert product.PROMPT_B_VERSION == research_prompts.PROMPT_B_VERSION


def test_prompt_b_file_is_a_copy_of_research_file():
    mine = (ROOT / "app/services/prompts/ssrc_prompt_B.txt").read_bytes()
    theirs = (ROOT / "research/data/prompts/prompt_B.txt").read_bytes()
    assert mine == theirs


def test_prompt_keeps_researcher_confirmation_sentence():
    prompt = product.score_prompt_b(_cv(), _jd(), "PREFERRED")
    assert "CERTIFICATIONS_POLICY ĐÃ ĐƯỢC NGƯỜI NGHIÊN CỨU XÁC NHẬN = PREFERRED." in prompt


def test_prompt_hash_is_stable():
    assert product.prompt_b_hash() == product.sha256_text(
        (ROOT / "app/services/prompts/ssrc_prompt_B.txt").read_text(encoding="utf-8-sig").strip())
