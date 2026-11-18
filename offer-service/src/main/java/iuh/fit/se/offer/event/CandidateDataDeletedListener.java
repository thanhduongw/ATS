package iuh.fit.se.offer.event;

import iuh.fit.se.offer.config.RabbitMQConfig;
import iuh.fit.se.offer.offer.OfferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Ứng viên xoá dữ liệu cá nhân: đổi tên, xoá email và số điện thoại trong các thư mời. */
@Slf4j
@Component
@RequiredArgsConstructor
public class CandidateDataDeletedListener {

    private final OfferRepository offerRepository;

    @RabbitListener(queues = RabbitMQConfig.CANDIDATE_DATA_DELETED_QUEUE)
    public void onCandidateDataDeleted(CandidateDataDeletedEvent event) {
        if (event == null || event.candidateId() == null) return;
        try {
            int n = offerRepository.anonymizeCandidate(event.candidateId(), "Ứng viên đã xoá dữ liệu");
            log.info("Da an danh hoa {} thu moi cua ung vien {}", n, event.candidateId());
        } catch (Exception e) {
            log.error("Khong an danh hoa duoc thu moi cua ung vien {}: {}", event.candidateId(), e.getMessage());
        }
    }
}
