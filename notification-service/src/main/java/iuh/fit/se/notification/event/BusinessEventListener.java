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
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
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

    @Value("${app.notification.evaluation-check-hours-after:24}")
    private long evaluationCheckHoursAfter;

    // ===== 1. Requisition cần duyệt =====
    @RabbitListener(queues = BusinessEventConfig.REQUISITION_SUBMITTED_QUEUE)
    public void onRequisitionSubmitted(RequisitionSubmittedEvent event) {
        log.info("Nhận event requisition.submitted, requisitionId={}", event.requisitionId());
        notificationService.createAndPush(
                event.approverId(),
                NotificationType.REQUISITION_PENDING_APPROVAL,
                "Yêu cầu tuyển dụng cần bạn phê duyệt",
                "Yêu cầu \"" + event.title() + "\" đang chờ bạn phê duyệt.",
                "REQUISITION",
                event.requisitionId());
    }

    // ===== 1b. Yêu cầu tuyển dụng đã được xử lý — báo người lập =====
    @RabbitListener(queues = BusinessEventConfig.REQUISITION_REVIEWED_QUEUE)
    public void onRequisitionReviewed(RequisitionReviewedEvent event) {
        log.info("Nhận event requisition.reviewed, requisitionId={}, outcome={}", event.requisitionId(), event.outcome());
        String name = "Yêu cầu \"" + nullSafe(event.title()) + "\"";
        String note = event.note() != null && !event.note().isBlank() ? event.note().trim() : null;
        String title;
        String body;
        switch (event.outcome() == null ? "" : event.outcome()) {
            case "APPROVED" -> {
                title = "Yêu cầu tuyển dụng đã được duyệt";
                body = name + " đã được duyệt." + (note != null ? " Ghi chú: " + note : "");
            }
            case "REJECTED" -> {
                title = "Yêu cầu tuyển dụng bị từ chối";
                body = name + " bị từ chối." + (note != null ? " Lý do: " + note : "");
            }
            case "CHANGES_REQUESTED" -> {
                title = "Yêu cầu tuyển dụng cần sửa";
                body = name + " cần bổ sung trước khi duyệt." + (note != null ? " Nội dung: " + note : "");
            }
            default -> {
                return;
            }
        }
        notificationService.createAndPush(
                event.requesterId(),
                NotificationType.REQUISITION_REVIEWED,
                title,
                body,
                "REQUISITION",
                event.requisitionId());
    }

    // ===== 2. Application created =====
    @RabbitListener(queues = BusinessEventConfig.APPLICATION_CREATED_QUEUE)
    public void onApplicationCreated(ApplicationCreatedEvent event) {
        log.info("Nhận event application.created, applicationId={}", event.applicationId());

        if (event.assignedRecruiterId() != null) {
            notificationService.createAndPush(
                    event.assignedRecruiterId(),
                    NotificationType.APPLICATION_CREATED,
                    "Hồ sơ ứng tuyển mới",
                    (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                            + " vừa nộp hồ sơ" + forJob(event.jobTitle()) + ".",
                    "APPLICATION",
                    event.applicationId());
            return;
        }

        try {
            List<UserSummaryResponse> recruiters = authServiceClient.getUsers("RECRUITER");
            if (recruiters != null) {
                for (UserSummaryResponse u : recruiters) {
                    notificationService.createAndPush(
                            u.id(),
                            NotificationType.APPLICATION_CREATED,
                            "Hồ sơ ứng tuyển mới",
                            (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                                    + " vừa nộp hồ sơ" + forJob(event.jobTitle()) + ".",
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
            candidateUserId = resolveCandidateUserId(event.candidateId());
        }

        String toType = event.toStageType() != null ? event.toStageType() : "";
        String closed = event.closedReason();
        String job = forJob(event.jobTitle());
        String candidateName = candidateNameOf(event.applicationId());

        // Ứng viên xoá dữ liệu: tài khoản đã khoá, không báo cho ứng viên nữa.
        if (candidateUserId != null && !"DATA_DELETED".equals(closed)) {
            if ("WITHDRAWN".equals(closed)) {
                notificationService.createAndPush(
                        candidateUserId,
                        NotificationType.APPLICATION_STAGE_CHANGED,
                        "Bạn đã rút đơn ứng tuyển",
                        "Bạn đã rút đơn ứng tuyển" + job + ".",
                        "APPLICATION",
                        event.applicationId());
            } else if ("HIRED_ELSEWHERE".equals(closed)) {
                notificationService.createAndPush(
                        candidateUserId,
                        NotificationType.APPLICATION_STAGE_CHANGED,
                        "Đơn ứng tuyển đã ngừng xử lý",
                        "Đơn ứng tuyển" + job + " ngừng xử lý vì bạn đã nhận việc ở vị trí khác.",
                        "APPLICATION",
                        event.applicationId());
            } else if ("REJECTED".equalsIgnoreCase(toType)) {
                notificationService.createAndPush(
                        candidateUserId,
                        NotificationType.APPLICATION_REJECTED,
                        "Kết quả hồ sơ ứng tuyển",
                        "Rất tiếc, hồ sơ ứng tuyển" + job + " của bạn chưa phù hợp ở đợt này.",
                        "APPLICATION",
                        event.applicationId());
            } else {
                notificationService.createAndPush(
                        candidateUserId,
                        NotificationType.APPLICATION_STAGE_CHANGED,
                        "Cập nhật trạng thái hồ sơ",
                        "Hồ sơ ứng tuyển" + job + " đã chuyển sang giai đoạn \"" + nullSafe(event.toStageName()) + "\".",
                        "APPLICATION",
                        event.applicationId());
            }
        }

        // Người cần biết phía công ty: người phụ trách đơn. Đơn chưa giao ai mà ứng viên tự đóng (rút đơn, xoá dữ liệu)
        // thì báo mọi Chuyên viên tuyển dụng — giống khi đơn mới đến — để không ai tiếp tục xử lý đơn đã đóng.
        java.util.Set<Long> staff = new java.util.LinkedHashSet<>();
        if (event.assignedRecruiterId() != null) {
            staff.add(event.assignedRecruiterId());
        } else if ("WITHDRAWN".equals(closed) || "DATA_DELETED".equals(closed)) {
            staff.addAll(recruiterIds());
        }
        if (!staff.isEmpty()) {
            String who = candidateName != null ? candidateName : "Ứng viên";
            String title;
            String body;
            if ("WITHDRAWN".equals(closed)) {
                title = "Ứng viên rút đơn";
                body = who + " đã rút đơn ứng tuyển" + job + ".";
            } else if ("DATA_DELETED".equals(closed)) {
                title = "Ứng viên xoá dữ liệu";
                body = "Một ứng viên đã xoá dữ liệu cá nhân, đơn ứng tuyển" + job + " đã đóng.";
            } else if ("HIRED_ELSEWHERE".equals(closed)) {
                title = "Đơn ngừng xử lý";
                body = "Đơn của " + who + job + " ngừng xử lý vì ứng viên đã nhận việc ở vị trí khác.";
            } else {
                title = "Hồ sơ đổi giai đoạn";
                body = who + job + ": " + nullSafe(event.fromStageName()) + " → " + nullSafe(event.toStageName());
            }
            for (Long userId : staff) {
                notificationService.createAndPush(
                        userId,
                        NotificationType.APPLICATION_STAGE_CHANGED,
                        title,
                        body,
                        "APPLICATION",
                        event.applicationId());
            }
        }
    }

    /** Mọi Chuyên viên tuyển dụng; lỗi gọi auth-service thì trả rỗng (không làm hỏng các thông báo khác). */
    private List<Long> recruiterIds() {
        try {
            List<UserSummaryResponse> recruiters = authServiceClient.getUsers("RECRUITER");
            return recruiters == null ? List.of() : recruiters.stream().map(UserSummaryResponse::id).toList();
        } catch (Exception e) {
            log.warn("Không lấy được danh sách RECRUITER: {}", e.getMessage());
            return List.of();
        }
    }

    // ===== Workflow automation: hồ sơ kẹt quá lâu ở 1 giai đoạn =====
    @RabbitListener(queues = BusinessEventConfig.APPLICATION_STALE_QUEUE)
    public void onApplicationStale(ApplicationStaleEvent event) {
        log.info("Nhận event application.stale, applicationId={}, daysSinceUpdate={}",
                event.applicationId(), event.daysSinceUpdate());
        notificationService.createAndPush(
                event.assignedRecruiterId(),
                NotificationType.APPLICATION_STALE_REMINDER,
                "Hồ sơ chưa xử lý lâu ngày",
                nullSafe(event.candidateName()) + " đang ở giai đoạn \"" + nullSafe(event.currentStageName())
                        + "\" đã " + event.daysSinceUpdate() + " ngày, chưa được cập nhật.",
                "APPLICATION",
                event.applicationId());
    }

    // ===== Application comment @mention =====
    @RabbitListener(queues = BusinessEventConfig.APPLICATION_COMMENT_MENTION_QUEUE)
    public void onApplicationCommentMention(ApplicationCommentMentionEvent event) {
        log.info("Nhận event application.comment_mention, applicationId={}, mentionedUserId={}",
                event.applicationId(), event.mentionedUserId());
        notificationService.createAndPush(
                event.mentionedUserId(),
                NotificationType.APPLICATION_COMMENT_MENTION,
                nullSafe(event.authorName()) + " đã nhắc đến bạn",
                nullSafe(event.commentExcerpt()),
                "APPLICATION",
                event.applicationId());
    }

    // ===== 4. Lịch phỏng vấn =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_SCHEDULED_QUEUE)
    public void onInterviewScheduled(InterviewScheduledEvent event) {
        log.info("Nhận event interview.scheduled, interviewId={}", event.interviewId());

        InterviewResponse interview = safeGetInterview(event.interviewId());
        if (interview == null) {
            return;
        }

        if (interview.interviewers() != null) {
            for (InterviewerSummary interviewer : interview.interviewers()) {
                notificationService.createAndPush(
                        interviewer.interviewerId(),
                        NotificationType.INTERVIEW_SCHEDULED,
                        "Lịch phỏng vấn chờ bạn xác nhận",
                        "Bạn được phân công phỏng vấn " + nullSafe(interview.candidateName())
                                + " lúc " + formatVi(event.scheduledAt())
                                + ". Vui lòng xác nhận hoặc đề xuất giờ khác.",
                        "INTERVIEW",
                        event.interviewId());
            }
        }

    }

    /**
     * Phòng ban chốt giờ. Đây là mốc duy nhất ứng viên được biết buổi phỏng vấn tồn tại —
     * trước đó giờ giấc còn đang thương lượng nội bộ.
     *
     * <p>Lịch nhắc và lịch kiểm tra đánh giá cũng đặt ở đây chứ không đặt lúc tạo, vì trước
     * khi chốt thì giờ còn thay đổi được, hẹn theo giờ tạm là hẹn sai.
     */
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_HM_CONFIRMED_QUEUE)
    public void onInterviewHmConfirmed(InterviewHmConfirmedEvent event) {
        log.info("Nhận event interview.hm-confirmed, interviewId={}", event.interviewId());

        Long candidateUserId = resolveCandidateUserIdFromApplication(event.applicationId());
        if (candidateUserId != null) {
            notificationService.createAndPush(
                    candidateUserId,
                    NotificationType.INTERVIEW_HM_CONFIRMED,
                    "Lịch phỏng vấn",
                    "Bạn có lịch phỏng vấn lúc " + formatVi(event.scheduledAt())
                            + ". Vui lòng xác nhận trên hệ thống.",
                    "INTERVIEW",
                    event.interviewId());
        }

        // Nhắc lịch (trước 24 giờ và 1 giờ) do interview-service chủ động phát — xem onInterviewReminder.

        long evalCheckDelay = Duration.between(
                LocalDateTime.now(),
                event.scheduledAt().plusHours(evaluationCheckHoursAfter)).toMillis();
        if (evalCheckDelay > 0) {
            delayedMessagePublisher.scheduleEvaluationCheck(
                    new EvaluationCheckPayload(event.interviewId(), event.scheduledAt()),
                    evalCheckDelay);
        }
    }

    // ===== 5. Interview confirmed =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_CONFIRMED_QUEUE)
    public void onInterviewConfirmed(InterviewConfirmedEvent event) {
        log.info("Nhận event interview.confirmed, interviewId={}", event.interviewId());

        InterviewResponse interview = safeGetInterview(event.interviewId());
        if (interview == null) {
            return;
        }

        if (interview.interviewers() != null) {
            for (InterviewerSummary interviewer : interview.interviewers()) {
                notificationService.createAndPush(
                        interviewer.interviewerId(),
                        NotificationType.INTERVIEW_CONFIRMED,
                        "Ứng viên đã xác nhận lịch phỏng vấn",
                        nullSafe(interview.candidateName()) + " đã xác nhận lịch lúc " + formatVi(event.scheduledAt()) + ".",
                        "INTERVIEW",
                        event.interviewId());
            }
        }
    }

    // ===== 5b. Ứng viên xin dời lịch =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_CANDIDATE_DECLINED_QUEUE)
    public void onInterviewCandidateDeclined(InterviewCandidateDeclinedEvent event) {
        log.info("Nhận event interview.candidate-declined, interviewId={}", event.interviewId());

        java.util.Set<Long> recipients = new java.util.LinkedHashSet<>();
        if (event.interviewerIds() != null) {
            recipients.addAll(event.interviewerIds());
        }
        if (event.assignedRecruiterId() != null) {
            recipients.add(event.assignedRecruiterId());
        } else {
            // Đơn chưa giao người phụ trách → báo mọi Chuyên viên tuyển dụng để có người đặt lại lịch.
            try {
                List<UserSummaryResponse> recruiters = authServiceClient.getUsers("RECRUITER");
                if (recruiters != null) {
                    recruiters.forEach(u -> recipients.add(u.id()));
                }
            } catch (Exception e) {
                log.warn("Không lấy được danh sách RECRUITER: {}", e.getMessage());
            }
        }

        String body = nullSafe(event.candidateName()) + " xin dời buổi phỏng vấn lúc "
                + formatVi(event.scheduledAt()) + ". Lý do: " + nullSafe(event.reason()) + ". Hãy đặt lại giờ mới.";
        for (Long userId : recipients) {
            notificationService.createAndPush(
                    userId,
                    NotificationType.INTERVIEW_CANDIDATE_DECLINED,
                    "Ứng viên xin dời lịch phỏng vấn",
                    body,
                    "INTERVIEW",
                    event.interviewId());
        }
    }

    // ===== 5c. HR huỷ buổi phỏng vấn =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_CANCELLED_QUEUE)
    public void onInterviewCancelled(InterviewCancelledEvent event) {
        log.info("Nhận event interview.cancelled, interviewId={}", event.interviewId());
        String when = formatVi(event.scheduledAt());
        if (event.interviewerIds() != null) {
            for (Long userId : new java.util.LinkedHashSet<>(event.interviewerIds())) {
                if (userId == null || userId.equals(event.actorUserId())) continue; // người huỷ không cần tự báo
                notificationService.createAndPush(
                        userId,
                        NotificationType.INTERVIEW_CANCELLED,
                        "Buổi phỏng vấn đã huỷ",
                        "Buổi phỏng vấn " + nullSafe(event.candidateName()) + " lúc " + when + " đã huỷ.",
                        "INTERVIEW",
                        event.interviewId());
            }
        }
        // Ứng viên chưa từng được báo lịch (giờ còn đang thương lượng nội bộ) thì không báo huỷ.
        if (event.candidateNotified()) {
            Long candidateUserId = resolveCandidateUserIdFromApplication(event.applicationId());
            if (candidateUserId != null) {
                notificationService.createAndPush(
                        candidateUserId,
                        NotificationType.INTERVIEW_CANCELLED,
                        "Lịch phỏng vấn đã huỷ",
                        "Buổi phỏng vấn lúc " + when + " đã huỷ. Bộ phận tuyển dụng sẽ liên hệ nếu có lịch mới.",
                        "INTERVIEW",
                        event.interviewId());
            }
        }
    }

    // ===== 6a. Nhắc phỏng vấn trước 24 giờ / 1 giờ (mục 4.4) =====
    @RabbitListener(queues = BusinessEventConfig.INTERVIEW_REMINDER_QUEUE)
    public void onInterviewReminder(InterviewReminderEvent event) {
        log.info("Nhắc lịch phỏng vấn interviewId={} trước {} giờ", event.interviewId(), event.hoursBefore());
        InterviewResponse interview = safeGetInterview(event.interviewId());
        if (interview == null) {
            return;
        }
        String status = interview.status();
        if (status == null
                || (!"HM_CONFIRMED".equals(status) && !"CANDIDATE_CONFIRMED".equals(status))
                || !isCurrentSchedule(interview, event.scheduledAt())) {
            return; // buổi đã huỷ / đổi giờ sau khi lời nhắc được phát
        }
        String when = event.hoursBefore() <= 1 ? "còn khoảng 1 giờ nữa" : "vào ngày mai";
        String where = "ONLINE".equals(event.format())
                ? (event.meetingLink() == null || event.meetingLink().isBlank()
                        ? " Hình thức: trực tuyến." : " Phòng họp trực tuyến: " + event.meetingLink())
                : " Hình thức: trực tiếp tại văn phòng.";
        String title = event.hoursBefore() <= 1 ? "Sắp đến giờ phỏng vấn" : "Nhắc lịch phỏng vấn ngày mai";

        if (interview.interviewers() != null) {
            for (InterviewerSummary interviewer : interview.interviewers()) {
                notificationService.createAndPush(
                        interviewer.interviewerId(),
                        NotificationType.INTERVIEW_REMINDER,
                        title,
                        "Buổi phỏng vấn " + nullSafe(interview.candidateName()) + " diễn ra " + when
                                + ", lúc " + formatVi(interview.scheduledAt()) + "." + where,
                        "INTERVIEW",
                        event.interviewId());
            }
        }
        Long candidateId = resolveCandidateUserIdFromApplication(event.applicationId());
        if (candidateId != null) {
            notificationService.createAndPush(
                    candidateId,
                    NotificationType.INTERVIEW_REMINDER,
                    title,
                    "Buổi phỏng vấn của bạn diễn ra " + when + ", lúc " + formatVi(interview.scheduledAt()) + "." + where,
                    "INTERVIEW",
                    event.interviewId());
        }
    }

    /** Lời nhắc kiểu cũ (hàng đợi trễ) còn sót trong RabbitMQ: nhận rồi bỏ, việc nhắc nay do onInterviewReminder lo. */
    @RabbitListener(queues = DelayQueueConfig.INTERVIEW_REMINDER_PROCESS_QUEUE)
    public void onInterviewReminderDue(InterviewReminderPayload payload) {
        log.debug("Bỏ qua lời nhắc kiểu cũ, interviewId={}", payload.interviewId());
    }

    // ===== 6b. Kiểm tra đánh giá còn thiếu =====
    @RabbitListener(queues = DelayQueueConfig.EVALUATION_CHECK_PROCESS_QUEUE)
    public void onEvaluationCheckDue(EvaluationCheckPayload payload) {
        log.info("Đến giờ kiểm tra đánh giá, interviewId={}", payload.interviewId());

        InterviewResponse interview = safeGetInterview(payload.interviewId());
        if (interview == null || interview.interviewers() == null
                || !("CANDIDATE_CONFIRMED".equals(interview.status())
                        || "EVALUATION_PENDING".equals(interview.status()))
                || !isCurrentSchedule(interview, payload.expectedScheduledAt())) {
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
                    interview.applicationId());
        } catch (Exception e) {
            log.warn("Không lấy được application summary: {}", e.getMessage());
        }

        for (InterviewerSummary interviewer : interview.interviewers()) {
            if (interviewer.evaluationSubmitted()) {
                continue;
            }

            notificationService.createAndPush(
                    interviewer.interviewerId(),
                    NotificationType.EVALUATION_INCOMPLETE_REMINDER,
                    "Bạn chưa nộp đánh giá phỏng vấn",
                    "Vui lòng hoàn tất đánh giá cho buổi phỏng vấn "
                            + nullSafe(interview.candidateName()) + ".",
                    "INTERVIEW",
                    payload.interviewId());

            if (application != null && application.assignedRecruiterId() != null) {
                String name = interviewer.fullName() != null ? interviewer.fullName() : "Người phỏng vấn";
                notificationService.createAndPush(
                        application.assignedRecruiterId(),
                        NotificationType.EVALUATION_INCOMPLETE_REMINDER,
                        "Người phỏng vấn chưa nộp đánh giá",
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
                    event.requesterId(),
                    NotificationType.OFFER_PENDING_CONFIRMATION,
                    "Thư mời đã gửi cho ứng viên",
                    "Thư mời nhận việc" + forJob(event.jobTitle()) + ofCandidate(candidateNameOf(event.applicationId()))
                            + " đã được gửi, đang chờ ứng viên phản hồi.",
                    "OFFER",
                    event.offerId());
        }

        Long candidateUserId = resolveCandidateUserId(event.candidateId());
        if (candidateUserId == null) {
            candidateUserId = resolveCandidateUserIdFromApplication(event.applicationId());
        }
        if (candidateUserId != null) {
            notificationService.createAndPush(
                    candidateUserId,
                    NotificationType.OFFER_READY_FOR_CANDIDATE,
                    "Bạn nhận được thư mời nhận việc",
                    "Công ty đã gửi thư mời nhận việc" + forJob(event.jobTitle()) + " cho bạn. Hãy xem và phản hồi trước hạn.",
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
                event.requesterId(),
                NotificationType.OFFER_ACCEPTED,
                "Ứng viên đã nhận lời",
                (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                        + " đã chấp nhận thư mời nhận việc" + forJob(event.jobTitle()) + ".",
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
                event.requesterId(),
                NotificationType.OFFER_DECLINED,
                "Ứng viên từ chối thư mời",
                (event.candidateName() != null ? event.candidateName() : "Ứng viên")
                        + " đã từ chối thư mời nhận việc" + forJob(event.jobTitle()) + "." + extra,
                "OFFER",
                event.offerId());
    }

    // ---- helpers ----

    private InterviewResponse safeGetInterview(Long interviewId) {
        try {
            return interviewServiceClient.getInterviewById(interviewId);
        } catch (Exception e) {
            log.warn("Không lấy được interview {}: {}", interviewId, e.getMessage());
            return null;
        }
    }

    /** Bỏ qua lịch hẹn cũ còn nằm trong hàng đợi sau khi HR dời buổi phỏng vấn. */
    private boolean isCurrentSchedule(InterviewResponse interview, LocalDateTime expectedScheduledAt) {
        return interview.scheduledAt() != null
                && expectedScheduledAt != null
                && interview.scheduledAt().truncatedTo(ChronoUnit.SECONDS)
                        .equals(expectedScheduledAt.truncatedTo(ChronoUnit.SECONDS));
    }

    private Long resolveCandidateUserId(Long candidateId) {
        if (candidateId == null) {
            return null;
        }
        try {
            CandidateSummaryResponse c = candidateServiceClient.getCandidateSummary(candidateId);
            return c != null ? c.userId() : null;
        } catch (Exception e) {
            log.warn("resolveCandidateUserId thất bại candidateId={}: {}", candidateId, e.getMessage());
            return null;
        }
    }

    private Long resolveCandidateUserIdFromApplication(Long applicationId) {
        if (applicationId == null) {
            return null;
        }
        try {
            ApplicationSummaryResponse app =
                    applicationServiceClient.getApplicationById(applicationId);
            if (app == null || app.candidateId() == null) {
                return null;
            }
            return resolveCandidateUserId(app.candidateId());
        } catch (Exception e) {
            log.warn("resolveCandidateUserIdFromApplication thất bại applicationId={}: {}",
                    applicationId, e.getMessage());
            return null;
        }
    }

    /** " vị trí X" để ghép vào câu thông báo; không có tên vị trí thì trả chuỗi rỗng. */
    private static String forJob(String jobTitle) {
        return jobTitle == null || jobTitle.isBlank() ? "" : " vị trí " + jobTitle.trim();
    }

    private static String ofCandidate(String name) {
        return name == null || name.isBlank() ? "" : " của " + name.trim();
    }

    private String candidateNameOf(Long applicationId) {
        if (applicationId == null) return null;
        try {
            ApplicationSummaryResponse app = applicationServiceClient.getApplicationById(applicationId);
            return app != null ? app.candidateName() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String nullSafe(String s) {
        return s != null ? s : "";
    }

    private static final DateTimeFormatter VI_DATETIME = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");

    private static String formatVi(LocalDateTime dt) {
        return dt != null ? dt.format(VI_DATETIME) : "";
    }
}
