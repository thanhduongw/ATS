package iuh.fit.se.application.config;

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
    public static final String APPLICATION_CREATED_ROUTING_KEY = "application.created";
    public static final String APPLICATION_STATUS_CHANGED_ROUTING_KEY = "application.status_changed";
    public static final String APPLICATION_COMMENT_MENTION_ROUTING_KEY = "application.comment_mention";
    public static final String APPLICATION_STALE_ROUTING_KEY = "application.stale";
    public static final String AUDIT_LOG_ROUTING_KEY = "audit.log";

    /**
     * A candidate accepting or declining an offer must move the application forward, but the
     * candidate is not authorized to call the stage APIs. offer-service therefore publishes the
     * outcome and this service applies the transition itself.
     */
    public static final String OFFER_ACCEPTED_QUEUE = "application.offer-accepted.queue";
    public static final String OFFER_DECLINED_QUEUE = "application.offer-declined.queue";
    public static final String OFFER_ACCEPTED_ROUTING_KEY = "offer.accepted";
    public static final String OFFER_DECLINED_ROUTING_KEY = "offer.declined";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public Queue offerAcceptedQueue() {
        return QueueBuilder.durable(OFFER_ACCEPTED_QUEUE).build();
    }

    @Bean
    public Binding offerAcceptedBinding(Queue offerAcceptedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(offerAcceptedQueue).to(atsExchange).with(OFFER_ACCEPTED_ROUTING_KEY);
    }

    @Bean
    public Queue offerDeclinedQueue() {
        return QueueBuilder.durable(OFFER_DECLINED_QUEUE).build();
    }

    @Bean
    public Binding offerDeclinedBinding(Queue offerDeclinedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(offerDeclinedQueue).to(atsExchange).with(OFFER_DECLINED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
