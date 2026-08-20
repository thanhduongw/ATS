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

/**
 * GDPR: mỗi công ty tự cấu hình số tháng lưu trữ hồ sơ ứng viên (Company.dataRetentionMonths,
 * null = không giới hạn). Job này ẩn danh hóa (soft-delete) hồ sơ quá hạn theo cấu hình từng tenant.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataRetentionCleanupJob {

    private final CandidateRepository candidateRepository;
    private final AuthServiceClient authServiceClient;
    private final AuditEventPublisher auditEventPublisher;

    @Scheduled(cron = "0 30 2 * * *")
    public void cleanupExpiredCandidates() {
        List<Long> tenantIds = candidateRepository.findDistinctActiveTenantIds();
        for (Long tenantId : tenantIds) {
            cleanupForTenant(tenantId);
        }
    }

    private void cleanupForTenant(Long tenantId) {
        Integer retentionMonths;
        try {
            CompanyResponse company = authServiceClient.getCompany(tenantId);
            retentionMonths = company.dataRetentionMonths();
        } catch (Exception e) {
            log.warn("Bỏ qua dọn dữ liệu tenantId={}: không lấy được cấu hình công ty ({})", tenantId, e.getMessage());
            return;
        }

        if (retentionMonths == null || retentionMonths <= 0) {
            return;
        }

        LocalDateTime threshold = LocalDateTime.now().minusMonths(retentionMonths);
        List<Candidate> expired = candidateRepository
                .findByTenantIdAndDeletedAtIsNullAndCreatedAtBefore(tenantId, threshold);

        if (expired.isEmpty()) return;

        log.info("DataRetentionCleanupJob: xóa {} hồ sơ quá hạn lưu trữ ({} tháng) cho tenantId={}",
                expired.size(), retentionMonths, tenantId);
        purge(tenantId, expired);
    }

    @Transactional
    void purge(Long tenantId, List<Candidate> expired) {
        LocalDateTime now = LocalDateTime.now();
        for (Candidate candidate : expired) {
            candidate.setDeletedAt(now);
            candidateRepository.save(candidate);
            auditEventPublisher.publish(tenantId, null, "CANDIDATE_DATA_RETENTION_EXPIRED",
                    "CANDIDATE", candidate.getId(), null);
        }
    }
}
