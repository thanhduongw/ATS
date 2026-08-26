package iuh.fit.se.application.application;

import iuh.fit.se.application.event.ApplicationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Workflow automation: nhắc recruiter khi hồ sơ kẹt ở 1 giai đoạn quá 7 ngày mà chưa xử lý.
 * Dùng updatedAt làm mốc "lần thay đổi giai đoạn gần nhất" — chấp nhận việc gán lại recruiter
 * cũng làm mới mốc này, vì đây chỉ là nhắc nhở phụ trợ, không phải số liệu báo cáo chính xác.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StaleApplicationReminderJob {

    private static final int STALE_AFTER_DAYS = 7;
    private static final List<String> TERMINAL_STAGE_TYPES = List.of("HIRED", "REJECTED");

    private final ApplicationRepository applicationRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(cron = "0 0 8 * * *")
    public void remindStaleApplications() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(STALE_AFTER_DAYS);
        List<Application> stale = applicationRepository
                .findByDeletedAtIsNullAndCurrentStageTypeNotInAndUpdatedAtBefore(TERMINAL_STAGE_TYPES, threshold);

        log.info("StaleApplicationReminderJob: tìm thấy {} hồ sơ kẹt quá {} ngày", stale.size(), STALE_AFTER_DAYS);

        for (Application application : stale) {
            if (application.getAssignedRecruiterId() == null) continue;
            long days = Duration.between(application.getUpdatedAt(), LocalDateTime.now()).toDays();
            eventPublisher.publishApplicationStale(
                    application.getTenantId(),
                    application.getId(),
                    application.getAssignedRecruiterId(),
                    application.getCandidateNameSnapshot(),
                    application.getCurrentStageName(),
                    days);
        }
    }
}
