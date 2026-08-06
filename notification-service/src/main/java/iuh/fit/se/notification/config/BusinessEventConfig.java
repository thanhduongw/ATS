package iuh.fit.se.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BusinessEventConfig {

    public static final String ATS_EXCHANGE = "ats.events";

    public static final String INTERVIEW_SCHEDULED_QUEUE = "notification.interview-scheduled.queue";
    public static final String REQUISITION_SUBMITTED_QUEUE = "notification.requisition-submitted.queue";
    public static final String OFFER_APPROVED_QUEUE = "notification.offer-approved.queue";
    public static final String AUDIT_LOG_QUEUE = "notification.audit-log.queue";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public Queue interviewScheduledQueue() {
        return new Queue(INTERVIEW_SCHEDULED_QUEUE, true);
    }

    @Bean
    public Binding interviewScheduledBinding(Queue interviewScheduledQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(interviewScheduledQueue).to(atsExchange).with("interview.scheduled");
    }

    @Bean
    public Queue requisitionSubmittedQueue() {
        return new Queue(REQUISITION_SUBMITTED_QUEUE, true);
    }

    @Bean
    public Binding requisitionSubmittedBinding(Queue requisitionSubmittedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(requisitionSubmittedQueue).to(atsExchange).with("requisition.submitted");
    }

    @Bean
    public Queue offerApprovedQueue() {
        return new Queue(OFFER_APPROVED_QUEUE, true);
    }

    @Bean
    public Binding offerApprovedBinding(Queue offerApprovedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(offerApprovedQueue).to(atsExchange).with("offer.approved");
    }

    @Bean
    public Queue auditLogQueue() {
        return new Queue(AUDIT_LOG_QUEUE, true);
    }

    @Bean
    public Binding auditLogBinding(Queue auditLogQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(auditLogQueue).to(atsExchange).with("audit.log");
    }
}