"""
LLM Client Abstraction Layer.

Provides a unified interface for calling LLMs with structured output support:
- OpenAI GPT-4o-mini (primary) — uses Structured Outputs via .parse()
- Google Gemini (fallback) — uses google-genai SDK with response_schema

Features:
- Automatic retry with exponential backoff (2 retries, 2s/4s)
- Primary → Fallback failover
- Token usage + cost tracking
- Pydantic schema enforcement at the provider level
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, TypeVar

from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

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
    """Calculate estimated cost based on token usage."""
    costs = MODEL_COSTS.get(model, {"input": 0.15, "output": 0.60})
    return (
        input_tokens * costs["input"] / 1_000_000
        + output_tokens * costs["output"] / 1_000_000
    )


# ============================================================
# Abstract Base Client
# ============================================================

class BaseLLMClient(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
    ) -> tuple[T, LLMUsage]:
        """Generate structured output conforming to a Pydantic model.

        Args:
            system_prompt: System-level instructions.
            user_prompt: User-level content (e.g., CV text).
            response_model: Pydantic model class for schema enforcement.

        Returns:
            Tuple of (parsed Pydantic instance, usage metadata).

        Raises:
            LLMError: If the LLM call fails after retries.
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


# ============================================================
# OpenAI Client
# ============================================================

class OpenAIClient(BaseLLMClient):
    """OpenAI GPT client using Structured Outputs (.parse())."""

    def __init__(self, model: str | None = None):
        settings = get_settings()
        self._model = model or settings.primary_llm_model
        self._api_key = settings.openai_api_key
        self._client = None  # lazy init

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self._api_key)
        return self._client

    def provider_name(self) -> str:
        return "openai"

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
    ) -> tuple[T, LLMUsage]:
        client = self._get_client()
        start = time.monotonic()

        try:
            completion = await client.beta.chat.completions.parse(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format=response_model,
                temperature=0.1,
                timeout=30,
            )

            parsed = completion.choices[0].message.parsed
            if parsed is None:
                # Model refused or returned empty
                refusal = completion.choices[0].message.refusal
                raise LLMError(
                    f"OpenAI returned no parsed output. Refusal: {refusal}",
                    provider="openai",
                )

            usage = LLMUsage(
                model=self._model,
                input_tokens=completion.usage.prompt_tokens if completion.usage else 0,
                output_tokens=completion.usage.completion_tokens if completion.usage else 0,
                latency_ms=int((time.monotonic() - start) * 1000),
            )
            usage.estimated_cost_usd = _calculate_cost(
                self._model, usage.input_tokens, usage.output_tokens
            )

            return parsed, usage

        except LLMError:
            raise
        except Exception as e:
            elapsed = int((time.monotonic() - start) * 1000)
            logger.error(
                "OpenAI structured output failed: model=%s error=%s latency=%dms",
                self._model, e, elapsed,
            )
            raise LLMError(
                f"OpenAI call failed: {e}",
                provider="openai",
            ) from e


# ============================================================
# Gemini Client
# ============================================================

class GeminiClient(BaseLLMClient):
    """Google Gemini client using google-genai SDK with response_schema."""

    def __init__(self, model: str | None = None):
        settings = get_settings()
        self._model = model or settings.fallback_llm_model
        self._api_key = settings.google_api_key
        self._client = None  # lazy init

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self._api_key)
        return self._client

    def provider_name(self) -> str:
        return "gemini"

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
    ) -> tuple[T, LLMUsage]:
        client = self._get_client()
        start = time.monotonic()

        try:
            from google.genai import types

            # Gemini SDK 2.x: use client.aio for native async
            response = await client.aio.models.generate_content(
                model=self._model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=response_model,
                    temperature=0.1,
                ),
            )

            # Parse the JSON text through Pydantic for validation
            raw_json = response.text
            parsed = response_model.model_validate_json(raw_json)

            # Extract token usage
            input_tokens = 0
            output_tokens = 0
            if response.usage_metadata:
                input_tokens = response.usage_metadata.prompt_token_count or 0
                output_tokens = response.usage_metadata.candidates_token_count or 0

            usage = LLMUsage(
                model=self._model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=int((time.monotonic() - start) * 1000),
            )
            usage.estimated_cost_usd = _calculate_cost(
                self._model, usage.input_tokens, usage.output_tokens
            )

            return parsed, usage

        except LLMError:
            raise
        except Exception as e:
            elapsed = int((time.monotonic() - start) * 1000)
            logger.error(
                "Gemini structured output failed: model=%s error=%s latency=%dms",
                self._model, e, elapsed,
            )
            raise LLMError(
                f"Gemini call failed: {e}",
                provider="gemini",
            ) from e


