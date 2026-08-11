package iuh.fit.se.application.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ATS_EXCHANGE = "ats.events";
    public static final String APPLICATION_CREATED_ROUTING_KEY = "application.created";
    public static final String APPLICATION_STATUS_CHANGED_ROUTING_KEY = "application.status_changed";
    public static final String AUDIT_LOG_ROUTING_KEY = "audit.log";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
