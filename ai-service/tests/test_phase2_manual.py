"""
Phase 2 -- Kich ban kiem thu thu cong.

Chay truc tiep KHONG can Docker, KHONG can DB, KHONG can RabbitMQ.
Chi can: Python + API keys trong .env

Cach chay:
    cd d:/KLTN/ATS/ai-service
    python tests/test_phase2_manual.py

Script sẽ:
1. Đọc API keys từ .env
2. Gọi LLM thật (GPT-4o-mini → Gemini fallback)
3. Chạy 6 kịch bản test
4. In kết quả chi tiết
"""

import asyncio
import io
import json
import os
import sys
import time

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env before importing app modules
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))


def print_header(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def print_pass(test_id: str, msg: str):
    print(f"  [PASS] {test_id}: {msg}")


def print_fail(test_id: str, msg: str):
    print(f"  [FAIL] {test_id}: {msg}")


def print_info(msg: str):
    print(f"  [INFO] {msg}")


# ============================================================
# Sample CV texts for testing
# ============================================================

# Test 2.1: CV tiếng Anh chuẩn
CV_ENGLISH = """
JOHN SMITH
Email: john.smith@email.com | Phone: +1-555-0123 | LinkedIn: linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Senior Software Engineer with 5+ years of experience in full-stack development.
Passionate about building scalable applications using modern technologies.

WORK EXPERIENCE

Senior Software Engineer | Google LLC | Jan 2022 - Present
- Led development of microservices architecture serving 10M+ users
- Implemented CI/CD pipelines reducing deployment time by 60%
- Technologies: Java, Spring Boot, Kubernetes, GCP

Software Engineer | Microsoft Corp | Jun 2019 - Dec 2021
- Developed REST APIs for Azure cloud platform
- Mentored 3 junior developers
- Technologies: C#, .NET Core, Azure, SQL Server

EDUCATION
Bachelor of Science in Computer Science | MIT | 2015 - 2019
GPA: 3.8/4.0

SKILLS
Java, Spring Boot, Kubernetes, Python, React, TypeScript, Docker, AWS, GCP, SQL

CERTIFICATIONS
- AWS Solutions Architect Associate | Amazon | 2023
- Google Cloud Professional Engineer | Google | 2022
"""

# Test 2.2: CV tiếng Việt
CV_VIETNAMESE = """
NGUYỄN VĂN AN
Email: nguyenvanan@gmail.com
Điện thoại: 0912 345 678
Địa chỉ: Quận 1, TP. Hồ Chí Minh

MỤC TIÊU NGHỀ NGHIỆP
Lập trình viên Full-stack với 3 năm kinh nghiệm, mong muốn phát triển sự nghiệp
trong lĩnh vực công nghệ phần mềm.

KINH NGHIỆM LÀM VIỆC

Lập trình viên Java | FPT Software | Tháng 3/2022 - Hiện tại
- Phát triển hệ thống quản lý nhân sự cho khách hàng Nhật Bản
- Sử dụng Spring Boot, Hibernate, PostgreSQL
- Tham gia code review và đào tạo thành viên mới

Thực tập sinh | Công ty ABC Tech | Tháng 6/2021 - Tháng 2/2022
- Hỗ trợ phát triển module thanh toán
- Học hỏi quy trình Agile/Scrum
- Công nghệ: Java, MySQL, Git

HỌC VẤN
Cử nhân Công nghệ Thông tin | Đại học Bách Khoa TP.HCM | 2017 - 2021
GPA: 7.8/10

KỸ NĂNG
Java, Spring Boot, PostgreSQL, MySQL, Git, Docker, ReactJS, HTML/CSS

CHỨNG CHỈ
- TOEIC 750 | 2021
"""

# Test 2.3: CV thiếu nhiều thông tin
CV_MINIMAL = """
Tran Minh
Java Developer

I know Java and Python.
Worked at some company for about 2 years.
"""

# Test 2.4: CV có layout 2 cột bị interleave (mô phỏng)
CV_TWO_COLUMN = """
SKILLS                          NGUYEN THI BINH
Java                            Software Engineer
Spring Boot                     binh.nguyen@email.com
React                           Ho Chi Minh City
Docker                          0909 888 777
Kubernetes
TypeScript                      SUMMARY
PostgreSQL                      Experienced developer with
Redis                           strong backend skills and
Git                             passion for clean code.

EXPERIENCE                      EDUCATION
Senior Dev at VNG Corp          Bachelor of IT
Mar 2021 - Present              University of Science
- Built payment gateway         2014 - 2018
- Led team of 5 devs            GPA: 8.2/10
- Microservices architecture

Junior Dev at TMA Solutions     CERTIFICATIONS
Jun 2018 - Feb 2021             AWS SAA - 2023
- Developed REST APIs           Scrum Master - 2022
- Java Spring ecosystem
"""

# Test 2.5: CV không có experience (fresh graduate)
CV_NO_EXPERIENCE = """
LE HOANG NAM
Email: lehoangnam@email.com
Phone: 0987654321

EDUCATION
Bachelor of Computer Science
Ho Chi Minh City University of Technology
2020 - 2024
GPA: 8.5/10

SKILLS
Python, JavaScript, React, Node.js, SQL, Git

PROJECTS
Personal Blog Website
- Built with Next.js and MongoDB
- Deployed on Vercel
- URL: https://myweblog.dev

Chatbot AI
- Python + OpenAI API
- NLP for Vietnamese language
"""


async def run_tests():
    """Run all manual test scenarios."""
    from app.services.cv_extraction_engine import extract_cv_from_text
    from app.core.llm_client import LLMError

    results = {"passed": 0, "failed": 0, "errors": []}

    result_english = None
    # ----------------------------------------------------------
    # Test 2.1: CV tiếng Anh chuẩn
    # ----------------------------------------------------------
    print_header("Test 2.1: CV tiếng Anh chuẩn")
    try:
        result, usage = await extract_cv_from_text(CV_ENGLISH)
        result_english = result
        cv = result.extracted_cv

        checks = [
            ("name", bool(cv.candidate.name and "john" in cv.candidate.name.lower())),
            ("email", cv.candidate.email == "john.smith@email.com"),
            ("phone", cv.candidate.phone is not None),
            ("skills ≥ 5", len(cv.skills) >= 5),
            ("experience ≥ 2", len(cv.work_experience) >= 2),
            ("education ≥ 1", len(cv.education) >= 1),
            ("certifications ≥ 1", len(cv.certifications) >= 1),
            ("claimed 5+ years", cv.years_of_experience_claimed is not None and cv.years_of_experience_claimed >= 5),
            ("calculated years", result.years_of_experience_calculated is not None),
        ]

        for label, ok in checks:
            if ok:
                print_pass("2.1", label)
                results["passed"] += 1
            else:
                print_fail("2.1", label)
                results["failed"] += 1

        print_info(f"Model: {usage.model} | Tokens: {usage.input_tokens}+{usage.output_tokens} | Cost: ${usage.estimated_cost_usd:.4f} | Latency: {usage.latency_ms}ms")
        print_info(f"Confidence: {result.overall_confidence.value} | Completeness: {result.completeness.value}")
        print_info(f"Years claimed: {cv.years_of_experience_claimed} | Years calculated: {result.years_of_experience_calculated}")

    except Exception as e:
        print_fail("2.1", f"Exception: {e}")
        results["failed"] += 1
        results["errors"].append(f"2.1: {e}")

    # ----------------------------------------------------------
    # Test 2.2: CV tiếng Việt
    # ----------------------------------------------------------
    await asyncio.sleep(2)
    print_header("Test 2.2: CV tiếng Việt")
    try:
        result, usage = await extract_cv_from_text(CV_VIETNAMESE)
        cv = result.extracted_cv

        checks = [
            ("tên Việt", bool(cv.candidate.name and "nguyễn" in cv.candidate.name.lower())),
            ("email", cv.candidate.email == "nguyenvanan@gmail.com"),
            ("phone", cv.candidate.phone is not None and "0912" in cv.candidate.phone),
            ("skills có Java", "Java" in cv.skills),
            ("experience ≥ 2", len(cv.work_experience) >= 2),
            ("FPT Software", any("FPT" in (e.company or "") for e in cv.work_experience)),
            ("Bách Khoa", any("Bách Khoa" in (e.institution or "") for e in cv.education)),
        ]

        for label, ok in checks:
            if ok:
                print_pass("2.2", label)
                results["passed"] += 1
            else:
                print_fail("2.2", label)
                results["failed"] += 1

        print_info(f"Model: {usage.model} | Cost: ${usage.estimated_cost_usd:.4f} | Latency: {usage.latency_ms}ms")
        print_info(f"Skills extracted: {cv.skills}")

    except Exception as e:
        print_fail("2.2", f"Exception: {e}")
        results["failed"] += 1
        results["errors"].append(f"2.2: {e}")

    # ----------------------------------------------------------
    # Test 2.3: CV thiếu thông tin → confidence LOW, KHÔNG bịa
    # ----------------------------------------------------------
    await asyncio.sleep(2)
    print_header("Test 2.3: CV thiếu thông tin (minimal)")
    try:
        result, usage = await extract_cv_from_text(CV_MINIMAL)
        cv = result.extracted_cv

        checks = [
            ("name extracted", cv.candidate.name is not None),
            ("email = null (KHÔNG bịa)", cv.candidate.email is None),
            ("phone = null (KHÔNG bịa)", cv.candidate.phone is None),
            ("completeness ≠ COMPLETE", result.completeness.value != "COMPLETE"),
        ]

        for label, ok in checks:
            if ok:
                print_pass("2.3", label)
                results["passed"] += 1
            else:
                print_fail("2.3", f"{label} — actual email={cv.candidate.email}, phone={cv.candidate.phone}")
                results["failed"] += 1

        print_info(f"Confidence: {result.overall_confidence.value} | Completeness: {result.completeness.value}")
        print_info(f"Completeness details: {result.completeness_details}")

    except Exception as e:
        print_fail("2.3", f"Exception: {e}")
        results["failed"] += 1
        results["errors"].append(f"2.3: {e}")

    # ----------------------------------------------------------
    # Test 2.4: CV layout 2 cột (text đan xen)
    # ----------------------------------------------------------
    await asyncio.sleep(2)
    print_header("Test 2.4: CV layout 2 cột (text đan xen)")
    try:
        result, usage = await extract_cv_from_text(CV_TWO_COLUMN)
        cv = result.extracted_cv

        checks = [
            ("name extracted", cv.candidate.name is not None),
            ("email", cv.candidate.email is not None),
            ("skills ≥ 3", len(cv.skills) >= 3),
            ("experience ≥ 1", len(cv.work_experience) >= 1),
            ("education ≥ 1", len(cv.education) >= 1),
        ]

        for label, ok in checks:
            if ok:
                print_pass("2.4", label)
                results["passed"] += 1
            else:
                print_fail("2.4", label)
                results["failed"] += 1

        print_info(f"Name: {cv.candidate.name}")
        print_info(f"Skills: {cv.skills}")
        print_info(f"Experience: {[(e.company, e.title) for e in cv.work_experience]}")

    except Exception as e:
        print_fail("2.4", f"Exception: {e}")
        results["failed"] += 1
        results["errors"].append(f"2.4: {e}")

    # ----------------------------------------------------------
    # Test 2.5: CV không có experience (fresh graduate)
    # ----------------------------------------------------------
    await asyncio.sleep(2)
    print_header("Test 2.5: CV không có experience")
    try:
        result, usage = await extract_cv_from_text(CV_NO_EXPERIENCE)
        cv = result.extracted_cv

        checks = [
            ("name", cv.candidate.name is not None),
            ("work_experience = []", len(cv.work_experience) == 0),
            ("extraction NOT failed", True),  # Should not crash
            ("projects ≥ 1", len(cv.projects) >= 1),
            ("education ≥ 1", len(cv.education) >= 1),
            ("years_calculated = None", result.years_of_experience_calculated is None),
        ]

        for label, ok in checks:
            if ok:
                print_pass("2.5", label)
                results["passed"] += 1
            else:
                print_fail("2.5", label)
                results["failed"] += 1

        print_info(f"Projects: {[p.name for p in cv.projects]}")

    except Exception as e:
        print_fail("2.5", f"Exception: {e}")
        results["failed"] += 1
        results["errors"].append(f"2.5: {e}")

    # ----------------------------------------------------------
    # Test 2.6: Pydantic schema enforcement (luôn valid)
    # ----------------------------------------------------------
    print_header("Test 2.6: Schema enforcement + bias check")
    try:
        # Re-use the result from Test 2.1
        if result_english is not None:
            result = result_english
        else:
            result, _ = await extract_cv_from_text(CV_ENGLISH)
        cv = result.extracted_cv

        # Verify Pydantic re-validation passes
        from app.schemas.cv_extraction import ExtractedCV
        revalidated = ExtractedCV.model_validate(cv.model_dump())

        checks = [
            ("Pydantic re-validation OK", revalidated is not None),
            ("no gender field", not hasattr(cv.candidate, "gender")),
            ("no age field", not hasattr(cv.candidate, "age")),
            ("no religion field", not hasattr(cv.candidate, "religion")),
            ("field_confidences present", len(cv.field_confidences) > 0),
            ("evidence in confidences", any(fc.evidence is not None for fc in cv.field_confidences)),
        ]

        for label, ok in checks:
            if ok:
                print_pass("2.6", label)
                results["passed"] += 1
            else:
                print_fail("2.6", label)
                results["failed"] += 1

        print_info("Field confidences:")
        for fc in cv.field_confidences:
            evidence_preview = str(fc.evidence)[:60] if fc.evidence else "null"
            print_info(f"  {fc.field_name}: {fc.confidence.value} — {evidence_preview}")

    except Exception as e:
        print_fail("2.6", f"Exception: {e}")
        results["failed"] += 1
        results["errors"].append(f"2.6: {e}")

    # ----------------------------------------------------------
    # Summary
    # ----------------------------------------------------------
    print_header("KẾT QUẢ TỔNG HỢP")
    total = results["passed"] + results["failed"]
    print(f"  Passed: {results['passed']}/{total}")
    print(f"  Failed: {results['failed']}/{total}")
    if results["errors"]:
        print(f"\n  Errors:")
        for err in results["errors"]:
            print(f"    • {err}")

    return results["failed"] == 0


if __name__ == "__main__":
    print("\nPhase 2 -- Kiem thu thu cong LLM CV Extraction")
    print("=" * 70)
    print("Su dung LLM that (GPT-4o-mini -> Gemini fallback)")
    print("Dam bao .env co OPENAI_API_KEY hoac GOOGLE_API_KEY")
    print("=" * 70)

    start = time.time()
    success = asyncio.run(run_tests())
    elapsed = time.time() - start

    print(f"\nTong thoi gian: {elapsed:.1f}s")
    sys.exit(0 if success else 1)
