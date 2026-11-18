"""
Embedding văn bản (Gemini) cho tìm kiếm vector.

- `embed_documents`: nội dung CV/JD được lưu (task RETRIEVAL_DOCUMENT).
- `embed_query`: câu hỏi tìm kiếm (task RETRIEVAL_QUERY) — Gemini tối ưu khác nhau cho hai vai trò.
- Gemini chỉ tự chuẩn hoá vector ở 3072 chiều; ở số chiều nhỏ hơn (1024) phải chuẩn hoá L2 thủ công,
  nếu không so sánh cosine/khoảng cách sai.
- Thử lại với backoff khi Gemini quá tải; hết lần thử thì ném EmbeddingError (nơi gọi quyết định bỏ qua hay báo lỗi).
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
import time
from collections import deque
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RETRIEVAL_DOCUMENT = "RETRIEVAL_DOCUMENT"
RETRIEVAL_QUERY = "RETRIEVAL_QUERY"
SEMANTIC_SIMILARITY = "SEMANTIC_SIMILARITY"

MAX_ATTEMPTS = 3
CHARS_PER_TOKEN = 3          # ước lượng thiên về dư (tiếng Việt tốn token hơn tiếng Anh)
MAX_RETRY_WAIT_SECONDS = 90  # Gemini báo "thử lại sau Ns" (429) thì chờ đúng thế, nhưng không quá mức này
_RETRY_IN = re.compile(r"retry in ([0-9.]+)s", re.IGNORECASE)


class EmbeddingError(Exception):
    """Không tạo được embedding (lỗi API, hết hạn mức, kết quả sai số chiều...)."""


class Embedder(Protocol):
    model_name: str
    dimensions: int

    async def embed(self, texts: list[str], task_type: str) -> list[list[float]]: ...


def l2_normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0:
        return vec
    return [x / norm for x in vec]


class GeminiEmbedder:
    """Embedding qua google-genai (cùng GOOGLE_API_KEY với trích xuất/chấm điểm)."""

    def __init__(self, model: str, dimensions: int, batch_size: int, tokens_per_minute: int = 0):
        self.model_name = model
        self.dimensions = dimensions
        self._batch_size = max(1, batch_size)
        self._tokens_per_minute = max(0, tokens_per_minute)
        self._window: deque[tuple[float, int]] = deque()  # (thời điểm, số token ước lượng) trong 60 giây gần nhất
        self._client = None  # khởi tạo lười

    @staticmethod
    def _estimate_tokens(texts: list[str]) -> int:
        return sum(max(1, len(t) // CHARS_PER_TOKEN) for t in texts)

    async def _throttle(self, tokens: int) -> None:
        """Chờ cho đến khi gửi `tokens` không vượt hạn mức token/phút. Lô lớn hơn hạn mức vẫn được gửi khi cửa sổ trống."""
        if self._tokens_per_minute <= 0:
            return
        while True:
            now = time.monotonic()
            while self._window and now - self._window[0][0] >= 60:
                self._window.popleft()
            used = sum(t for _, t in self._window)
            if not self._window or used + tokens <= self._tokens_per_minute:
                self._window.append((now, tokens))
                return
            await asyncio.sleep(max(0.5, 60 - (now - self._window[0][0])))

    @staticmethod
    def _retry_wait(exc: Exception, attempt: int) -> float:
        """Thời gian chờ trước lần thử lại: theo "retry in Ns" của Gemini (429) nếu có, không thì lùy thừa 2."""
        m = _RETRY_IN.search(str(exc))
        if m:
            return min(float(m.group(1)) + 1.0, MAX_RETRY_WAIT_SECONDS)
        return float(2 ** attempt)

    def _get_client(self):
        if self._client is None:
            from google import genai
            from google.genai import types
            self._client = genai.Client(
                api_key=get_settings().google_api_key,
                http_options=types.HttpOptions(timeout=60_000),
            )
        return self._client

    async def _embed_batch(self, batch: list[str], task_type: str) -> list[list[float]]:
        from google.genai import types
        client = self._get_client()
        last: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                resp = await client.aio.models.embed_content(
                    model=self.model_name,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type, output_dimensionality=self.dimensions),
                )
                vectors = [list(e.values) for e in (resp.embeddings or [])]
                if len(vectors) != len(batch) or any(len(v) != self.dimensions for v in vectors):
                    raise EmbeddingError(
                        f"Gemini trả {len(vectors)} vector (cần {len(batch)}, {self.dimensions} chiều)")
                return [l2_normalize(v) for v in vectors]
            except EmbeddingError:
                raise
            except Exception as exc:  # noqa: BLE001 — lỗi mạng / quota / 5xx
                last = exc
                if attempt < MAX_ATTEMPTS:
                    await asyncio.sleep(self._retry_wait(exc, attempt))
        raise EmbeddingError(f"Gọi Gemini embedding thất bại sau {MAX_ATTEMPTS} lần: {last}") from last

    async def embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        if not texts:
            return []
        out: list[list[float]] = []
        # Chia lô theo số văn bản VÀ theo token (một lô không quá nửa hạn mức/phút, để còn chỗ cho lô sau).
        budget = self._tokens_per_minute // 2 if self._tokens_per_minute > 0 else 0
        batch: list[str] = []
        batch_tokens = 0
        for text in texts:
            t = self._estimate_tokens([text])
            if batch and (len(batch) >= self._batch_size or (budget and batch_tokens + t > budget)):
                await self._throttle(batch_tokens)
                out.extend(await self._embed_batch(batch, task_type))
                batch, batch_tokens = [], 0
            batch.append(text)
            batch_tokens += t
        if batch:
            await self._throttle(batch_tokens)
            out.extend(await self._embed_batch(batch, task_type))
        return out


_embedder: Embedder | None = None


def get_embedder() -> Embedder:
    global _embedder
    if _embedder is None:
        s = get_settings()
        _embedder = GeminiEmbedder(s.embedding_model, s.embedding_dimensions, s.embedding_batch_size,
                                   s.embedding_tokens_per_minute)
    return _embedder


async def embed_documents(texts: list[str], embedder: Embedder | None = None) -> list[list[float]]:
    return await (embedder or get_embedder()).embed(texts, RETRIEVAL_DOCUMENT)


async def embed_query(text: str, embedder: Embedder | None = None) -> list[float]:
    return (await (embedder or get_embedder()).embed([text], RETRIEVAL_QUERY))[0]
