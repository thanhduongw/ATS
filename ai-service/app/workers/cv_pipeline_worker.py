"""
CV Pipeline Worker — Phase 4 + Phase 5.

RabbitMQ consumer that listens on the cv.uploaded queue and triggers
the full CV processing pipeline: text extraction → LLM extraction →
skill normalization → chunking → embedding → pgvector storage →
benchmark fetch → hard filtering → RAG scoring → aggregation →
scorecard save → event publish.

Consumed event (from application-service):
{
    "applicationId": 123,
    "candidateId": 45,
    "jobPostingId": 10,
    "cvFileUrl": "http://minio:9000/ats-bucket/candidates/45/cv.pdf"
}
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime

import aio_pika
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.rabbitmq import (
    AI_SCORING_COMPLETED_ROUTING_KEY,
    CV_UPLOADED_QUEUE,
    rabbitmq_manager,
)
from app.models import AIJob
from app.schemas.jd_generation import BenchmarkCriterion
from app.schemas.scoring import Scorecard
from app.services.chunking_service import chunk_extracted_cv
from app.services.cv_extraction_engine import extract_cv_from_storage_key
from app.services.embedding_service import embedding_service
from app.services.hard_filter_engine import run_hard_filters
from app.services.recruitment_client import fetch_benchmark_criteria
from app.services.score_aggregator import aggregate_scores
from app.services.scoring_engine import score_application
from app.services.skill_normalization import normalize_skills
from app.services import chunk_repository
from app.services.prompts.scoring import PROMPT_VERSION as SCORING_PROMPT_VERSION

logger = logging.getLogger(__name__)


async def _process_cv_event(message_body: dict) -> None:
    """Process a single CV uploaded event through the full pipeline.

    Stages:
    1. Text extraction (Phase 1 — pdf/docx → raw text)
    2. LLM CV extraction (Phase 2 — raw text → structured ExtractedCV)
    3. Skill normalization (Phase 4 bridge — raw skill strings → canonical)
    4. Semantic chunking (Phase 4, Task 4.1 — ExtractedCV → CVChunk list)
    5. Batch embedding (Phase 4, Task 4.2 — CVChunk → 1024-dim vectors)
    6. Save chunks to pgvector (Phase 4, Task 4.3 — vectors → cv_document_chunks)
    7. Fetch benchmark criteria from job_posting (Phase 5)
    8. Hard filtering — rule-based must-have checks (Phase 5)
    9. RAG Scoring per criterion — LLM + evidence (Phase 5)
    10. Score aggregation + classification (Phase 5)
    11. Build Scorecard (Phase 5)
    12. Save Scorecard to DB (Phase 5)
    13. Publish ai.scoring.completed event (Phase 5)
    """
    application_id = message_body.get("applicationId")
    candidate_id = message_body.get("candidateId")
    job_posting_id = message_body.get("jobPostingId")
    cv_file_url = message_body.get("cvFileUrl", "")
    is_rescore = message_body.get("isRescore", False)

    # cvFileUrl can be empty for rescore (existing chunks are reused)
    if not all([application_id, candidate_id]) or (not cv_file_url and not is_rescore):
        logger.error("Invalid cv.uploaded event — missing required fields: %s", message_body)
        return

    logger.info(
        "Processing CV pipeline: application_id=%s, candidate_id=%s, file=%s",
        application_id, candidate_id, cv_file_url,
    )

    start = time.monotonic()

    async with async_session_factory() as session:
        try:
            # --- Idempotency check ---
            existing = await session.execute(
                select(AIJob).where(
                    AIJob.application_id == application_id,
                    AIJob.status == "COMPLETED",
                )
            )
            if existing.scalar_one_or_none():
                logger.info(
                    "AIJob already COMPLETED for application_id=%s — skipping",
                    application_id,
                )
                return

            # --- Create AIJob record ---
            ai_job = AIJob(
                application_id=application_id,
                candidate_id=candidate_id,
                job_posting_id=job_posting_id or 0,
                status="PROCESSING",
                current_stage="TEXT_EXTRACTION",
                started_at=datetime.utcnow(),
            )
            session.add(ai_job)
            await session.flush()

            chunks = []
            if is_rescore:
                # --- Rescore mode: skip extraction/chunking, reuse existing chunks ---
                # Existing cv_document_chunks are preserved in DB from the original run.
                # Scoring engine queries chunks via vector search, so no reload needed.
                ai_job.current_stage = "RESCORE_SKIP_EXTRACTION"
                extracted_cv = None  # Not needed; scoring uses chunks from DB
                logger.info(
                    "Rescore mode — skipping extraction & chunking stages for app=%s "
                    "(reusing existing chunks)",
                    application_id,
                )
            else:
                # --- Stage 1+2: Text extraction + LLM CV extraction (Phase 1+2 combined) ---
                ai_job.current_stage = "CV_EXTRACTION"
                extraction_result = await extract_cv_from_storage_key(cv_file_url)

                if extraction_result.status != "success" or not extraction_result.result:
                    ai_job.status = "FAILED"
                    ai_job.error_message = (
                        f"CV extraction failed: {extraction_result.error_code} — "
                        f"{extraction_result.error_message}"
                    )
                    ai_job.completed_at = datetime.utcnow()
                    await session.commit()
                    logger.error("Stage 1+2 failed for app=%s: %s", application_id, ai_job.error_message)
                    return

                extracted_cv = extraction_result.result.extracted_cv
                ai_job.extraction_model = extraction_result.provenance.model_used
                ai_job.extraction_prompt_version = extraction_result.provenance.prompt_version
                ai_job.extraction_confidence = (
                    {"HIGH": 0.90, "MEDIUM": 0.70, "LOW": 0.40}
                    .get(extraction_result.result.overall_confidence.value, 0.50)
                )
                ai_job.total_input_tokens = extraction_result.provenance.input_tokens
                ai_job.total_output_tokens = extraction_result.provenance.output_tokens
                ai_job.estimated_cost_usd = extraction_result.provenance.estimated_cost_usd

                # --- Stage 3: Skill normalization (Phase 4) ---
                ai_job.current_stage = "SKILL_NORMALIZATION"
                if extracted_cv.skills:
                    extracted_cv.skills = await normalize_skills(extracted_cv.skills)
                    logger.info("Skills normalized for app=%s: %s", application_id, extracted_cv.skills)

                # --- Stage 4: Semantic chunking (Phase 4) ---
                ai_job.current_stage = "CHUNKING"
                chunks = chunk_extracted_cv(extracted_cv)

                if not chunks:
                    ai_job.status = "FAILED"
                    ai_job.error_message = "Chunking produced 0 chunks"
                    ai_job.completed_at = datetime.utcnow()
                    await session.commit()
                    logger.error("Stage 4 failed: 0 chunks for app=%s", application_id)
                    return

                # --- Stage 5: Batch embedding (Phase 4) ---
                ai_job.current_stage = "EMBEDDING"
                chunks = await embedding_service.embed_chunks(chunks)

                # --- Stage 6: Save chunks to pgvector (Phase 4) ---
                ai_job.current_stage = "SAVING_CHUNKS"
                await chunk_repository.save_chunks(
                    session=session,
                    application_id=application_id,
                    candidate_id=candidate_id,
                    chunks=chunks,
                )

            # =============================================================
            # Phase 5: Scoring Pipeline (Stage 7-13)
            # =============================================================

            # --- Stage 7: Fetch benchmark criteria from ats_recruitment DB ---
            ai_job.current_stage = "FETCHING_CRITERIA"
            await session.flush()

            # Uses a dedicated read-only engine pointing to ats_recruitment
            # (different DB from this session's ats_ai)
            criteria: list[BenchmarkCriterion] = await fetch_benchmark_criteria(
                job_posting_id or 0
            )

            if not criteria:
                # No benchmark criteria → extraction-only pipeline
                elapsed_ms = int((time.monotonic() - start) * 1000)
                ai_job.status = "PENDING_BENCHMARK"
                ai_job.current_stage = "PENDING_BENCHMARK"
                ai_job.total_latency_ms = elapsed_ms
                ai_job.completed_at = datetime.utcnow()
                await session.commit()
                logger.info(
                    "CV pipeline completed (extraction-only) for app=%s in %d ms "
                    "— no benchmark criteria available",
                    application_id, elapsed_ms,
                )
                return

            # --- Stage 8: Hard filtering (rule-based, no AI) ---
            ai_job.current_stage = "HARD_FILTERING"
            await session.flush()
            if extracted_cv is not None:
                hard_filter_flags = run_hard_filters(extracted_cv, criteria)
                logger.info(
                    "Hard filter results for app=%s: %d flags, %d failed",
                    application_id, len(hard_filter_flags),
                    sum(1 for f in hard_filter_flags if not f.passed),
                )
            else:
                # Rescore mode — skip hard filter (CV already extracted previously)
                hard_filter_flags = []
                logger.info(
                    "Rescore mode — skipping hard filter for app=%s", application_id
                )

            # --- Stage 9: RAG Scoring per criterion (LLM) ---
            ai_job.current_stage = "SCORING"
            await session.flush()
            scoring_result = await score_application(
                session=session,
                application_id=application_id,
                job_posting_id=job_posting_id,
                extracted_cv=extracted_cv,
                criteria=criteria,
            )

            # Update AI job with scoring model info
            ai_job.scoring_model = scoring_result.total_usage.model
            ai_job.scoring_prompt_version = SCORING_PROMPT_VERSION
            ai_job.total_input_tokens = (
                (ai_job.total_input_tokens or 0)
                + scoring_result.total_usage.input_tokens
            )
            ai_job.total_output_tokens = (
                (ai_job.total_output_tokens or 0)
                + scoring_result.total_usage.output_tokens
            )
            ai_job.estimated_cost_usd = (
                float(ai_job.estimated_cost_usd or 0)
                + scoring_result.total_usage.estimated_cost_usd
            )

            # --- Stage 10: Score aggregation + classification ---
            ai_job.current_stage = "AGGREGATING"
            await session.flush()
            total_score, classification, summary = await aggregate_scores(
                scoring_result.criteria_scores,
                hard_filter_flags,
            )

            # --- Stage 11: Build Scorecard ---
            ai_job.current_stage = "BUILDING_SCORECARD"
            scorecard = Scorecard(
                applicationId=application_id,
                jobPostingId=job_posting_id,
                totalScore=total_score,
                classification=classification,
                summary=summary,
                hardFilterFlags=hard_filter_flags,
                criteriaScores=scoring_result.criteria_scores,
                scoredAt=datetime.utcnow(),
                scoringModel=scoring_result.total_usage.model or "unknown",
                promptVersion=SCORING_PROMPT_VERSION,
                guardrailWarnings=scoring_result.guardrail_warnings,
            )

            # --- Stage 12: Save scorecard to DB ---
            ai_job.current_stage = "SAVING_SCORECARD"
            scorecard_json = scorecard.model_dump(by_alias=True, mode="json")
            ai_job.guardrail_warnings = {"scorecard": scorecard_json}

            # --- Stage 13: Publish ai.scoring.completed event ---
            ai_job.current_stage = "PUBLISHING"
            try:
                event_payload = {
                    "applicationId": application_id,
                    "jobPostingId": job_posting_id,
                    "totalScore": total_score,
                    "classification": classification.value,
                    "summary": summary,
                }
                await rabbitmq_manager.publish(
                    routing_key=AI_SCORING_COMPLETED_ROUTING_KEY,
                    body=json.dumps(event_payload).encode(),
                )
                logger.info(
                    "Published ai.scoring.completed for app=%s: score=%.1f, class=%s",
                    application_id, total_score, classification.value,
                )
            except Exception as pub_err:
                logger.error(
                    "Failed to publish scoring event for app=%s: %s",
                    application_id, pub_err,
                )
                # Non-fatal: scorecard is saved, event publish failure doesn't block

            # --- Done ---
            elapsed_ms = int((time.monotonic() - start) * 1000)
            ai_job.status = "COMPLETED"
            ai_job.current_stage = "DONE"
            ai_job.completed_at = datetime.utcnow()
            ai_job.total_latency_ms = elapsed_ms

            await session.commit()

            logger.info(
                "CV pipeline COMPLETED for application_id=%s in %d ms "
                "(%d chunks, score=%.1f, classification=%s, model=%s)",
                application_id, elapsed_ms, len(chunks),
                total_score, classification.value,
                ai_job.extraction_model,
            )

        except Exception as e:
            await session.rollback()
            logger.exception(
                "CV pipeline FAILED for application_id=%s: %s",
                application_id, e,
            )
            # Try to update AIJob status
            try:
                async with async_session_factory() as err_session:
                    from sqlalchemy import update
                    await err_session.execute(
                        update(AIJob)
                        .where(AIJob.application_id == application_id)
                        .where(AIJob.status == "PROCESSING")
                        .values(
                            status="FAILED",
                            error_message=str(e)[:500],
                            completed_at=datetime.utcnow(),
                        )
                    )
                    await err_session.commit()
            except Exception:
                logger.exception("Failed to update AIJob error status")


async def _on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    """RabbitMQ message handler."""
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            logger.info("Received cv.uploaded event: %s", body)
            await _process_cv_event(body)
        except json.JSONDecodeError:
            logger.error("Invalid JSON in cv.uploaded message: %s", message.body)
        except Exception:
            logger.exception("Unhandled error processing cv.uploaded event")


class CVPipelineWorker:
    """RabbitMQ consumer for cv.uploaded events."""

    async def start_consuming(self) -> None:
        """Start consuming from the cv.uploaded queue.

        This should be called as an asyncio task during app startup.
        """
        try:
            channel = rabbitmq_manager.channel
            queue = await channel.get_queue(CV_UPLOADED_QUEUE)
            await queue.consume(_on_message)
            logger.info("CV Pipeline Worker started — consuming from '%s'", CV_UPLOADED_QUEUE)
        except Exception as e:
            logger.error("CV Pipeline Worker failed to start: %s", e)
