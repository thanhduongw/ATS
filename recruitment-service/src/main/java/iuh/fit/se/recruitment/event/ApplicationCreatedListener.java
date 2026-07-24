package iuh.fit.se.recruitment.event;

import iuh.fit.se.recruitment.config.RabbitMQConfig;
import iuh.fit.se.recruitment.posting.JobPosting;
import iuh.fit.se.recruitment.posting.JobPostingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApplicationCreatedListener {

    private final JobPostingRepository jobPostingRepository;

    @RabbitListener(queues = RabbitMQConfig.APPLICATION_CREATED_QUEUE)
    @Transactional
    public void handle(ApplicationCreatedEvent event) {
        log.info("Nhận event application.created cho jobPostingId={}", event.jobPostingId());
        jobPostingRepository.findById(event.jobPostingId()).ifPresent(posting -> {
            if (!posting.isPipelineLocked()) {
                posting.setPipelineLocked(true);
                jobPostingRepository.save(posting);
                log.info("Đã khóa Pipeline của Job Posting id={}", posting.getId());
            }
        });
    }
}