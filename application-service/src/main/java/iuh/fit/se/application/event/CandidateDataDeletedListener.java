package iuh.fit.se.application.event;

import iuh.fit.se.application.application.ApplicationService;
import iuh.fit.se.application.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Ẩn danh hoá đơn ứng tuyển khi ứng viên xoá dữ liệu cá nhân: đóng các đơn còn mở, đổi tên thành
 * "Ứng viên đã xoá dữ liệu", xoá email và liên kết CV. Số liệu thống kê (số đơn, giai đoạn) giữ nguyên.
 * Lỗi chỉ ghi log và message vẫn được ack (không có dead-letter queue).
 */
@Component
@RequiredArgsConstructor
public class CandidateDataDeletedListener {

    private static final Logger log = LoggerFactory.getLogger(CandidateDataDeletedListener.class);

    private final ApplicationService applicationService;

    @RabbitListener(queues = RabbitMQConfig.CANDIDATE_DATA_DELETED_QUEUE)
    public void onCandidateDataDeleted(CandidateDataDeletedEvent event) {
        try {
            int n = applicationService.anonymizeCandidate(event.candidateId(), event.userId());
            log.info("Da an danh hoa {} don ung tuyen cua ung vien {}", n, event.candidateId());
        } catch (Exception e) {
            log.error("Khong an danh hoa duoc don cua ung vien {}: {}", event.candidateId(), e.getMessage());
        }
    }
}
