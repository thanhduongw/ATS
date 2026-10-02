"""
Scoring Prompt — v1.0

System and user prompt templates for RAG-based criterion scoring.

Design:
- Blind scoring: NO candidate name, email, gender, age in the prompt
- Evidence must be exact quotes from the provided CV chunks
- One prompt call per criterion (fine-grained evaluation)
- Vietnamese language support for evidence and gap analysis
"""

PROMPT_VERSION = "v1.0"

SYSTEM_PROMPT = """Bạn là hệ thống chấm điểm ứng viên KHÁCH QUAN cho hệ thống quản lý tuyển dụng (ATS).

## Nhiệm vụ
Đánh giá MỘT tiêu chí tuyển dụng dựa trên các đoạn trích từ CV ứng viên.

## Quy tắc BẮT BUỘC

### 1. KHÁCH QUAN — Blind Scoring
- KHÔNG đề cập đến tên, email, giới tính, tuổi, hoặc bất kỳ thông tin nhận dạng nào của ứng viên.
- Chỉ đánh giá dựa trên NỘI DUNG NĂNG LỰC trong các đoạn CV được cung cấp.

### 2. TRÍCH DẪN CHÍNH XÁC — Không Bịa Evidence
- Trường `evidence` PHẢI là đoạn trích NGUYÊN VĂN từ các đoạn CV ở trên.
- KHÔNG được tự bịa ra thông tin không có trong CV.
- Nếu không tìm thấy thông tin liên quan, ghi: "Không tìm thấy thông tin liên quan trong CV"

### 3. CHẤM ĐIỂM NHẤT QUÁN
- 90-100: Vượt trội so với yêu cầu
- 70-89: Đáp ứng tốt yêu cầu (PASS)
- 40-69: Đáp ứng một phần (PARTIAL)
- 0-39: Không đáp ứng hoặc không có thông tin (FAIL)

### 4. NGÔN NGỮ
- Viết `evidence`, `gap_analysis`, `reasoning` bằng tiếng Việt.
- Nếu CV bằng tiếng Anh, vẫn trích dẫn nguyên văn tiếng Anh trong `evidence`.

Trả về JSON đúng schema đã định nghĩa."""


def build_scoring_prompt(
    criterion_name: str,
    standard_requirement: str,
    chunks: list[dict],
) -> tuple[str, str]:
    """Build system + user prompt for scoring a single criterion.

    Args:
        criterion_name: Name of the benchmark criterion.
        standard_requirement: Detailed requirement description.
        chunks: List of dicts with keys 'chunk_type' and 'content'.

    Returns:
        Tuple of (system_prompt, user_prompt).
    """
    # Format CV chunks into numbered list
    chunk_lines = []
    for i, chunk in enumerate(chunks, 1):
        chunk_type = chunk.get("chunk_type", "UNKNOWN")
        content = chunk.get("content", "").strip()
        chunk_lines.append(f"  [{i}] [{chunk_type}] {content}")

    chunks_text = "\n".join(chunk_lines) if chunk_lines else "  (Không có đoạn CV nào liên quan)"

    user_prompt = f"""## TIÊU CHÍ CẦN ĐÁNH GIÁ

**Tên tiêu chí:** {criterion_name}
**Yêu cầu chuẩn:** {standard_requirement}

## CÁC ĐOẠN TRÍCH TỪ CV ỨNG VIÊN (đã được truy xuất tự động)

{chunks_text}

---
Hãy đánh giá ứng viên theo tiêu chí trên và trả về JSON đúng schema."""

    return SYSTEM_PROMPT, user_prompt


SUMMARY_SYSTEM_PROMPT = """Bạn là trợ lý viết tóm tắt cho hệ thống tuyển dụng ATS.
Viết tóm tắt ngắn gọn (2-3 câu) bằng tiếng Việt về mức độ phù hợp của ứng viên.
KHÔNG đề cập tên ứng viên. Chỉ nói về năng lực và mức độ đáp ứng yêu cầu."""


def build_summary_prompt(
    criteria_results: list[dict],
    classification: str,
    total_score: float,
) -> tuple[str, str]:
    """Build prompt for generating a Vietnamese summary of the scoring result.

    Args:
        criteria_results: List of dicts with 'name', 'status', 'gap_analysis'.
        classification: MATCH / REVIEW / NOT_MATCH.
        total_score: Weighted total score (0-100).

    Returns:
        Tuple of (system_prompt, user_prompt).
    """
    lines = []
    for cr in criteria_results:
        lines.append(
            f"- {cr['name']}: {cr['status']} — {cr['gap_analysis']}"
        )
    criteria_text = "\n".join(lines)

    user_prompt = f"""## KẾT QUẢ CHẤM ĐIỂM

Tổng điểm: {total_score:.1f}/100
Phân loại: {classification}

Chi tiết các tiêu chí:
{criteria_text}

Hãy viết tóm tắt 2-3 câu bằng tiếng Việt về mức độ phù hợp của ứng viên này.
KHÔNG đề cập tên ứng viên."""

    return SUMMARY_SYSTEM_PROMPT, user_prompt
