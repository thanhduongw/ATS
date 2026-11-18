package iuh.fit.se.recruitment.event;

import iuh.fit.se.recruitment.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
@RequiredArgsConstructor
public class RequisitionEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishSubmitted(Long requisitionId, Long approverId, String title) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.REQUISITION_SUBMITTED_ROUTING_KEY,
                new RequisitionSubmittedEvent(requisitionId, approverId, title)
        );
    }

    /** Duyệt / từ chối / yêu cầu sửa — phát sau khi lưu xong để người nhận mở ra thấy đúng trạng thái mới. */
    public void publishReviewed(RequisitionReviewedEvent event) {
        Runnable send = () -> {
            try {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.ATS_EXCHANGE, RabbitMQConfig.REQUISITION_REVIEWED_ROUTING_KEY, event);
            } catch (RuntimeException ignored) {
                // Thông báo là phụ: lỗi gửi không làm hỏng thao tác duyệt.
            }
        };
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
            return;
        }
        send.run();
    }
}
