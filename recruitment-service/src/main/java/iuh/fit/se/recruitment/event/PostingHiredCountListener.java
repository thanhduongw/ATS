package iuh.fit.se.recruitment.event;

import iuh.fit.se.recruitment.config.RabbitMQConfig;
import iuh.fit.se.recruitment.posting.JobPostingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Ứng viên nhận thư mời → nếu số đã nhận đủ chỉ tiêu của tin thì đóng tin (gỡ khỏi trang tuyển dụng). */
@Slf4j
@Component
@RequiredArgsConstructor
public class PostingHiredCountListener {

    private final JobPostingService jobPostingService;

    @RabbitListener(queues = RabbitMQConfig.POSTING_HIRED_COUNT_QUEUE)
    public void handle(PostingHiredCountEvent event) {
        if (event.jobPostingId() == null) return;
        jobPostingService.closeIfFilled(event.jobPostingId(), event.acceptedCount());
    }
}
