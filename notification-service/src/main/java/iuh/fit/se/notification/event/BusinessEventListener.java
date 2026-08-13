package iuh.fit.se.notification.event;

import iuh.fit.se.notification.client.ApplicationServiceClient;
import iuh.fit.se.notification.client.AuthServiceClient;
import iuh.fit.se.notification.client.CandidateServiceClient;
import iuh.fit.se.notification.client.InterviewServiceClient;
import iuh.fit.se.notification.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.notification.client.dto.CandidateSummaryResponse;
import iuh.fit.se.notification.client.dto.InterviewResponse;
import iuh.fit.se.notification.client.dto.InterviewerSummary;
import iuh.fit.se.notification.client.dto.UserSummaryResponse;
import iuh.fit.se.notification.config.BusinessEventConfig;
import iuh.fit.se.notification.config.DelayQueueConfig;
import iuh.fit.se.notification.notification.NotificationService;
import iuh.fit.se.notification.notification.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BusinessEventListener {

    private final NotificationService notificationService;
    private final DelayedMessagePublisher delayedMessagePublisher;
    private final InterviewServiceClient interviewServiceClient;
    private final ApplicationServiceClient applicationServiceClient;
    private final CandidateServiceClient candidateServiceClient;
    private final AuthServiceClient authServiceClient;

    @Value("${app.notification.interview-reminder-hours-before:24}")
    private long reminderHoursBefore;

    @Value("${app.notification.evaluation-check-hours-after:24}")
    private long evaluationCheckHoursAfter;

    // ===== 1. Requisition cần duyệt =====
    @RabbitListener(queues = BusinessEventConfig.REQUISITION_SUBMITTED_QUEUE)
    public void onRequisitionSubmitted(RequisitionSubmittedEvent event) {
        log.info("Nhận event requisition.submitted, requisitionId={}", event.requisitionId());
        notificationService.createAndPush(
                event.tenantId(),
                event.approverId(),
                NotificationType.REQUISITION_PENDING_APPROVAL,
                "Yêu cầu tuyển dụng cần bạn phê duyệt",
                "Yêu cầu \"" + event.title() + "\" đang chờ bạn phê duyệt.",
                "REQUISITION",
                event.requisitionId());
    }

    // ===== 2. Application created =====
    @RabbitListener(queues = BusinessEventConfig.APPLICATION_CREATED_QUEUE)
    public void onApplicationCreated(ApplicationCreatedEvent event) {
        log.info("Nhận event application.created, applicationId={}", event.applicationId());

        if (event.assignedRecruiterId() != null) {
            notificationService.createAndPush(
                    event.tenantId(),
                    event.assignedRecruiterId(),
                    NotificationType.APPLICATION_CREATED,
                    "Hồ sơ ứng tuyển mới",
                    (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                            + " vừa nộp hồ sơ (application #" + event.applicationId() + ").",
                    "APPLICATION",
                    event.applicationId());
            return;
        }

        try {
            List<UserSummaryResponse> recruiters = authServiceClient.getUsers(event.tenantId(), "RECRUITER");
            if (recruiters != null) {
                for (UserSummaryResponse u : recruiters) {
                    notificationService.createAndPush(
                            event.tenantId(),
                            u.id(),
                            NotificationType.APPLICATION_CREATED,
                            "Hồ sơ ứng tuyển mới",
                            (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                                    + " vừa nộp hồ sơ (application #" + event.applicationId() + ").",
                            "APPLICATION",
                            event.applicationId());
                }
            }
        } catch (Exception e) {
            log.warn("Không gửi được notify cho RECRUITER: {}", e.getMessage());
        }
    }

    // ===== 3. Trạng thái đơn ứng tuyển thay đổi =====
    @RabbitListener(queues = BusinessEventConfig.APPLICATION_STATUS_CHANGED_QUEUE)
    public void onApplicationStatusChanged(ApplicationStatusChangedEvent event) {
        log.info("Nhận event application.status_changed, applicationId={}, {} -> {}",
                event.applicationId(), event.fromStageName(), event.toStageName());

        Long candidateUserId = event.candidateUserId();
        if (candidateUserId == null && event.candidateId() != null) {
            candidateUserId = resolveCandidateUserId(event.tenantId(), event.candidateId());
        }

        String toType = event.toStageType() != null ? event.toStageType() : "";

        if (candidateUserId != null) {
            if ("REJECTED".equalsIgnoreCase(toType)) {
                notificationService.createAndPush(
                        event.tenantId(),
                        candidateUserId,
                        NotificationType.APPLICATION_REJECTED,
                        "Kết quả hồ sơ ứng tuyển",
                        "Hồ sơ của bạn đã chuyển sang giai đoạn: " + nullSafe(event.toStageName()) + ".",
                        "APPLICATION",
                        event.applicationId());
            } else {
                notificationService.createAndPush(
                        event.tenantId(),
                        candidateUserId,
                        NotificationType.APPLICATION_STAGE_CHANGED,
                        "Cập nhật trạng thái hồ sơ",
                        "Hồ sơ chuyển từ \"" + nullSafe(event.fromStageName())
                                + "\" sang \"" + nullSafe(event.toStageName()) + "\".",
                        "APPLICATION",
                        event.applicationId());
            }
        }

        if (event.assignedRecruiterId() != null) {
            notificationService.createAndPush(
                    event.tenantId(),
                    event.assignedRecruiterId(),
                    NotificationType.APPLICATION_STAGE_CHANGED,
                    "Hồ sơ đổi giai đoạn",
                    "Application #" + event.applicationId() + ": "
                            + nullSafe(event.fromStageName()) + " → " + nullSafe(event.toStageName()),
                    "APPLICATION",
                    event.applicationId());
        }
    }

    // ===== 4. Lịch phỏng vấn =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_SCHEDULED_QUEUE)
    public void onInterviewScheduled(InterviewScheduledEvent event) {
        log.info("Nhận event interview.scheduled, interviewId={}", event.interviewId());

        InterviewResponse interview = safeGetInterview(event.interviewId(), event.tenantId());
        if (interview == null) {
            return;
        }

        if (interview.interviewers() != null) {
            for (InterviewerSummary interviewer : interview.interviewers()) {
                notificationService.createAndPush(
                        event.tenantId(),
                        interviewer.interviewerId(),
                        NotificationType.INTERVIEW_SCHEDULED,
                        "Lịch phỏng vấn mới",
                        "Bạn được phân công phỏng vấn " + nullSafe(interview.candidateName())
                                + " lúc " + event.scheduledAt() + ".",
                        "INTERVIEW",
                        event.interviewId());
            }
        }

        Long candidateUserId = resolveCandidateUserIdFromApplication(event.tenantId(), event.applicationId());
        if (candidateUserId != null) {
            notificationService.createAndPush(
                    event.tenantId(),
                    candidateUserId,
                    NotificationType.INTERVIEW_SCHEDULED,
                    "Lịch phỏng vấn",
                    "Bạn có lịch phỏng vấn lúc " + event.scheduledAt() + ". Vui lòng xác nhận trên hệ thống.",
                    "INTERVIEW",
                    event.interviewId());
        }

        long reminderDelay = Duration.between(
                LocalDateTime.now(),
                event.scheduledAt().minusHours(reminderHoursBefore)).toMillis();
        if (reminderDelay > 0) {
            delayedMessagePublisher.scheduleInterviewReminder(
                    new InterviewReminderPayload(event.tenantId(), event.interviewId(), event.applicationId()),
                    reminderDelay);
        }

        long evalCheckDelay = Duration.between(
                LocalDateTime.now(),
                event.scheduledAt().plusHours(evaluationCheckHoursAfter)).toMillis();
        if (evalCheckDelay > 0) {
            delayedMessagePublisher.scheduleEvaluationCheck(
                    new EvaluationCheckPayload(event.tenantId(), event.interviewId()),
                    evalCheckDelay);
        }
    }

    // ===== 5. Interview confirmed =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_CONFIRMED_QUEUE)
    public void onInterviewConfirmed(InterviewConfirmedEvent event) {
        log.info("Nhận event interview.confirmed, interviewId={}", event.interviewId());

        InterviewResponse interview = safeGetInterview(event.interviewId(), event.tenantId());
        if (interview == null) {
            return;
        }

        if (interview.interviewers() != null) {
            for (InterviewerSummary interviewer : interview.interviewers()) {
                notificationService.createAndPush(
                        event.tenantId(),
                        interviewer.interviewerId(),
                        NotificationType.INTERVIEW_CONFIRMED,
                        "Ứng viên đã xác nhận lịch phỏng vấn",
                        nullSafe(interview.candidateName()) + " đã xác nhận lịch lúc " + event.scheduledAt() + ".",
                        "INTERVIEW",
                        event.interviewId());
            }
        }
    }

    // ===== 6a. Nhắc phỏng vấn =====
    @RabbitListener(queues = DelayQueueConfig.INTERVIEW_REMINDER_PROCESS_QUEUE)
    public void onInterviewReminderDue(InterviewReminderPayload payload) {
        log.info("Đến giờ nhắc phỏng vấn, interviewId={}", payload.interviewId());

        InterviewResponse interview = safeGetInterview(payload.interviewId(), payload.tenantId());
        if (interview == null) {
            return;
        }
        String status = interview.status();
        if (status == null || (!"SCHEDULED".equals(status) && !"CONFIRMED".equals(status))) {
            return;
        }

        if (interview.interviewers() != null) {
            for (InterviewerSummary interviewer : interview.interviewers()) {
                notificationService.createAndPush(
                        payload.tenantId(),
                        interviewer.interviewerId(),
                        NotificationType.INTERVIEW_REMINDER,
                        "Sắp đến giờ phỏng vấn",
                        "Buổi phỏng vấn " + nullSafe(interview.candidateName())
                                + " sẽ diễn ra lúc " + interview.scheduledAt() + ".",
                        "INTERVIEW",
                        payload.interviewId());
            }
        }

        Long candidateUserId = resolveCandidateUserIdFromApplication(
                payload.tenantId(), payload.applicationId());
        if (candidateUserId != null) {
            notificationService.createAndPush(
                    payload.tenantId(),
                    candidateUserId,
                    NotificationType.INTERVIEW_REMINDER,
                    "Nhắc lịch phỏng vấn",
                    "Buổi phỏng vấn của bạn sẽ diễn ra lúc " + interview.scheduledAt() + ".",
                    "INTERVIEW",
                    payload.interviewId());
        }
    }

    // ===== 6b. Kiểm tra evaluation thiếu =====
    @RabbitListener(queues = DelayQueueConfig.EVALUATION_CHECK_PROCESS_QUEUE)
    public void onEvaluationCheckDue(EvaluationCheckPayload payload) {
        log.info("Đến giờ kiểm tra evaluation, interviewId={}", payload.interviewId());

        InterviewResponse interview = safeGetInterview(payload.interviewId(), payload.tenantId());
        if (interview == null || interview.interviewers() == null) {
            return;
        }

        boolean hasMissing = interview.interviewers().stream()
                .anyMatch(i -> !i.evaluationSubmitted());
        if (!hasMissing) {
            return;
        }

        ApplicationSummaryResponse application = null;
        try {
            application = applicationServiceClient.getApplicationById(
                    interview.applicationId(), payload.tenantId());
        } catch (Exception e) {
            log.warn("Không lấy được application summary: {}", e.getMessage());
        }

        for (InterviewerSummary interviewer : interview.interviewers()) {
            if (interviewer.evaluationSubmitted()) {
                continue;
            }

            notificationService.createAndPush(
                    payload.tenantId(),
                    interviewer.interviewerId(),
                    NotificationType.EVALUATION_INCOMPLETE_REMINDER,
                    "Bạn chưa nộp đánh giá phỏng vấn",
                    "Vui lòng hoàn tất đánh giá cho buổi phỏng vấn "
                            + nullSafe(interview.candidateName()) + ".",
                    "INTERVIEW",
                    payload.interviewId());

            if (application != null && application.assignedRecruiterId() != null) {
                String name = interviewer.fullName() != null ? interviewer.fullName() : "Interviewer";
                notificationService.createAndPush(
                        payload.tenantId(),
                        application.assignedRecruiterId(),
                        NotificationType.EVALUATION_INCOMPLETE_REMINDER,
                        "Interviewer chưa nộp đánh giá",
                        name + " chưa nộp đánh giá cho " + nullSafe(interview.candidateName()) + ".",
                        "INTERVIEW",
                        payload.interviewId());
            }
        }
    }

    // ===== 7. Offer đã duyệt =====
    @RabbitListener(queues = BusinessEventConfig.OFFER_APPROVED_QUEUE)
    public void onOfferApproved(OfferApprovedEvent event) {
        log.info("Nhận event offer.approved, offerId={}", event.offerId());

        if (event.requesterId() != null) {
            notificationService.createAndPush(
                    event.tenantId(),
                    event.requesterId(),
                    NotificationType.OFFER_PENDING_CONFIRMATION,
                    "Offer đã được duyệt",
                    "Offer #" + event.offerId() + " đã được phê duyệt. Ứng viên có thể Accept/Decline.",
                    "OFFER",
                    event.offerId());
        }

        Long candidateUserId = resolveCandidateUserId(event.tenantId(), event.candidateId());
        if (candidateUserId == null) {
            candidateUserId = resolveCandidateUserIdFromApplication(event.tenantId(), event.applicationId());
        }
        if (candidateUserId != null) {
            notificationService.createAndPush(
                    event.tenantId(),
                    candidateUserId,
                    NotificationType.OFFER_READY_FOR_CANDIDATE,
                    "Bạn nhận được thư đề nghị nhận việc",
                    "Offer đã sẵn sàng. Vui lòng xem và phản hồi trên hệ thống.",
                    "OFFER",
                    event.offerId());
        }
    }

    // ===== 8. Offer accepted =====
    @RabbitListener(queues = BusinessEventConfig.OFFER_ACCEPTED_QUEUE)
    public void onOfferAccepted(OfferAcceptedEvent event) {
        log.info("Nhận event offer.accepted, offerId={}", event.offerId());
        if (event.requesterId() == null) {
            return;
        }

        notificationService.createAndPush(
                event.tenantId(),
                event.requesterId(),
                NotificationType.OFFER_ACCEPTED,
                "Ứng viên đã chấp nhận Offer",
                (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                        + " đã chấp nhận Offer #" + event.offerId() + ".",
                "OFFER",
                event.offerId());
    }

    // ===== 9. Offer declined =====
    @RabbitListener(queues = BusinessEventConfig.OFFER_DECLINED_QUEUE)
    public void onOfferDeclined(OfferDeclinedEvent event) {
        log.info("Nhận event offer.declined, offerId={}", event.offerId());
        if (event.requesterId() == null) {
            return;
        }

        String extra = event.note() != null && !event.note().isBlank() ? " Lý do: " + event.note() : "";
        notificationService.createAndPush(
                event.tenantId(),
                event.requesterId(),
                NotificationType.OFFER_DECLINED,
                "Ứng viên đã từ chối Offer",
                (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                        + " đã từ chối Offer #" + event.offerId() + "." + extra,
                "OFFER",
                event.offerId());
    }

    // ---- helpers ----

    private InterviewResponse safeGetInterview(Long interviewId, Long tenantId) {
        try {
            return interviewServiceClient.getInterviewById(interviewId, tenantId, 0L, "SYSTEM");
        } catch (Exception e) {
            log.warn("Không lấy được interview {}: {}", interviewId, e.getMessage());
            return null;
        }
    }

    private Long resolveCandidateUserId(Long tenantId, Long candidateId) {
        if (candidateId == null) {
            return null;
        }
        try {
            CandidateSummaryResponse c = candidateServiceClient.getCandidateSummary(tenantId, candidateId);
            return c != null ? c.userId() : null;
        } catch (Exception e) {
            log.warn("resolveCandidateUserId thất bại candidateId={}: {}", candidateId, e.getMessage());
            return null;
        }
    }

    private Long resolveCandidateUserIdFromApplication(Long tenantId, Long applicationId) {
        if (applicationId == null) {
            return null;
        }
        try {
            ApplicationSummaryResponse app =
                    applicationServiceClient.getApplicationById(applicationId, tenantId);
            if (app == null || app.candidateId() == null) {
                return null;
            }
            return resolveCandidateUserId(tenantId, app.candidateId());
        } catch (Exception e) {
            log.warn("resolveCandidateUserIdFromApplication thất bại applicationId={}: {}",
                    applicationId, e.getMessage());
            return null;
        }
    }

    private static String nullSafe(String s) {
        return s != null ? s : "";
    }
}