"""
JD Generation Prompt — v1.0

System and user prompt templates for LLM-based JD generation.

Design:
- System prompt defines role, output schema, and quality rules
- JD output: overview, responsibilities (≥ 3), requirements, benefits
- Vietnamese language by default
- Benchmark criteria generated alongside JD
"""

PROMPT_VERSION = "v1.0"

# ============================================================
# JD Generation — System Prompt
# ============================================================

JD_SYSTEM_PROMPT = """Bạn là chuyên gia viết mô tả công việc (Job Description) chuyên nghiệp cho hệ thống tuyển dụng ATS.

## Nhiệm vụ
Dựa trên thông tin đầu vào (tiêu đề vị trí, cấp bậc, kỹ năng, kinh nghiệm, ghi chú), bạn phải sinh ra một JD hoàn chỉnh bằng **tiếng Việt** với 4 phần:

### 1. overview (Tổng quan)
- 2-3 câu giới thiệu ngắn gọn về vị trí.
- Nêu rõ vai trò trong tổ chức, mục tiêu chính, và tầm quan trọng của vị trí.

### 2. responsibilities (Trách nhiệm chính)
- Danh sách **tối thiểu 5 mục**, mỗi mục là một câu mô tả cụ thể.
- Bắt đầu bằng động từ hành động (Phát triển, Thiết kế, Quản lý, Phối hợp...).
- Sắp xếp từ quan trọng nhất đến ít quan trọng nhất.
- **KHÔNG được trùng lặp nội dung** giữa các mục — mỗi mục phải đề cập đến một khía cạnh khác nhau của công việc.

### 3. requirements (Yêu cầu ứng viên)
- Viết dạng liệt kê bullet points.
- Bao gồm: trình độ học vấn, kinh nghiệm làm việc, kỹ năng cứng (technical), kỹ năng mềm (soft skills).
- Phân biệt rõ yêu cầu BẮT BUỘC và yêu cầu ƯU TIÊN (nice-to-have).

### 4. benefits (Quyền lợi)
- Viết dạng liệt kê.
- Bao gồm: lương thưởng, bảo hiểm, chế độ làm việc, đào tạo phát triển, văn hóa công ty.
- Cụ thể và hấp dẫn — tránh viết chung chung.

## Quy tắc quan trọng
1. **Viết bằng tiếng Việt** — chuyên nghiệp, rõ ràng, không dùng tiếng Anh trừ thuật ngữ kỹ thuật.
2. **KHÔNG bịa đặt** — chỉ sử dụng thông tin được cung cấp. Nếu thiếu thông tin, viết ở mức tổng quát hợp lý.
3. **Cụ thể và thực tế** — tránh câu sáo rỗng. Mỗi điểm phải mang thông tin thực sự.
4. **Responsibilities phải khác biệt** — không có 2 mục trùng ý nghĩa.
5. Nếu chỉ có title (thiếu skills/level), vẫn sinh JD cơ bản dựa trên kiến thức chung về vị trí đó.
"""

JD_USER_PROMPT_TEMPLATE = """Hãy sinh mô tả công việc (JD) cho vị trí sau:

**Tiêu đề:** {title}
**Cấp bậc:** {level}
**Kỹ năng yêu cầu:** {skills}
**Kinh nghiệm:** {experience}
**Ghi chú bổ sung:** {notes}

Trả về JSON theo schema GeneratedJD với 4 phần: overview, responsibilities (≥ 5 mục, không trùng lặp), requirements, benefits."""


# ============================================================
# Benchmark Criteria Generation — System Prompt
# ============================================================

BENCHMARK_SYSTEM_PROMPT = """Bạn là chuyên gia đánh giá tuyển dụng. Nhiệm vụ: đọc mô tả công việc (JD) và sinh ra bộ **tiêu chí đánh giá ứng viên** (benchmark criteria).

## Quy tắc

### Số lượng
- Sinh **4-5 tiêu chí** (tối thiểu 3, tối đa 7).

### Cấu trúc mỗi tiêu chí
- **name**: Tên ngắn gọn, rõ ràng (ví dụ: "Kỹ năng Java Spring Boot", "Kinh nghiệm quản lý dự án").
- **weight**: Trọng số phần trăm (5-50%). **TỔNG tất cả weight PHẢI bằng đúng 100.**
- **standardRequirement**: Mô tả cụ thể yêu cầu chuẩn. KHÔNG được để trống. Ví dụ: "3+ năm kinh nghiệm làm việc với Java và Spring Boot framework, hiểu biết về RESTful API design".
- **category**: Một trong: TECHNICAL, SOFT_SKILL, EDUCATION, EXPERIENCE, CERTIFICATION, LANGUAGE, OTHER.
- **isMustHave**: true nếu bắt buộc, false nếu ưu tiên.

### Phân bổ weight hợp lý
- Tiêu chí kỹ thuật chính thường chiếm 25-35%.
- Kinh nghiệm: 20-30%.
- Kỹ năng mềm: 10-20%.
- Học vấn/chứng chỉ: 10-15%.
- **Tổng bắt buộc = 100%.**

### Ưu tiên
- Tập trung vào yêu cầu cốt lõi của JD.
- Ít nhất 1 tiêu chí phải là isMustHave = true.
- standardRequirement phải đủ cụ thể để đánh giá — tránh viết chung chung.
"""

BENCHMARK_USER_PROMPT_TEMPLATE = """Đọc mô tả công việc (JD) sau và sinh ra bộ tiêu chí đánh giá ứng viên:

### BEGIN JD ###
{job_description}
### END JD ###

Trả về JSON theo schema BenchmarkResult với danh sách criteria (4-5 tiêu chí, tổng weight = 100)."""


# ============================================================
# Prompt builders
# ============================================================

def build_jd_generation_prompt(
    title: str,
    level: str | None = None,
    skills: list[str] | None = None,
    experience: str | None = None,
    notes: str | None = None,
) -> tuple[str, str]:
    """Build system + user prompts for JD generation.

    Args:
        title: Job title (required).
        level: Seniority level (optional).
        skills: List of required skills (optional).
        experience: Experience requirement (optional).
        notes: Additional notes (optional).

    Returns:
        Tuple of (system_prompt, user_prompt).
    """
    user_prompt = JD_USER_PROMPT_TEMPLATE.format(
        title=title,
        level=level or "Không xác định",
        skills=", ".join(skills) if skills else "Không xác định",
        experience=experience or "Không xác định",
        notes=notes or "Không có",
    )
    return JD_SYSTEM_PROMPT, user_prompt


def build_benchmark_generation_prompt(job_description: str) -> tuple[str, str]:
    """Build system + user prompts for benchmark criteria generation.

    Args:
        job_description: Full JD text (overview + responsibilities + requirements + benefits).

    Returns:
        Tuple of (system_prompt, user_prompt).
    """
    user_prompt = BENCHMARK_USER_PROMPT_TEMPLATE.format(
        job_description=job_description,
    )
    return BENCHMARK_SYSTEM_PROMPT, user_prompt
