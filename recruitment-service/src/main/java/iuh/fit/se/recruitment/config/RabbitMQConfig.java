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
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}