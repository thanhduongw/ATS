"""
LLM Client Abstraction Layer.

Provides a unified interface for calling LLMs with structured output support:
- Google Gemini — google-genai SDK with response_schema (sản phẩm)
- OpenAI — Structured Outputs via .parse()
- Kaggle Benchmarks (`kbench:` prefix) — SDK `kaggle_benchmarks`, chỉ dùng trên Kaggle cho benchmark

Features:
- Automatic retry with exponential backoff (2 retries, 2s/4s)
- Optional primary → fallback failover (fallback rỗng = không dự phòng)
- Token usage + cost tracking
- Pydantic schema enforcement at the provider level

Chế độ một tin nhắn: gọi `generate_structured(prompt, Model)` không kèm `system_prompt` thì toàn bộ
hướng dẫn + dữ liệu nằm trong MỘT tin nhắn user. Chấm điểm và trích xuất CV dùng chế độ này để
sản phẩm (Gemini API) và benchmark (Kaggle — không hỗ trợ system prompt) gửi đúng cùng một prompt.
"""

from __future__ import annotations

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TypeVar

from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

KBENCH_PREFIX = "kbench:"

# ============================================================
# Cost tables (USD per 1M tokens)
# ============================================================
MODEL_COSTS: dict[str, dict[str, float]] = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o-mini-2024-07-18": {"input": 0.15, "output": 0.60},
    "gemini-2.0-flash": {"input": 0.075, "output": 0.30},
    "gemini-3.5-flash": {"input": 0.10, "output": 0.40},
    "gemini-3.6-flash": {"input": 0.10, "output": 0.40},
    "gemini-3.1-flash-lite": {"input": 0.05, "output": 0.20},
    # Theo các trang tổng hợp giá (10/2026) — cần đối chiếu https://ai.google.dev/gemini-api/docs/pricing
    "gemini-3.5-flash-lite": {"input": 0.30, "output": 2.50},
}


@dataclass
class LLMUsage:
    """Token usage and cost tracking for a single LLM call."""
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    retries: int = 0
    fallback_used: bool = False


def _calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Chi phí ước tính. Model chưa có trong bảng giá → 0 (không đoán theo giá model khác)."""
    costs = MODEL_COSTS.get(model)
    if costs is None:
        return 0.0
    return (
        input_tokens * costs["input"] / 1_000_000
        + output_tokens * costs["output"] / 1_000_000
    )


# ============================================================
# Abstract Base Client
# ============================================================

class BaseLLMClient(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, model: str):
        self._model = model

    @property
    def model(self) -> str:
        return self._model

    @abstractmethod
    async def generate_structured(
        self,
        user_prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
    ) -> tuple[T, LLMUsage]:
        """Generate structured output conforming to a Pydantic model.

        Args:
            user_prompt: Nội dung tin nhắn user (ở chế độ một tin nhắn: toàn bộ prompt).
            response_model: Pydantic model class for schema enforcement.
            system_prompt: Hướng dẫn hệ thống; None = chế độ một tin nhắn.

        Returns:
            Tuple of (parsed Pydantic instance, usage metadata).

        Raises:
            LLMError: If the LLM call fails.
        """
        ...

    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name (e.g., 'openai', 'gemini')."""
        ...


class LLMError(Exception):
    """Raised when LLM call fails after all retries."""

    def __init__(self, message: str, provider: str, retries: int = 0):
        self.provider = provider
        self.retries = retries
        super().__init__(message)


def _usage(model: str, input_tokens: int, output_tokens: int, start: float) -> LLMUsage:
    return LLMUsage(
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        estimated_cost_usd=_calculate_cost(model, input_tokens, output_tokens),
        latency_ms=int((time.monotonic() - start) * 1000),
    )


# ============================================================
# OpenAI Client
# ============================================================

class OpenAIClient(BaseLLMClient):
    """OpenAI client using Structured Outputs (.parse())."""

    def __init__(self, model: str):
        super().__init__(model)
        self._client = None  # lazy init

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=get_settings().openai_api_key)
        return self._client

    def provider_name(self) -> str:
        return "openai"

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        settings = get_settings()
        client = self._get_client()
        start = time.monotonic()
        messages = [{"role": "user", "content": user_prompt}]
        if system_prompt:
            messages.insert(0, {"role": "system", "content": system_prompt})

        try:
            completion = await client.beta.chat.completions.parse(
                model=self._model,
                messages=messages,
                response_format=response_model,
                temperature=settings.llm_temperature,
                seed=settings.llm_seed,
                timeout=60,
            )
            parsed = completion.choices[0].message.parsed
            if parsed is None:
                refusal = completion.choices[0].message.refusal
                raise LLMError(f"OpenAI returned no parsed output. Refusal: {refusal}", provider="openai")
            u = completion.usage
            return parsed, _usage(self._model, u.prompt_tokens if u else 0, u.completion_tokens if u else 0, start)
        except LLMError:
            raise
        except Exception as e:
            logger.error("OpenAI structured output failed: model=%s error=%s latency=%dms",
                         self._model, e, int((time.monotonic() - start) * 1000))
            raise LLMError(f"OpenAI call failed: {e}", provider="openai") from e


