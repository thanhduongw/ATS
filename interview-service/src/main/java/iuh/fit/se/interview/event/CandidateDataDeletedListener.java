package iuh.fit.se.interview.event;

import iuh.fit.se.interview.config.RabbitMQConfig;
import iuh.fit.se.interview.interview.InterviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Ứng viên xoá dữ liệu cá nhân: đổi tên trong các buổi phỏng vấn thành "Ứng viên đã xoá dữ liệu". */
@Slf4j
@Component
@RequiredArgsConstructor
public class CandidateDataDeletedListener {

    private final InterviewRepository interviewRepository;

    @RabbitListener(queues = RabbitMQConfig.CANDIDATE_DATA_DELETED_QUEUE)
    public void onCandidateDataDeleted(CandidateDataDeletedEvent event) {
        if (event == null || event.candidateId() == null) return;
        try {
            int n = interviewRepository.anonymizeCandidate(event.candidateId(), "Ứng viên đã xoá dữ liệu");
            log.info("Da an danh hoa {} buoi phong van cua ung vien {}", n, event.candidateId());
        } catch (Exception e) {
            log.error("Khong an danh hoa duoc lich phong van cua ung vien {}: {}", event.candidateId(), e.getMessage());
        }
    }
}
