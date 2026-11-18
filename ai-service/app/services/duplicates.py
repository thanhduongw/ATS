"""
Phát hiện ứng viên trùng (cùng một người có nhiều hồ sơ ứng viên).

Vector KHÔNG đủ để kết luận trùng: đo trên 46 CV thật, hai người khác nhau vẫn có độ tương đồng cả hồ sơ tới 0,96
(trung vị 0,89) vì CV cùng ngành đều giống nhau. Nên dùng nhiều tín hiệu, xếp từ chắc nhất:

1. SAME_FILE    cùng file CV (sha256) ở hai ứng viên                       → chắc chắn (HIGH)
2. SAME_EMAIL   cùng email ghi trong CV (đã chuẩn hoá)                     → HIGH
3. SAME_PHONE   cùng số điện thoại ghi trong CV (đã chuẩn hoá +84/0, bỏ ký tự phân cách) → HIGH
4. SIMILAR_PROFILE  tên gần như trùng VÀ cả hồ sơ rất giống                → MEDIUM (cần người xem)

Email/SĐT lưu dạng băm sha256 (chỉ cần so sánh bằng); tên lưu dạng chuẩn hoá để so gần đúng.
Hệ thống chỉ GẮN CỜ và để HR xác nhận / bỏ qua. Không tự động gộp hồ sơ (gộp kéo theo hồ sơ ứng tuyển, phỏng vấn,
offer ở nhiều service).
"""

from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CandidateSearchProfile, DuplicateCandidate

logger = logging.getLogger(__name__)

SAME_FILE = "SAME_FILE"
SAME_EMAIL = "SAME_EMAIL"
SAME_PHONE = "SAME_PHONE"
SIMILAR_PROFILE = "SIMILAR_PROFILE"

PENDING = "PENDING"
DISMISSED = "DISMISSED"
CONFIRMED = "CONFIRMED"

# Hai điều kiện đều phải đạt mới gắn SIMILAR_PROFILE. Giá trị khởi đầu thận trọng (ít báo nhầm hơn là bỏ sót,
# vì đã có 3 tín hiệu chắc chắn kia); cần hiệu chỉnh khi có dữ liệu trùng thật.
NAME_THRESHOLD = 0.92
PROFILE_THRESHOLD = 0.90
MAX_VECTOR_NEIGHBORS = 10
MIN_PHONE_DIGITS = 9


# --- Chuẩn hoá -----------------------------------------------------------------------------

def normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    e = email.strip().lower()
    return e if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e) else None


def normalize_phone(phone: str | None) -> str | None:
    """Chỉ giữ chữ số; đầu số quốc gia 84 → 0 ('+84 337 605 695' và '0337605695' là một số)."""
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("84") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits if len(digits) >= MIN_PHONE_DIGITS else None


def normalize_name(name: str | None) -> str | None:
    """Chữ thường, bỏ dấu tiếng Việt (đ→d), bỏ ký tự lạ, gom khoảng trắng."""
    if not name:
        return None
    s = unicodedata.normalize("NFD", name.replace("đ", "d").replace("Đ", "D"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^a-z\s]", " ", s.lower())
    s = " ".join(s.split())
    return s or None


def hash_value(normalized: str | None) -> str | None:
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest() if normalized else None


def identity_hashes(raw: dict) -> dict:
    """{name, email, phone} thô → {name_norm, email_hash, phone_hash} (không giữ giá trị thô)."""
    return {
        "name_norm": normalize_name(raw.get("name")),
        "email_hash": hash_value(normalize_email(raw.get("email"))),
        "phone_hash": hash_value(normalize_phone(raw.get("phone"))),
    }


def name_similarity(a: str | None, b: str | None) -> float:
    """Độ giống của hai tên đã chuẩn hoá, không phụ thuộc thứ tự từ ('Nguyen Van A' ~ 'A Nguyen Van')."""
    if not a or not b:
        return 0.0
    sa, sb = " ".join(sorted(a.split())), " ".join(sorted(b.split()))
    return SequenceMatcher(None, sa, sb).ratio()


# --- Phát hiện -----------------------------------------------------------------------------

@dataclass
class DuplicateMatch:
    other_id: int
    signals: list[str]
    score: float


async def find_duplicates(session: AsyncSession, candidate_id: int) -> list[DuplicateMatch]:
    """Các ứng viên khác có khả năng là cùng người với `candidate_id` (đã có hồ sơ tìm kiếm)."""
    me = await session.get(CandidateSearchProfile, candidate_id)
    if me is None:
        return []

    matches: dict[int, DuplicateMatch] = {}

    def add(other: int, signal: str, score: float) -> None:
        m = matches.setdefault(other, DuplicateMatch(other, [], 0.0))
        if signal not in m.signals:
            m.signals.append(signal)
        m.score = max(m.score, score)

    # Tín hiệu chắc chắn: so bằng.
    conds = [CandidateSearchProfile.latest_file_hash == me.latest_file_hash]
    if me.email_hash:
        conds.append(CandidateSearchProfile.email_hash == me.email_hash)
    if me.phone_hash:
        conds.append(CandidateSearchProfile.phone_hash == me.phone_hash)
    rows = (await session.execute(
        select(CandidateSearchProfile).where(CandidateSearchProfile.candidate_id != candidate_id, or_(*conds))
    )).scalars().all()
    for o in rows:
        if o.latest_file_hash == me.latest_file_hash:
            add(o.candidate_id, SAME_FILE, 1.0)
        if me.email_hash and o.email_hash == me.email_hash:
            add(o.candidate_id, SAME_EMAIL, 0.98)
        if me.phone_hash and o.phone_hash == me.phone_hash:
            add(o.candidate_id, SAME_PHONE, 0.95)

    # Tín hiệu phụ: tên gần như trùng + cả hồ sơ rất giống.
    if me.name_norm and me.doc_embedding is not None:
        dist = CandidateSearchProfile.doc_embedding.cosine_distance(list(me.doc_embedding))
        near = (await session.execute(
            select(CandidateSearchProfile.candidate_id, CandidateSearchProfile.name_norm, dist.label("dist"))
            .where(CandidateSearchProfile.candidate_id != candidate_id,
                   CandidateSearchProfile.doc_embedding.is_not(None))
            .order_by(dist).limit(MAX_VECTOR_NEIGHBORS)
        )).all()
        for r in near:
            sim = 1.0 - float(r.dist)
            if sim >= PROFILE_THRESHOLD and name_similarity(me.name_norm, r.name_norm) >= NAME_THRESHOLD:
                add(r.candidate_id, SIMILAR_PROFILE, sim)

    return sorted(matches.values(), key=lambda m: m.score, reverse=True)


def is_high_confidence(signals: list[str]) -> bool:
    return any(s in (SAME_FILE, SAME_EMAIL, SAME_PHONE) for s in signals)


async def record_duplicates(session: AsyncSession, candidate_id: int, matches: list[DuplicateMatch]) -> int:
    """Ghi các cặp nghi trùng. Cặp đã có thì cập nhật tín hiệu/điểm nhưng GIỮ quyết định của HR (status)."""
    for m in matches:
        a, b = sorted((candidate_id, m.other_id))
        values = {"candidate_a": a, "candidate_b": b, "score": round(m.score, 4), "signals": m.signals,
                  "status": PENDING}
        stmt = insert(DuplicateCandidate).values(**values)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_duplicate_pair", set_={"score": stmt.excluded.score, "signals": stmt.excluded.signals})
        await session.execute(stmt)
    await session.commit()
    return len(matches)
