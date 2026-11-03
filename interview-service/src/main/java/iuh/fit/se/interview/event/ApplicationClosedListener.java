package iuh.fit.se.interview.event;

import iuh.fit.se.interview.config.RabbitMQConfig;
import iuh.fit.se.interview.interview.InterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Hồ sơ kết thúc bằng Từ chối (HR từ chối hoặc ứng viên tự rút đơn — docs/UI UC06, quyết định B5)
 * thì huỷ các buổi phỏng vấn và khung giờ còn treo, để người phỏng vấn không phải dự một buổi
 * không còn ứng viên.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApplicationClosedListener {

    private final InterviewService interviewService;

    @RabbitListener(queues = RabbitMQConfig.APPLICATION_STATUS_CHANGED_QUEUE)
    public void onApplicationStatusChanged(ApplicationStatusChangedEvent event) {
        if (event == null || event.applicationId() == null) return;
        if (!"REJECTED".equalsIgnoreCase(event.toStageType())) return;
        int cancelled = interviewService.cancelOpenForClosedApplication(event.applicationId());
        if (cancelled > 0) {
            log.info("Hồ sơ {} đã kết thúc, huỷ {} buổi phỏng vấn / khung giờ còn treo",
                    event.applicationId(), cancelled);
        }
    }
}
