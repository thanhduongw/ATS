package iuh.fit.se.offer.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ATS_EXCHANGE = "ats.events";
    public static final String OFFER_APPROVED_ROUTING_KEY = "offer.approved";
    public static final String OFFER_ACCEPTED_ROUTING_KEY = "offer.accepted";
    public static final String OFFER_DECLINED_ROUTING_KEY = "offer.declined";
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