# ============================================================
# Gemini Client
# ============================================================

# [GIẢI THÍCH] Gọi Google Gemini (model của sản phẩm: gemini-3.5-flash-lite).
class GeminiClient(BaseLLMClient):
    """Google Gemini client using google-genai SDK with response_schema."""

    def __init__(self, model: str):
        super().__init__(model)
        self._client = None  # lazy init

    def _get_client(self):
        if self._client is None:
            from google import genai
            from google.genai import types
            # Không có timeout thì một request kẹt khi Gemini quá tải (503) sẽ treo mãi.
            self._client = genai.Client(
                api_key=get_settings().google_api_key,
                http_options=types.HttpOptions(timeout=90_000),
            )
        return self._client

    def provider_name(self) -> str:
        return "gemini"

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        settings = get_settings()
        client = self._get_client()
        start = time.monotonic()

        try:
            from google.genai import types

            # Gửi prompt cho Gemini. Cấu hình quan trọng:
            # - response_mime_type JSON + response_schema: Gemini CHỈ được trả JSON đúng khuôn (lớp kiểm soát 1).
            # - temperature=0, seed=42 (trong config.py): giảm tính ngẫu nhiên, chấm lại ra gần như cùng kết quả.
            response = await client.aio.models.generate_content(
                model=self._model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt or None,
                    response_mime_type="application/json",
                    response_schema=response_model,
                    temperature=settings.llm_temperature,
                    seed=settings.llm_seed,
                ),
            )
            # pydantic kiểm tra lại JSON (lớp kiểm soát 2): sai kiểu / thiếu trường / level ngoài 0-4 -> lỗi -> LLMError.
            parsed = response_model.model_validate_json(response.text)
            meta = response.usage_metadata
            return parsed, _usage(
                self._model,
                (meta.prompt_token_count or 0) if meta else 0,
                (meta.candidates_token_count or 0) if meta else 0,
                start,
            )
        except LLMError:
            raise
        except Exception as e:
            logger.error("Gemini structured output failed: model=%s error=%s latency=%dms",
                         self._model, e, int((time.monotonic() - start) * 1000))
            raise LLMError(f"Gemini call failed: {e}", provider="gemini") from e


# ============================================================
# Kaggle Benchmarks Client (chỉ chạy trên Kaggle)
# ============================================================

class KbenchClient(BaseLLMClient):
    """Gọi model qua SDK `kaggle_benchmarks` (quota AI của Kaggle Benchmarks).

    - Model theo tên Kaggle, vd "google/gemini-3.5-flash-lite" (tạo bằng `make_client("kbench:google/...")`).
    - SDK không có system prompt → nếu có thì ghép vào đầu tin nhắn.
    - `llm.prompt` giữ lịch sử hội thoại → mỗi lời gọi nằm trong `kbench.chats.new()` riêng.
    - SDK đồng bộ → chạy trong thread. SDK không trả số token → usage token = 0.
    """

    def __init__(self, model: str):
        super().__init__(model)

    def provider_name(self) -> str:
        return "kbench"

    def _call(self, message: str, response_model: type[T]) -> T:
        import kaggle_benchmarks as kbench

        settings = get_settings()
        llm = kbench.llms[self._model]
        with kbench.chats.new(f"ats-{time.monotonic_ns()}"):
            out = llm.prompt(
                message,
                schema=response_model,
                temperature=settings.llm_temperature,
                seed=settings.llm_seed,
            )
        if isinstance(out, response_model):
            return out
        if isinstance(out, BaseModel):
            return response_model.model_validate(out.model_dump())
        if isinstance(out, str):
            return response_model.model_validate_json(out)
        return response_model.model_validate(out)

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        start = time.monotonic()
        message = f"{system_prompt}\n\n{user_prompt}" if system_prompt else user_prompt
        try:
            parsed = await asyncio.to_thread(self._call, message, response_model)
            return parsed, _usage(f"{KBENCH_PREFIX}{self._model}", 0, 0, start)
        except Exception as e:
            logger.error("kbench structured output failed: model=%s error=%s", self._model, e)
            raise LLMError(f"kbench call failed: {e}", provider="kbench") from e


