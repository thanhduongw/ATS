package iuh.fit.se.interview.event;

import iuh.fit.se.interview.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class InterviewEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishInterviewScheduled(Long tenantId, Long interviewId, Long applicationId, LocalDateTime scheduledAt) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.INTERVIEW_SCHEDULED_ROUTING_KEY,
                new InterviewScheduledEvent(tenantId, interviewId, applicationId, scheduledAt)
        );
    }

    public void publishInterviewConfirmed(
            Long tenantId, Long interviewId, Long applicationId, LocalDateTime scheduledAt, String candidateName) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.INTERVIEW_CONFIRMED_ROUTING_KEY,
                new InterviewConfirmedEvent(tenantId, interviewId, applicationId, scheduledAt, candidateName)
        );
    }
}