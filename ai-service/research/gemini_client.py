
"""Gemini client dành riêng cho nghiên cứu SSRC."""

import logging
import time
from typing import Any, TypeVar

from pydantic import BaseModel

from app.core.config import get_settings
from app.core.llm_client import GeminiClient, LLMError, LLMUsage

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger(__name__)

_ALLOWED = {
    "$id", "$defs", "$ref", "$anchor",
    "type", "format", "title", "description",
    "enum", "items", "prefixItems",
    "minItems", "maxItems",
    "minimum", "maximum",
    "anyOf", "oneOf",
    "properties", "additionalProperties", "required",
}


def _clean_schema(value: Any) -> Any:
    if isinstance(value, list):
        return [_clean_schema(item) for item in value]

    if not isinstance(value, dict):
        return value

    cleaned = {}

    for key, entry in value.items():
        if key not in _ALLOWED:
            continue

        if key in ("properties", "$defs") and isinstance(entry, dict):
            cleaned[key] = {
                name: _clean_schema(item)
                for name, item in entry.items()
            }
        else:
            cleaned[key] = _clean_schema(entry)

    return cleaned


def research_json_schema(response_model: type[BaseModel]) -> dict:
    return _clean_schema(response_model.model_json_schema())


class ResearchGeminiClient(GeminiClient):
    """Gọi Gemini bằng JSON Schema cho module nghiên cứu."""

    async def generate_structured(
        self,
        user_prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
    ) -> tuple[T, LLMUsage]:

        from google.genai import types

        settings = get_settings()
        client = self._get_client()
        start = time.monotonic()

        try:
            response = await client.aio.models.generate_content(
                model=self._model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt or None,
                    response_mime_type="application/json",
                    response_json_schema=research_json_schema(response_model),
                    temperature=settings.llm_temperature,
                    seed=settings.llm_seed,
                ),
            )

            if not response.text:
                raise ValueError("Gemini không trả về JSON")

            parsed = response_model.model_validate_json(response.text)
            meta = response.usage_metadata

            usage = LLMUsage(
                model=self._model,
                input_tokens=(meta.prompt_token_count or 0) if meta else 0,
                output_tokens=(meta.candidates_token_count or 0) if meta else 0,
                latency_ms=int((time.monotonic() - start) * 1000),
            )

            return parsed, usage

        except Exception as exc:
            logger.error(
                "Research Gemini failed: model=%s error=%s",
                self._model,
                type(exc).__name__,
            )
            raise LLMError(
                f"Research Gemini call failed: {exc}",
                provider="gemini",
            ) from exc
