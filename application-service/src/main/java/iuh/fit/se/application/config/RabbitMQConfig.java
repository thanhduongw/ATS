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

    /** Published to ai-service when a new application with CV is created. */
    public static final String AI_CV_UPLOADED_QUEUE = "ai.cv-uploaded.queue";
    public static final String AI_CV_UPLOADED_ROUTING_KEY = "ai.cv-uploaded";

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
    public Queue aiCvUploadedQueue() {
        return QueueBuilder.durable(AI_CV_UPLOADED_QUEUE).build();
    }

    @Bean
    public Binding aiCvUploadedBinding(Queue aiCvUploadedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(aiCvUploadedQueue).to(atsExchange).with(AI_CV_UPLOADED_ROUTING_KEY);
    }

    /** Consumed by this service when ai-service finishes scoring an application. */
    public static final String AI_SCORING_COMPLETED_QUEUE = "application.ai-scoring-completed.queue";
    public static final String AI_SCORING_COMPLETED_ROUTING_KEY = "ai.scoring.completed";

    @Bean
    public Queue aiScoringCompletedQueue() {
        return QueueBuilder.durable(AI_SCORING_COMPLETED_QUEUE).build();
    }

    @Bean
    public Binding aiScoringCompletedBinding(Queue aiScoringCompletedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(aiScoringCompletedQueue).to(atsExchange).with(AI_SCORING_COMPLETED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
