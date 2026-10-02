"""
Embedding Service — Phase 4, Task 4.2.

Singleton service that loads a sentence-transformers model once at startup
and provides async embedding for CV chunks and query texts.

Model: multilingual-e5-large-instruct (1024 dims)
Prefix convention:
  - "passage: " for document chunks (stored in pgvector)
  - "query: "   for search queries (used at retrieval time)
"""

from __future__ import annotations

import asyncio
import logging
import time
from functools import partial

from app.core.config import get_settings
from app.services.chunking_service import CVChunk

logger = logging.getLogger(__name__)

# Lazy import — only loaded when load() is called
_model = None
_model_name: str = ""


def _load_model_sync(model_name: str):
    """Load sentence-transformers model (blocking — run in executor)."""
    from sentence_transformers import SentenceTransformer

    logger.info("Loading embedding model: %s ...", model_name)
    start = time.monotonic()
    model = SentenceTransformer(model_name)
    elapsed = time.monotonic() - start
    logger.info("Embedding model loaded in %.1f seconds. Dimension: %d",
                elapsed, model.get_sentence_embedding_dimension())
    return model


def _encode_sync(texts: list[str]) -> list[list[float]]:
    """Synchronous batch encode — called in executor."""
    if _model is None:
        raise RuntimeError("Embedding model not loaded. Call load() first.")
    embeddings = _model.encode(
        texts,
        batch_size=16,
        normalize_embeddings=True,  # Unit vectors for cosine similarity
        show_progress_bar=False,
    )
    return embeddings.tolist()


class EmbeddingService:
    """Singleton embedding service backed by sentence-transformers."""

    def __init__(self):
        self._loaded = False

    async def load(self) -> None:
        """Load the embedding model at application startup.

        Must be called once during FastAPI lifespan.
        Runs the heavy model loading in a thread executor to avoid blocking.
        """
        global _model, _model_name

        if self._loaded:
            logger.info("Embedding model already loaded, skipping.")
            return

        settings = get_settings()
        _model_name = settings.embedding_model

        loop = asyncio.get_event_loop()
        _model = await loop.run_in_executor(
            None, partial(_load_model_sync, _model_name)
        )
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def dimension(self) -> int:
        """Return the embedding dimension (1024 for e5-large-instruct)."""
        if _model is None:
            return 1024  # Default expected dimension
        return _model.get_sentence_embedding_dimension()

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. Returns list of float vectors.

        Texts should already include the "passage: " or "query: " prefix.
        """
        if not texts:
            return []

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(_encode_sync, texts))

    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text. Returns a float vector.

        The caller is responsible for adding the correct prefix:
        - "passage: " for document content
        - "query: "   for search queries
        """
        results = await self.embed_texts([text])
        return results[0]

    async def embed_chunks(self, chunks: list[CVChunk]) -> list[CVChunk]:
        """Embed all chunks and populate their embedding field.

        Adds the "passage: " prefix required by E5 models.
        Returns the same chunks with embeddings set.
        """
        if not chunks:
            return chunks

        # Add passage prefix for document embeddings
        texts = [f"passage: {chunk.content}" for chunk in chunks]

        start = time.monotonic()
        embeddings = await self.embed_texts(texts)
        elapsed_ms = int((time.monotonic() - start) * 1000)

        for chunk, emb in zip(chunks, embeddings):
            chunk.embedding = emb

        logger.info(
            "Embedded %d chunks in %d ms (model: %s)",
            len(chunks), elapsed_ms, _model_name,
        )
        return chunks

    async def embed_query(self, query_text: str) -> list[float]:
        """Embed a query text for retrieval.

        Automatically adds the "query: " prefix required by E5 models.
        Use this for criterion texts, search queries, etc.
        """
        return await self.embed_text(f"query: {query_text}")


# Singleton instance
embedding_service = EmbeddingService()
