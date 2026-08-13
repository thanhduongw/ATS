package iuh.fit.se.interview.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String ATS_EXCHANGE = "ats.events";
    public static final String INTERVIEW_SCHEDULED_ROUTING_KEY = "interview.scheduled";
    public static final String INTERVIEW_CONFIRMED_ROUTING_KEY = "interview.confirmed";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}