# ============================================================
# Client factory — auto-detect provider from model name
# ============================================================

def make_client(model_name: str) -> BaseLLMClient:
    """`kbench:<vendor/model>` → Kaggle Benchmarks; `gemini*` → Gemini; còn lại → OpenAI."""
    if model_name.startswith(KBENCH_PREFIX):
        return KbenchClient(model=model_name[len(KBENCH_PREFIX):])
    if model_name.startswith("gemini"):
        return GeminiClient(model=model_name)
    return OpenAIClient(model=model_name)


# ============================================================
# LLM Manager — Retry + optional fallback
# ============================================================

# [GIẢI THÍCH] Bọc ngoài client: gọi AI, lỗi thì THỬ LẠI. Sản phẩm không cấu hình model dự phòng
# (hai model cho điểm khác thang, trộn vào sẽ so sánh sai).
class LLMManager:
    """Orchestrates LLM calls with retry logic and optional primary→fallback failover.

    Usage:
        manager = get_llm_manager()
        result, usage = await manager.generate_structured(prompt, ExtractedCV)
    """

    # Thử lại tối đa 2 lần (tổng 3 lần), chờ 2 giây rồi 4 giây giữa các lần.
    MAX_RETRIES = 2
    BACKOFF_SECONDS = [2, 4]  # exponential: 2s, 4s

    def __init__(
        self,
        primary: BaseLLMClient | None = None,
        fallback: BaseLLMClient | None = None,
        use_fallback: bool = True,
    ):
        """
        Args:
            primary / fallback: client tự tạo; None thì lấy theo cấu hình.
            use_fallback: False để chỉ dùng đúng một model (benchmark cần vậy, nếu không kết quả bị
                trộn giữa hai model mà không ai biết).
        """
        settings = get_settings()
        self._primary = primary or make_client(settings.primary_llm_model)
        if not use_fallback:
            self._fallback = None
        elif fallback is not None:
            self._fallback = fallback
        else:
            self._fallback = make_client(settings.fallback_llm_model) if settings.fallback_llm_model else None

    @property
    def primary_model(self) -> str:
        return self._primary.model

    async def generate_structured(
        self,
        user_prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
    ) -> tuple[T, LLMUsage]:
        """Try primary with retries, then fallback (if configured) with retries.

        Raises:
            LLMError: If every configured provider fails.
        """
        try:
            return await self._call_with_retries(self._primary, user_prompt, response_model, system_prompt)
        except LLMError as primary_err:
            if self._fallback is None:
                raise
            logger.warning("Primary LLM (%s) failed after %d retries: %s. Trying fallback...",
                           self._primary.model, primary_err.retries, primary_err)
            try:
                result, usage = await self._call_with_retries(
                    self._fallback, user_prompt, response_model, system_prompt)
            except LLMError as fallback_err:
                raise LLMError(
                    f"Both LLM providers failed. Primary ({self._primary.model}): {primary_err}. "
                    f"Fallback ({self._fallback.model}): {fallback_err}.",
                    provider="all",
                    retries=primary_err.retries + fallback_err.retries,
                ) from fallback_err
            usage.fallback_used = True
            usage.retries += primary_err.retries
            return result, usage

    async def _call_with_retries(
        self,
        client: BaseLLMClient,
        user_prompt: str,
        response_model: type[T],
        system_prompt: str | None,
    ) -> tuple[T, LLMUsage]:
        """Call an LLM client with retry logic."""
        last_error: Exception | None = None

        # Vòng thử: thành công thì trả về ngay; lỗi thì chờ rồi thử lại; hết lượt thì ném LLMError.
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                result, usage = await client.generate_structured(user_prompt, response_model, system_prompt)
                usage.retries = attempt
                return result, usage
            except LLMError as e:
                last_error = e
                if attempt < self.MAX_RETRIES:
                    wait = self.BACKOFF_SECONDS[attempt]
                    logger.info("LLM attempt %d/%d failed (%s). Retrying in %ds...",
                                attempt + 1, self.MAX_RETRIES + 1, client.model, wait)
                    await asyncio.sleep(wait)

        raise LLMError(str(last_error), provider=client.provider_name(), retries=self.MAX_RETRIES)


# ============================================================
# Singleton
# ============================================================

_llm_manager: LLMManager | None = None


def get_llm_manager() -> LLMManager:
    """Get or create the LLMManager singleton."""
    global _llm_manager
    if _llm_manager is None:
        _llm_manager = LLMManager()
    return _llm_manager
