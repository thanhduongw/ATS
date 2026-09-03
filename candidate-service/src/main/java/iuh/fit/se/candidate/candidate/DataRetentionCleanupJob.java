package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.client.AuthServiceClient;
import iuh.fit.se.candidate.client.dto.CompanyResponse;
import iuh.fit.se.candidate.event.AuditEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataRetentionCleanupJob {

    private final CandidateRepository candidateRepository;
    private final AuthServiceClient authServiceClient;
    private final AuditEventPublisher auditEventPublisher;

    @Scheduled(cron = "0 30 2 * * *")
    public void cleanupExpiredCandidates() {
        Integer retentionMonths;
        try {
            CompanyResponse company = authServiceClient.getCompany();
            retentionMonths = company.dataRetentionMonths();
        } catch (Exception e) {
            log.warn("Cannot load company data-retention configuration: {}", e.getMessage());
            return;
        }

        if (retentionMonths == null || retentionMonths <= 0) return;

        LocalDateTime threshold = LocalDateTime.now().minusMonths(retentionMonths);
        List<Candidate> expired = candidateRepository.findByDeletedAtIsNullAndCreatedAtBefore(threshold);
        if (!expired.isEmpty()) purge(expired);
    }

    @Transactional
    void purge(List<Candidate> expired) {
        LocalDateTime now = LocalDateTime.now();
        for (Candidate candidate : expired) {
            candidate.setDeletedAt(now);
            candidateRepository.save(candidate);
            auditEventPublisher.publish(null, "CANDIDATE_DATA_RETENTION_EXPIRED",
                    "CANDIDATE", candidate.getId(), null);
        }
    }
}
