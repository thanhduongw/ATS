package iuh.fit.se.masterdata.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ATS_EXCHANGE = "ats.events";
    public static final String TENANT_ACTIVATED_QUEUE = "masterdata.tenant-activated.queue";
    public static final String TENANT_ACTIVATED_ROUTING_KEY = "tenant.activated";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    @Bean
    public Queue tenantActivatedQueue() {
        return new Queue(TENANT_ACTIVATED_QUEUE, true);
    }

    @Bean
    public Binding tenantActivatedBinding(Queue tenantActivatedQueue, TopicExchange atsExchange) {
        return BindingBuilder.bind(tenantActivatedQueue)
                .to(atsExchange)
                .with(TENANT_ACTIVATED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}