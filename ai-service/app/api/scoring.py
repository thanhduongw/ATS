"""
API endpoints for AI Scoring & Matching (Phase 5).

Endpoints:
1. GET  /applications/{id}/score    — Get scoring result (Scorecard)
2. POST /applications/{id}/rescore  — Trigger rescoring
3. POST /feedback                   — Submit recruiter feedback
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from app.core.database import async_session_factory
from app.core.rabbitmq import (
    AI_SCORING_COMPLETED_ROUTING_KEY,
    rabbitmq_manager,
)
from app.models import AIFeedback, AIJob
from app.schemas.scoring import (
    FeedbackRequest,
    RescoreRequest,
    RescoreResponse,
    Scorecard,
    ScorecardResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/applications/{application_id}/score",
    response_model=ScorecardResponse,
    summary="Get AI scoring result for an application",
    description=(
        "Returns the AI-generated Scorecard for a specific application. "
        "If scoring is still in progress, returns 200 with status='processing' "
        "and the current pipeline stage. "
        "If scoring has not been started, returns status='not_found'."
    ),
)
async def get_score(application_id: int) -> ScorecardResponse:
    """Get the AI scoring result (Scorecard) for an application."""
    async with async_session_factory() as session:
        # Find the most recent AIJob for this application
        result = await session.execute(
            select(AIJob)
            .where(AIJob.application_id == application_id)
            .order_by(AIJob.id.desc())
            .limit(1)
        )
        ai_job = result.scalar_one_or_none()

        if not ai_job:
            return ScorecardResponse(
                status="not_found",
                errorMessage="Chưa có kết quả AI cho đơn ứng tuyển này",
            )

        if ai_job.status == "COMPLETED" and ai_job.guardrail_warnings:
            # guardrail_warnings contains the full scorecard as JSONB
            scorecard_data = ai_job.guardrail_warnings.get("scorecard")
            if scorecard_data:
                try:
                    scorecard = Scorecard.model_validate(scorecard_data)
                    return ScorecardResponse(
                        status="completed",
                        scorecard=scorecard,
                    )
                except Exception as e:
                    logger.error(
                        "Failed to parse scorecard for app=%d: %s",
                        application_id, e,
                    )
                    return ScorecardResponse(
                        status="failed",
                        errorMessage=f"Scorecard parse error: {e}",
                    )

            # COMPLETED but no scorecard stored — extraction-only job (Phase 4)
            return ScorecardResponse(
                status="completed",
                errorMessage="Pipeline hoàn thành nhưng chưa có dữ liệu scoring",
            )

        if ai_job.status in ("QUEUED", "PROCESSING"):
            return ScorecardResponse(
                status="processing",
                currentStage=ai_job.current_stage,
            )

        if ai_job.status == "PENDING_BENCHMARK":
            return ScorecardResponse(
                status="pending_benchmark",
                errorMessage=(
                    "Job posting chưa có benchmark criteria. "
                    "Vui lòng tạo benchmark trước khi chấm điểm."
                ),
            )

        if ai_job.status == "FAILED":
            return ScorecardResponse(
                status="failed",
                errorMessage=ai_job.error_message,
            )

        # Unknown status
        return ScorecardResponse(
            status=ai_job.status.lower() if ai_job.status else "unknown",
            errorMessage=ai_job.error_message,
        )


@router.post(
    "/applications/{application_id}/rescore",
    response_model=RescoreResponse,
    summary="Trigger rescoring for an application",
    description=(
        "Creates a new AIJob and publishes a rescore event. "
        "The previous AIJob (if any) is marked as SUPERSEDED. "
        "Returns 202 Accepted with the new job ID."
    ),
    status_code=202,
)
async def rescore(
    application_id: int,
    request: RescoreRequest,
) -> RescoreResponse:
    """Trigger rescoring for an application."""
    async with async_session_factory() as session:
        # 1. Find existing AIJob to get candidate_id and job_posting_id
        result = await session.execute(
            select(AIJob)
            .where(AIJob.application_id == application_id)
            .order_by(AIJob.id.desc())
            .limit(1)
        )
        existing_job = result.scalar_one_or_none()

        if not existing_job:
            raise HTTPException(
                status_code=404,
                detail=f"No AIJob found for application_id={application_id}",
            )

        # 2. Mark existing job as SUPERSEDED
        if existing_job.status in ("COMPLETED", "FAILED", "PENDING_BENCHMARK"):
            await session.execute(
                update(AIJob)
                .where(AIJob.id == existing_job.id)
                .values(status="SUPERSEDED")
            )

        # 3. Create new AIJob
        new_job = AIJob(
            application_id=application_id,
            candidate_id=existing_job.candidate_id,
            job_posting_id=existing_job.job_posting_id,
            status="QUEUED",
            current_stage="QUEUED",
        )
        session.add(new_job)
        await session.flush()
        new_job_id = new_job.id

        await session.commit()

        # 4. Publish rescore event to RabbitMQ
        import json
        from app.core.rabbitmq import CV_UPLOADED_ROUTING_KEY
        event = {
            "applicationId": application_id,
            "candidateId": existing_job.candidate_id,
            "jobPostingId": existing_job.job_posting_id,
            "cvFileUrl": "",      # empty — worker skips extraction in rescore mode
            "isRescore": True,    # signal worker to skip Stage 1-6 and reuse existing chunks
            "reason": request.reason,
        }
        try:
            await rabbitmq_manager.publish(
                routing_key=CV_UPLOADED_ROUTING_KEY,
                body=json.dumps(event).encode(),
            )
        except Exception as e:
            logger.error("Failed to publish rescore event: %s", e)

        logger.info(
            "Rescore triggered for application_id=%d → new_job_id=%d reason='%s'",
            application_id, new_job_id, request.reason,
        )

        return RescoreResponse(
            message=f"Rescore đã được kích hoạt cho application {application_id}",
            newJobId=new_job_id,
        )


@router.post(
    "/feedback",
    summary="Submit recruiter feedback on AI scoring",
    description=(
        "Allows recruiters to accept, override, or report issues with "
        "AI scoring results. This feedback is stored for model improvement."
    ),
    status_code=200,
)
async def submit_feedback(request: FeedbackRequest) -> dict:
    """Submit recruiter feedback on AI scoring."""
    # Validate action
    valid_actions = {"ACCEPT", "OVERRIDE_SCORE", "REPORT_ISSUE"}
    if request.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{request.action}'. Must be one of: {valid_actions}",
        )

    async with async_session_factory() as session:
        # Find the latest AIJob for this application
        result = await session.execute(
            select(AIJob.id)
            .where(AIJob.application_id == request.application_id)
            .order_by(AIJob.id.desc())
            .limit(1)
        )
        ai_job_id = result.scalar_one_or_none()

        feedback = AIFeedback(
            application_id=request.application_id,
            ai_job_id=ai_job_id,
            user_id=0,  # TODO: Extract from JWT when auth is integrated
            action=request.action,
            original_score=request.original_score,
            corrected_score=request.corrected_score,
            comment=request.comment,
        )
        session.add(feedback)
        await session.commit()

        logger.info(
            "Feedback recorded: app=%d, action=%s, original=%.1f, corrected=%s",
            request.application_id,
            request.action,
            request.original_score,
            request.corrected_score,
        )

        return {
            "message": "Feedback đã được lưu thành công",
            "feedbackId": feedback.id,
        }
