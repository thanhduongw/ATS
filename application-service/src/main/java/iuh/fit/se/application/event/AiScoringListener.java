package iuh.fit.se.application.event;

import iuh.fit.se.application.application.ApplicationService;
import iuh.fit.se.application.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Giữ bản sao điểm AI trên hồ sơ ứng tuyển để danh sách sắp xếp / lọc theo điểm phía server.
 *
 * <p>Lỗi được ghi log và message vẫn được ack: không có dead-letter queue, ném lại sẽ requeue mãi.
 * Bản sao lệch chỉ ảnh hưởng danh sách; chấm lại hồ sơ sẽ phát sự kiện mới.
 */
@Component
@RequiredArgsConstructor
public class AiScoringListener {

    private static final Logger log = LoggerFactory.getLogger(AiScoringListener.class);

    private final ApplicationService applicationService;

    // [GIẢI THÍCH] Spring tự gọi hàm này mỗi khi hàng đợi application.ai-scoring-completed.queue có tin nhắn
    // (ai-service vừa đổi trạng thái chấm). JSON trong tin nhắn được tự đổi thành AiScoringCompletedEvent.
    // Lỗi chỉ ghi log để tin nhắn được ack, không bị gửi lại vô hạn (hệ thống chưa có dead-letter queue).
    @RabbitListener(queues = RabbitMQConfig.AI_SCORING_COMPLETED_QUEUE)
    public void onAiScoring(AiScoringCompletedEvent event) {
        try {
            applicationService.applyAiScore(event);
        } catch (Exception e) {
            log.error("Khong cap nhat duoc diem AI cho application {}: {}", event.applicationId(), e.getMessage());
        }
    }
}
