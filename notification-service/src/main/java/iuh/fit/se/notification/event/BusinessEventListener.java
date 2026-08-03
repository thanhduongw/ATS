package iuh.fit.se.notification.event;

import iuh.fit.se.notification.client.CandidateServiceClient;
import iuh.fit.se.notification.client.InterviewServiceClient;
import iuh.fit.se.notification.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.notification.client.dto.InterviewResponse;
import iuh.fit.se.notification.client.dto.InterviewerSummary;
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

@Slf4j
@Component
@RequiredArgsConstructor
public class BusinessEventListener {

    private final NotificationService notificationService;
    private final DelayedMessagePublisher delayedMessagePublisher;
    private final InterviewServiceClient interviewServiceClient;
    private final CandidateServiceClient candidateServiceClient;

    @Value("${app.notification.interview-reminder-hours-before}")
    private long reminderHoursBefore;

    @Value("${app.notification.evaluation-check-hours-after}")
    private long evaluationCheckHoursAfter;

    // ===== 1. Requisition cần duyệt =====
    @RabbitListener(queues = BusinessEventConfig.REQUISITION_SUBMITTED_QUEUE)
    public void onRequisitionSubmitted(RequisitionSubmittedEvent event) {
        log.info("Nhận event requisition.submitted, requisitionId={}", event.requisitionId());
        notificationService.createAndPush(
                event.tenantId(), event.approverId(), NotificationType.REQUISITION_PENDING_APPROVAL,
                "Yêu cầu tuyển dụng cần bạn phê duyệt",
                "Yêu cầu \"" + event.title() + "\" đang chờ bạn phê duyệt.",
                "REQUISITION", event.requisitionId());
    }

    // ===== 2. Lịch phỏng vấn: thông báo ngay + lên lịch nhắc trước + lên lịch kiểm tra evaluation =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_SCHEDULED_QUEUE)
    public void onInterviewScheduled(InterviewScheduledEvent event) {
        log.info("Nhận event interview.scheduled, interviewId={}", event.interviewId());

        InterviewResponse interview = interviewServiceClient.getInterviewById(event.interviewId());
        if (interview == null) return;

        for (InterviewerSummary interviewer : interview.interviewers()) {
            notificationService.createAndPush(
                    event.tenantId(), interviewer.interviewerId(), NotificationType.INTERVIEW_SCHEDULED,
                    "Lịch phỏng vấn mới",
                    "Bạn được phân công phỏng vấn " + interview.candidateName() + " lúc "
                            + event.scheduledAt() + ".",
                    "INTERVIEW", event.interviewId());
        }

        long reminderDelay = Duration.between(LocalDateTime.now(),
                event.scheduledAt().minusHours(reminderHoursBefore)).toMillis();
        delayedMessagePublisher.scheduleInterviewReminder(
                new InterviewReminderPayload(event.tenantId(), event.interviewId(), event.applicationId()), reminderDelay);

        long evalCheckDelay = Duration.between(LocalDateTime.now(),
                event.scheduledAt().plusHours(evaluationCheckHoursAfter)).toMillis();
        delayedMessagePublisher.scheduleEvaluationCheck(
                new EvaluationCheckPayload(event.tenantId(), event.interviewId()), evalCheckDelay);
    }

    // ===== 3a. Đến giờ nhắc phỏng vấn (delayed message đã "chín") =====
    @RabbitListener(queues = DelayQueueConfig.INTERVIEW_REMINDER_PROCESS_QUEUE)
    public void onInterviewReminderDue(InterviewReminderPayload payload) {
        log.info("Đến giờ nhắc phỏng vấn, interviewId={}", payload.interviewId());

        InterviewResponse interview = interviewServiceClient.getInterviewById(payload.interviewId());
        if (interview == null || !"SCHEDULED".equals(interview.status())) {
            return; // đã hủy hoặc đã hoàn tất, không cần nhắc nữa
        }

        for (InterviewerSummary interviewer : interview.interviewers()) {
            notificationService.createAndPush(
                    payload.tenantId(), interviewer.interviewerId(), NotificationType.INTERVIEW_REMINDER,
                    "Sắp đến giờ phỏng vấn",
                    "Buổi phỏng vấn " + interview.candidateName() + " sẽ diễn ra lúc "
                            + interview.scheduledAt() + ".",
                    "INTERVIEW", payload.interviewId());
        }
    }

    // ===== 3b. Đến giờ kiểm tra Evaluation còn thiếu không =====
    @RabbitListener(queues = DelayQueueConfig.EVALUATION_CHECK_PROCESS_QUEUE)
    public void onEvaluationCheckDue(EvaluationCheckPayload payload) {
        log.info("Đến giờ kiểm tra evaluation, interviewId={}", payload.interviewId());

        InterviewResponse interview = interviewServiceClient.getInterviewById(payload.interviewId());
        if (interview == null) return;

        boolean hasMissing = interview.interviewers().stream().anyMatch(i -> !i.evaluationSubmitted());
        if (!hasMissing) return;

        ApplicationSummaryResponse application = candidateServiceClient.getApplicationById(interview.applicationId());

        for (InterviewerSummary interviewer : interview.interviewers()) {
            if (interviewer.evaluationSubmitted()) continue;

            notificationService.createAndPush(
                    payload.tenantId(), interviewer.interviewerId(), NotificationType.EVALUATION_INCOMPLETE_REMINDER,
                    "Bạn chưa nộp đánh giá phỏng vấn",
                    "Vui lòng hoàn tất đánh giá cho buổi phỏng vấn " + interview.candidateName() + ".",
                    "INTERVIEW", payload.interviewId());

            if (application != null && application.assignedRecruiterId() != null) {
                notificationService.createAndPush(
                        payload.tenantId(), application.assignedRecruiterId(), NotificationType.EVALUATION_INCOMPLETE_REMINDER,
                        "Interviewer chưa nộp đánh giá",
                        interviewer.fullName() + " chưa nộp đánh giá cho " + interview.candidateName() + ".",
                        "INTERVIEW", payload.interviewId());
            }
        }
    }

    // ===== 4. Offer cần xác nhận =====
    @RabbitListener(queues = BusinessEventConfig.OFFER_APPROVED_QUEUE)
    public void onOfferApproved(OfferApprovedEvent event) {
        log.info("Nhận event offer.approved, offerId={}", event.offerId());
        notificationService.createAndPush(
                event.tenantId(), event.requesterId(), NotificationType.OFFER_PENDING_CONFIRMATION,
                "Offer đã được duyệt",
                "Offer đã được phê duyệt, hãy gửi cho ứng viên và ghi nhận phản hồi.",
                "OFFER", event.offerId());
    }
}