# ============================================================
# Client factory — auto-detect provider from model name
# ============================================================

def _make_client(model_name: str) -> BaseLLMClient:
    """Create the appropriate LLM client based on model name."""
    if model_name.startswith("gemini"):
        return GeminiClient(model=model_name)
    else:
        return OpenAIClient(model=model_name)


# ============================================================
# LLM Manager — Retry + Fallback orchestration
# ============================================================

class LLMManager:
    """Orchestrates LLM calls with retry logic and primary→fallback failover.

    Usage:
        manager = get_llm_manager()
        result, usage = await manager.generate_structured(
            system_prompt="...",
            user_prompt="...",
            response_model=ExtractedCV,
        )
    """

    MAX_RETRIES = 2
    BACKOFF_SECONDS = [2, 4]  # exponential: 2s, 4s

    def __init__(
        self,
        primary: BaseLLMClient | None = None,
        fallback: BaseLLMClient | None = None,
    ):
        if primary is None or fallback is None:
            settings = get_settings()
            primary_model = settings.primary_llm_model
            fallback_model = settings.fallback_llm_model

        if primary is None:
            primary = _make_client(primary_model)
        if fallback is None:
            fallback = _make_client(fallback_model)

        self._primary = primary
        self._fallback = fallback

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
    ) -> tuple[T, LLMUsage]:
        """Try primary with retries, then fallback with retries.

        Returns:
            Tuple of (parsed result, combined usage metadata).

        Raises:
            LLMError: If both primary and fallback fail.
        """
        total_retries = 0
        primary_error_msg = ""

        # --- Try primary ---
        try:
            result, usage = await self._call_with_retries(
                self._primary, system_prompt, user_prompt, response_model
            )
            usage.retries = total_retries
            return result, usage
        except LLMError as primary_err:
            total_retries += primary_err.retries
            primary_error_msg = str(primary_err)
            logger.warning(
                "Primary LLM (%s) failed after %d retries: %s. Trying fallback...",
                self._primary.provider_name(),
                primary_err.retries,
                primary_err,
            )

        # --- Try fallback ---
        try:
            result, usage = await self._call_with_retries(
                self._fallback, system_prompt, user_prompt, response_model
            )
            usage.fallback_used = True
            usage.retries = total_retries + usage.retries
            return result, usage
        except LLMError as fallback_err:
            total_retries += fallback_err.retries
            raise LLMError(
                f"Both LLM providers failed. "
                f"Primary ({self._primary.provider_name()}): {primary_error_msg}. "
                f"Fallback ({self._fallback.provider_name()}): {fallback_err}.",
                provider="all",
                retries=total_retries,
            ) from fallback_err

    async def _call_with_retries(
        self,
        client: BaseLLMClient,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
    ) -> tuple[T, LLMUsage]:
        """Call an LLM client with retry logic."""
        last_error: Exception | None = None

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                return await client.generate_structured(
                    system_prompt, user_prompt, response_model
                )
            except LLMError as e:
                last_error = e
                if attempt < self.MAX_RETRIES:
                    wait = self.BACKOFF_SECONDS[attempt]
                    logger.info(
                        "LLM attempt %d/%d failed (%s). Retrying in %ds...",
                        attempt + 1,
                        self.MAX_RETRIES + 1,
                        client.provider_name(),
                        wait,
                    )
                    await asyncio.sleep(wait)

        raise LLMError(
            str(last_error),
            provider=client.provider_name(),
            retries=self.MAX_RETRIES,
        )


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
