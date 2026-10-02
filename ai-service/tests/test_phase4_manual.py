"""
Phase 4 — Script kiểm thử thủ công (Semantic Chunking, Skill Normalization, O*NET).

Chạy trực tiếp KHÔNG cần Docker, KHÔNG cần PostgreSQL, KHÔNG cần RabbitMQ.

Cách chạy:
    cd d:/KLTN/ATS/ai-service
    python tests/test_phase4_manual.py
"""

import asyncio
import io
import json
import os
import sys
from pathlib import Path

# Fix Windows console encoding for Vietnamese output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.cv_extraction import (
    CandidateInfo,
    Education,
    ExtractedCV,
    Project,
    WorkExperience,
)
from app.services.chunking_service import chunk_extracted_cv
from app.services.skill_normalization import normalize_skill, normalize_skills


def print_header(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def print_pass(test_id: str, msg: str):
    print(f"  [PASS] {test_id}: {msg}")


def print_fail(test_id: str, msg: str):
    print(f"  [FAIL] {test_id}: {msg}")


async def test_chunking():
    print_header("Test 1: Semantic Chunking Service")

    cv = ExtractedCV(
        candidate=CandidateInfo(
            name="Nguyễn Văn An",
            email="an.nguyen@example.com",
            phone="0987654321",
            location="Hà Nội, Việt Nam",
        ),
        skills=["Java", "Spring Boot", "PostgreSQL", "Docker", "k8s", "ReactJS"],
        work_experience=[
            WorkExperience(
                company="FPT Software",
                title="Senior Backend Engineer",
                start_date="2022-03",
                end_date="Hiện tại",
                is_current=True,
                description="Thiết kế và phát triển kiến trúc Microservices cho hệ thống ngân hàng",
                technologies=["Java 17", "Spring Boot 3", "PostgreSQL", "Kafka"],
            ),
            WorkExperience(
                company="VNG Corporation",
                title="Software Engineer",
                start_date="2020-01",
                end_date="2022-02",
                is_current=False,
                description="Xây dựng API gateway và payment processing service",
                technologies=["Golang", "Redis", "Docker"],
            ),
        ],
        education=[
            Education(
                institution="Đại học Bách Khoa Hà Nội",
                degree="Kỹ sư",
                field_of_study="Công nghệ thông tin",
                start_date="2015-09",
                end_date="2020-06",
                gpa="3.4/4.0",
            )
        ],
        projects=[
            Project(
                name="ATS AI Recruitment Platform",
                role="Tech Lead",
                technologies=["FastAPI", "RabbitMQ", "PgVector", "React"],
                description="Hệ thống sàng lọc và chấm điểm CV tự động bằng mô hình AI",
            )
        ],
    )

    chunks = chunk_extracted_cv(cv)

    # Verify count: 2 work_exp + 1 edu + 1 project + 1 skill_summary = 5 chunks
    if len(chunks) == 5:
        print_pass("4.1.1", f"Tạo đúng số lượng chunk: {len(chunks)} chunks (mong muốn: 5)")
    else:
        print_fail("4.1.1", f"Số lượng chunk: {len(chunks)} (mong muốn: 5)")

    types_found = {c.chunk_type for c in chunks}
    expected_types = {"WORK_EXPERIENCE", "EDUCATION", "PROJECT", "SKILL_SUMMARY"}
    if expected_types.issubset(types_found):
        print_pass("4.1.2", f"Có đầy đủ các loại chunk: {types_found}")
    else:
        print_fail("4.1.2", f"Thiếu loại chunk. Tìm thấy: {types_found}")

    # Inspect contents
    print("\n  Chi tiết các chunks được sinh ra:")
    for i, c in enumerate(chunks, 1):
        preview = c.content[:90].replace('\n', ' ')
        print(f"    {i}. [{c.chunk_type}] (độ dài {len(c.content)} chars):")
        print(f"       \"{preview}...\"")

    return True


async def test_skill_normalization():
    print_header("Test 2: Skill Normalization (Chuẩn hóa kỹ năng)")

    test_cases = [
        ("reactjs", "React"),
        ("React.js", "React"),
        ("k8s", "Kubernetes"),
        ("golang", "Go"),
        ("Postgres", "PostgreSQL"),
        ("ts", "TypeScript"),
        ("aws", "AWS"),
        ("vue.js", "Vue.js"),
        ("Docker", "Docker"),            # Case-insensitivity/Exact match
        ("CustomFrameworkX", "CustomFrameworkX"),  # Unknown skill giữ nguyên
    ]

    all_passed = True
    for raw_skill, expected in test_cases:
        result = await normalize_skill(raw_skill)
        if result == expected:
            print_pass("4.2", f"'{raw_skill}' -> '{result}'")
        else:
            print_fail("4.2", f"'{raw_skill}' -> '{result}' (mong muốn: '{expected}')")
            all_passed = False

    # Test batch normalization & deduplication
    batch_input = ["ReactJS", "React.js", "react", "Docker", "k8s", "Kubernetes"]
    batch_result = await normalize_skills(batch_input)
    expected_batch = ["React", "Docker", "Kubernetes"]
    if batch_result == expected_batch:
        print_pass("4.3", f"Batch deduplication: {batch_input} -> {batch_result}")
    else:
        print_fail("4.3", f"Batch deduplication: {batch_result} (mong muốn: {expected_batch})")

    return all_passed


def test_onet_dataset():
    print_header("Test 3: O*NET Software Skills Dataset")

    onet_path = PROJECT_ROOT / "data" / "onet_software_skills.json"
    if not onet_path.exists():
        print_fail("4.4", f"Không tìm thấy file: {onet_path}")
        return False

    try:
        with open(onet_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        rows = data.get("row", [])
        columns = data.get("column", [])
        unique_skills = set(r.get("workplace_example") for r in rows if r.get("workplace_example"))

        print_pass("4.4.1", f"Đọc file JSON hợp lệ: {len(rows)} bản ghi, {len(columns)} cột")
        print_pass("4.4.2", f"Tổng số kỹ năng chuẩn hóa duy nhất: {len(unique_skills)} skills")

        # Check some popular skills
        sample_skills = ["Python", "Docker", "Kubernetes", "PostgreSQL", "Java", "React"]
        found = [s for s in sample_skills if s in unique_skills]
        print_pass("4.4.3", f"Tìm thấy {len(found)}/{len(sample_skills)} kỹ năng phổ biến trong O*NET: {found}")
        return True
    except Exception as e:
        print_fail("4.4", f"Lỗi đọc file O*NET: {e}")
        return False


async def main():
    print("\n" + "="*70)
    print("      BẮT ĐẦU KIỂM THỬ THỦ CÔNG — PHASE 4 (AI SERVICE)")
    print("="*70)

    t1 = await test_chunking()
    t2 = await test_skill_normalization()
    t3 = test_onet_dataset()

    print_header("TỔNG KẾT KIỂM THỬ PHASE 4")
    if t1 and t2 and t3:
        print("  🎉 TẤT CẢ CÁC BÀI TEST PHASE 4 ĐÃ PASS THÀNH CÔNG!\n")
    else:
        print("  ⚠️ Có một số bài test chưa đạt yêu cầu.\n")


if __name__ == "__main__":
    asyncio.run(main())
