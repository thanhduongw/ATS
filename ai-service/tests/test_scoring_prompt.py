"""Phần 4: prompt chấm v2.0 (app/services/scoring/prompt.py) — chỉ ghép chuỗi, không gọi LLM."""

from datetime import date

from app.schemas.jd_extraction import (
    EducationRequirement,
    ExperienceRequirement,
    ExtractedJD,
    Importance,
    RequirementItem,
)
from app.services.scoring import prompt as prompt_module
from app.services.scoring.profile import build_scoring_profile
from app.services.scoring.prompt import JobInfo, build_scoring_prompt
from app.services.scoring.rules import items_to_check

TODAY = date(2026, 10, 22)

JD = ExtractedJD(
    job_title="Lập trình viên Backend Java",
    skills=[
        RequirementItem(name="Java", importance=Importance.REQUIRED, source_text="CÂU-GỐC-JAVA bắt buộc"),
        RequirementItem(name="Spring Boot", importance=Importance.REQUIRED),
        RequirementItem(name="Docker", importance=Importance.PREFERRED, source_text="CÂU-GỐC-DOCKER là lợi thế"),
    ],
    tasks=["Xây dựng API"],
    experience=ExperienceRequirement(min_years=3, importance=Importance.REQUIRED, source_text="CÂU-GỐC-KINH-NGHIỆM"),
    education=EducationRequirement(degree_text="Đại học", fields=["Công nghệ thông tin"], importance=Importance.REQUIRED),
    certifications=[RequirementItem(name="AWS Certified Developer", importance=Importance.PREFERRED)],
    domains=[RequirementItem(name="Ngân hàng", importance=Importance.REQUIRED)],
)

EXTRACTED = {
    "candidate": {"name": "Nguyễn Văn An", "email": "an.nguyen@gmail.com", "phone": "0912 345 678",
                  "location": "Quận 7, TP.HCM", "summary": "Tôi là Nguyễn Văn An, liên hệ an.nguyen@gmail.com"},
    "skills": ["Java", "Spring Boot"],
    "work_experience": [{"company": "ABC Bank", "title": "Backend Developer", "start_date": "2020", "end_date": "nay",
                         "description": "Phát triển REST API bằng Java Spring Boot", "source_text": "0912 345 678"}],
    "education": [{"institution": "ĐH Bách khoa", "degree": "Kỹ sư", "field_of_study": "Công nghệ thông tin"}],
}


def _prompt() -> str:
    profile = build_scoring_profile(EXTRACTED, ["Nguyễn Văn An"])
    return build_scoring_prompt(JD, profile, TODAY, 5.8, None, items_to_check(JD))


def test_prompt_version_is_v2():
    assert prompt_module.PROMPT_VERSION == "v2.0"


def test_prompt_contains_three_level_tables():
    p = _prompt()
    for dim in ("TECHNICAL_SKILLS", "RELEVANT_EXPERIENCE", "DOMAIN"):
        assert f"### {dim}" in p
    assert "SENIORITY" not in p and "EDUCATION_CERTIFICATION" not in p
    # Vài cụm từ khóa của từng bảng mức (docs Bước 3)
    assert "actually USED" in p and "Vue when the JD needs React" in p and "system design, technical leadership" in p
    assert "a few isolated tasks" in p and "intern" in p and "leading a team, owning a whole system" in p
    assert "hard to transfer" in p and "one project, one client" in p and "regulations, business processes" in p


def test_prompt_lists_every_item_to_check():
    p = _prompt()
    # Tìm thẻ của khối dữ liệu (thẻ cũng được nhắc tên trong phần hướng dẫn, nên kèm "\n" để lấy đúng khối)
    block = p[p.index("<requirements_to_check>\n"):p.index("</requirements_to_check>")]
    for item in items_to_check(JD):
        assert f'"name": "{item.name}"' in block and f'"category": "{item.category.value}"' in block
    assert '"name": "Docker"' not in block  # kỹ năng ưu tiên không cần kiểm tra


def test_prompt_has_no_jd_source_text():
    p = _prompt()
    assert "source_text" not in p.split("<job_requirements>")[1]
    assert "CÂU-GỐC" not in p


def test_prompt_has_no_personal_info():
    p = _prompt()
    for leaked in ("Nguyễn Văn An", "an.nguyen@gmail.com", "0912", "Quận 7"):
        assert leaked not in p


def test_prompt_contains_data_blocks_and_years():
    p = _prompt()
    assert "Ngày hiện tại: 2026-10-22" in p and "5.8 năm" in p
    assert p.index("<job_requirements>\n") < p.index("<requirements_to_check>\n") < p.index("<candidate_profile>\n")
    assert "Phát triển REST API bằng Java Spring Boot" in p


def test_jobinfo_unchanged():
    job = JobInfo.from_posting({"title": " Backend ", "experienceRequired": "3 năm",
                                "description": "Mô tả", "requirements": "Yêu cầu"})
    assert job.title == "Backend"
    assert job.as_text() == ("Vị trí: Backend\n\nKinh nghiệm yêu cầu: 3 năm\n\n"
                             "Mô tả công việc:\nMô tả\n\nYêu cầu ứng viên:\nYêu cầu")
    assert JobInfo(title="", requirements="X").as_text() == "Yêu cầu ứng viên:\nX"
