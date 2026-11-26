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
    /** Số thư mời đã được nhận của một tin — recruitment-service tự đóng tin khi đủ chỉ tiêu (26/11/2026). */
    public static final String POSTING_HIRED_COUNT_ROUTING_KEY = "posting.hired_count";
    public static final String AUDIT_LOG_ROUTING_KEY = "audit.log";

    @Bean
    public TopicExchange atsExchange() {
        return new TopicExchange(ATS_EXCHANGE);
    }

    /** Ứng viên tự xoá dữ liệu cá nhân (candidate-service phát) — đổi tên, xoá liên hệ của ứng viên trong thư mời. */
    public static final String CANDIDATE_DATA_DELETED_QUEUE = "offer.candidate-data-deleted.queue";
    public static final String CANDIDATE_DATA_DELETED_ROUTING_KEY = "candidate.data_deleted";

    @Bean
    public org.springframework.amqp.core.Queue candidateDataDeletedQueue() {
        return org.springframework.amqp.core.QueueBuilder.durable(CANDIDATE_DATA_DELETED_QUEUE).build();
    }

    @Bean
    public org.springframework.amqp.core.Binding candidateDataDeletedBinding(
            org.springframework.amqp.core.Queue candidateDataDeletedQueue, TopicExchange atsExchange) {
        return org.springframework.amqp.core.BindingBuilder.bind(candidateDataDeletedQueue)
                .to(atsExchange).with(CANDIDATE_DATA_DELETED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}