package iuh.fit.se.recruitment.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ATS_EXCHANGE = "ats.events";
    public static final String APPLICATION_CREATED_QUEUE = "recruitment.application-created.queue";
    public static final String APPLICATION_CREATED_ROUTING_KEY = "application.created";
    public static final String REQUISITION_SUBMITTED_ROUTING_KEY = "requisition.submitted";
    public static final String REQUISITION_REVIEWED_ROUTING_KEY = "requisition.reviewed";
    public static final String AUDIT_LOG_ROUTING_KEY = "audit.log";
    /** offer-service phát khi ứng viên nhận thư mời — đủ chỉ tiêu thì tự đóng tin (26/11/2026). */
    public static final String POSTING_HIRED_COUNT_QUEUE = "recruitment.posting-hired-count.queue";
    public static final String POSTING_HIRED_COUNT_ROUTING_KEY = "posting.hired_count";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public Queue applicationCreatedQueue() {
        return new Queue(APPLICATION_CREATED_QUEUE, true);
    }

    @Bean
    public Binding applicationCreatedBinding(Queue applicationCreatedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(applicationCreatedQueue).to(atsExchange).with(APPLICATION_CREATED_ROUTING_KEY);
    }

    @Bean
    public Queue postingHiredCountQueue() {
        return new Queue(POSTING_HIRED_COUNT_QUEUE, true);
    }

    @Bean
    public Binding postingHiredCountBinding(Queue postingHiredCountQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(postingHiredCountQueue).to(atsExchange).with(POSTING_HIRED_COUNT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}