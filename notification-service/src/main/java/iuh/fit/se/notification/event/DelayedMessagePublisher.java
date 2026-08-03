package iuh.fit.se.notification.event;

import iuh.fit.se.notification.config.DelayQueueConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DelayedMessagePublisher {

    private final RabbitTemplate rabbitTemplate;

    public void scheduleInterviewReminder(InterviewReminderPayload payload, long delayMillis) {
        if (delayMillis <= 0) return; // đã quá giờ nhắc, bỏ qua
        rabbitTemplate.convertAndSend("", DelayQueueConfig.INTERVIEW_REMINDER_DELAY_QUEUE, payload, message -> {
            message.getMessageProperties().setExpiration(String.valueOf(delayMillis));
            return message;
        });
    }

    public void scheduleEvaluationCheck(EvaluationCheckPayload payload, long delayMillis) {
        if (delayMillis <= 0) return;
        rabbitTemplate.convertAndSend("", DelayQueueConfig.EVALUATION_CHECK_DELAY_QUEUE, payload, message -> {
            message.getMessageProperties().setExpiration(String.valueOf(delayMillis));
            return message;
        });
    }
}