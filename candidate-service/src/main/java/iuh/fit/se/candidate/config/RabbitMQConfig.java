package iuh.fit.se.candidate.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ATS_EXCHANGE = "ats.events";
    public static final String AUDIT_LOG_ROUTING_KEY = "audit.log";
    public static final String CANDIDATE_REGISTERED_QUEUE = "candidate.registered.queue";
    public static final String CANDIDATE_REGISTERED_ROUTING_KEY = "candidate.registered";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public Queue candidateRegisteredQueue() {
        return QueueBuilder.durable(CANDIDATE_REGISTERED_QUEUE).build();
    }

    @Bean
    public Binding candidateRegisteredBinding(
            Queue candidateRegisteredQueue,
            TopicExchange atsExchange
    ) {
        return BindingBuilder.bind(candidateRegisteredQueue)
                .to(atsExchange)
                .with(CANDIDATE_REGISTERED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
