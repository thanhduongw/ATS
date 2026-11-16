package iuh.fit.se.candidate.event;

import iuh.fit.se.candidate.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AuditEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    /** Phát sau khi giao dịch ghi xong để bên nhận không đọc phải dữ liệu chưa ẩn danh. */
    public void publishCandidateDataDeleted(Long candidateId, Long userId) {
        Runnable send = () -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.CANDIDATE_DATA_DELETED_ROUTING_KEY,
                new CandidateDataDeletedEvent(candidateId, userId));
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            send.run();
                        }
                    });
        } else {
            send.run();
        }
    }

    public void publish(Long actorUserId, String action, String resourceType, Long resourceId, String metadata) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.AUDIT_LOG_ROUTING_KEY,
                new AuditEvent(actorUserId, action, resourceType, resourceId, metadata, LocalDateTime.now())
        );
    }
}