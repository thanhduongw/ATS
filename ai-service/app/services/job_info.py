"""Phần tin tuyển dụng dùng để chấm: tiêu đề, kinh nghiệm yêu cầu, mô tả, yêu cầu, kỹ năng HR chọn.

Không có lương/phúc lợi vì không liên quan mức độ phù hợp. `skills` là tên kỹ năng HR chọn trong form tin
(tin chỉ lưu skillIds; tên lấy từ masterdata-service).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class JobInfo:
    title: str
    experience_required: str | None = None
    description: str | None = None
    requirements: str | None = None
    skills: list[str] = field(default_factory=list)

    @classmethod
    def from_posting(cls, posting: dict[str, Any], skill_names: list[str] | None = None) -> "JobInfo":
        return cls(
            title=(posting.get("title") or "").strip(),
            experience_required=posting.get("experienceRequired"),
            description=posting.get("description"),
            requirements=posting.get("requirements"),
            skills=[n for n in (skill_names or []) if n and n.strip()],
        )

    def as_text(self) -> str:
        parts = [f"Vị trí: {self.title}"] if self.title else []
        if self.experience_required:
            parts.append(f"Kinh nghiệm yêu cầu: {self.experience_required}")
        if self.description:
            parts.append(f"Mô tả công việc:\n{self.description.strip()}")
        if self.requirements:
            parts.append(f"Yêu cầu ứng viên:\n{self.requirements.strip()}")
        if self.skills:
            parts.append(f"Kỹ năng yêu cầu (HR chọn): {', '.join(self.skills)}")
        return "\n\n".join(parts)


def jd_content_hash(job: JobInfo) -> str:
    """sha256 của JD đã chuẩn hoá khoảng trắng: chỉ khác dấu cách/xuống dòng thì cùng mã; đổi chữ thì mã khác."""
    normalized = " ".join(job.as_text().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
