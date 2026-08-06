package iuh.fit.se.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DelayQueueConfig {

    public static final String INTERNAL_EXCHANGE = "notification.internal.exchange";

    public static final String INTERVIEW_REMINDER_DELAY_QUEUE = "notification.interview-reminder.delay.queue";
    public static final String INTERVIEW_REMINDER_PROCESS_QUEUE = "notification.interview-reminder.process.queue";
    public static final String INTERVIEW_REMINDER_ROUTING_KEY = "interview.reminder.due";

    public static final String EVALUATION_CHECK_DELAY_QUEUE = "notification.evaluation-check.delay.queue";
    public static final String EVALUATION_CHECK_PROCESS_QUEUE = "notification.evaluation-check.process.queue";
    public static final String EVALUATION_CHECK_ROUTING_KEY = "evaluation.check.due";

    @Bean
    public TopicExchange internalExchange() {
        return new TopicExchange(INTERNAL_EXCHANGE);
    }

    // Queue "chờ" — KHÔNG đặt TTL cố định ở đây vì mỗi lịch phỏng vấn có thời gian nhắc khác nhau
    // (TTL sẽ được set riêng cho từng message lúc publish — xem DelayedMessagePublisher)
    @Bean
    public Queue interviewReminderDelayQueue() {
        return QueueBuilder.durable(INTERVIEW_REMINDER_DELAY_QUEUE)
                .withArgument("x-dead-letter-exchange", INTERNAL_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", INTERVIEW_REMINDER_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue interviewReminderProcessQueue() {
        return QueueBuilder.durable(INTERVIEW_REMINDER_PROCESS_QUEUE).build();
    }

    @Bean
    public Binding interviewReminderBinding(Queue interviewReminderProcessQueue, TopicExchange internalExchange) {
        return BindingBuilder.bind(interviewReminderProcessQueue).to(internalExchange).with(INTERVIEW_REMINDER_ROUTING_KEY);
    }

    @Bean
    public Queue evaluationCheckDelayQueue() {
        return QueueBuilder.durable(EVALUATION_CHECK_DELAY_QUEUE)
                .withArgument("x-dead-letter-exchange", INTERNAL_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", EVALUATION_CHECK_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue evaluationCheckProcessQueue() {
        return QueueBuilder.durable(EVALUATION_CHECK_PROCESS_QUEUE).build();
    }

    @Bean
    public Binding evaluationCheckBinding(Queue evaluationCheckProcessQueue, TopicExchange internalExchange) {
        return BindingBuilder.bind(evaluationCheckProcessQueue).to(internalExchange).with(EVALUATION_CHECK_ROUTING_KEY);
    }
}