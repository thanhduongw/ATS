package iuh.fit.se.interview.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String ATS_EXCHANGE = "ats.events";
    public static final String INTERVIEW_SCHEDULED_ROUTING_KEY = "interview.scheduled";
    public static final String INTERVIEW_HM_CONFIRMED_ROUTING_KEY = "interview.hm-confirmed";
    public static final String INTERVIEW_CONFIRMED_ROUTING_KEY = "interview.confirmed";
    public static final String INTERVIEW_CANDIDATE_DECLINED_ROUTING_KEY = "interview.candidate-declined";
    /** Nghe trạng thái hồ sơ để huỷ lịch còn treo khi hồ sơ kết thúc (xem ApplicationClosedListener). */
    public static final String APPLICATION_STATUS_CHANGED_QUEUE = "interview.application-status-changed.queue";
    public static final String APPLICATION_STATUS_CHANGED_ROUTING_KEY = "application.status_changed";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public Queue interviewApplicationStatusChangedQueue() {
        return new Queue(APPLICATION_STATUS_CHANGED_QUEUE, true);
    }

    @Bean
    public Binding interviewApplicationStatusChangedBinding(
            Queue interviewApplicationStatusChangedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(interviewApplicationStatusChangedQueue)
                .to(atsExchange).with(APPLICATION_STATUS_CHANGED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}