package iuh.fit.se.candidate.event;

import iuh.fit.se.candidate.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Phát sự kiện ứng viên cho ai-service. Gửi SAU KHI giao dịch commit (tránh báo CV/xóa rồi giao dịch rollback)
 * và best-effort: lỗi RabbitMQ chỉ ghi log, không làm hỏng thao tác của người dùng.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CandidateEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishCvUploaded(Long candidateId, String resumeUrl) {
        afterCommit(() -> send(RabbitMQConfig.CV_UPLOADED_ROUTING_KEY, new CvUploadedEvent(candidateId, resumeUrl)));
    }

    public void publishCandidateDeleted(Long candidateId) {
        afterCommit(() -> send(RabbitMQConfig.CANDIDATE_DELETED_ROUTING_KEY, new CandidateDeletedEvent(candidateId)));
    }

    private void send(String routingKey, Object event) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.ATS_EXCHANGE, routingKey, event);
        } catch (Exception e) {
            log.warn("Không phát được sự kiện {}: {}", routingKey, e.getMessage());
        }
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
