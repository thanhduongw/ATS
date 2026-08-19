package iuh.fit.se.dashboard.dashboard;

import iuh.fit.se.dashboard.client.ApplicationServiceClient;
import iuh.fit.se.dashboard.client.CandidateServiceClient;
import iuh.fit.se.dashboard.client.RecruitmentServiceClient;
import iuh.fit.se.dashboard.client.dto.ApplicationSummary;
import iuh.fit.se.dashboard.client.dto.CandidateSummary;
import iuh.fit.se.dashboard.client.dto.PostingSummary;
import iuh.fit.se.dashboard.client.dto.RequisitionSummary;
import iuh.fit.se.dashboard.dashboard.dto.DashboardSummaryResponse;
import iuh.fit.se.dashboard.dashboard.dto.FunnelMetrics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Set<String> ACTIVE_REQUISITION_STATUSES =
            Set.of("PENDING_APPROVAL", "APPROVED");

    private final RecruitmentServiceClient recruitmentServiceClient;
    private final CandidateServiceClient candidateServiceClient;
    private final ApplicationServiceClient applicationServiceClient;

    public DashboardSummaryResponse getSummary(Long tenantId, Long userId, String role) {
        String safeRole = role != null ? role : "COMPANY_ADMIN";
        Long safeUserId = userId != null ? userId : 0L;

        List<RequisitionSummary> requisitions = safeList(
                () -> recruitmentServiceClient.getRequisitions(tenantId, safeRole));
        List<PostingSummary> postings = safeList(
                () -> recruitmentServiceClient.getPostings(tenantId, safeRole));
        List<CandidateSummary> candidates = safeList(
                () -> candidateServiceClient.getCandidates(tenantId).content());
        List<ApplicationSummary> applications = safeList(
                () -> applicationServiceClient.getApplications(tenantId, safeUserId, safeRole).content());

        long openPostings = postings.stream()
                .filter(p -> p.status() != null && "OPEN".equalsIgnoreCase(p.status()))
                .count();
        long activeRequisitions = requisitions.stream()
                .filter(r -> r.status() != null && ACTIVE_REQUISITION_STATUSES.contains(r.status()))
                .count();

        long hired = applications.stream()
                .filter(a -> "HIRED".equalsIgnoreCase(nullSafe(a.currentStageType())))
                .count();
        long rejected = applications.stream()
                .filter(a -> "REJECTED".equalsIgnoreCase(nullSafe(a.currentStageType())))
                .count();
        long totalApplications = applications.size();

        double successRate = totalApplications == 0
                ? 0.0
                : (hired * 100.0) / totalApplications;

        Map<String, Long> applicationsByStage = applications.stream()
                .collect(Collectors.groupingBy(
                        a -> a.currentStageName() != null && !a.currentStageName().isBlank()
                                ? a.currentStageName()
                                : "Unknown",
                        Collectors.counting()
                ));

        long interviews = applications.stream().filter(this::isInterviewStage).count();
        long offers = applications.stream().filter(this::isOfferStage).count();

        FunnelMetrics funnel = new FunnelMetrics(
                requisitions.size(),
                postings.size(),
                totalApplications,
                interviews,
                offers,
                hired
        );

        return new DashboardSummaryResponse(
                openPostings,
                activeRequisitions,
                candidates.size(),
                totalApplications,
                hired,
                rejected,
                Math.round(successRate * 100.0) / 100.0,
                applicationsByStage,
                funnel
        );
    }

    private boolean isInterviewStage(ApplicationSummary a) {
        String type = nullSafe(a.currentStageType()).toUpperCase();
        String name = nullSafe(a.currentStageName()).toLowerCase();
        return type.contains("INTERVIEW")
                || name.contains("phỏng vấn")
                || name.contains("interview");
    }

    private boolean isOfferStage(ApplicationSummary a) {
        String type = nullSafe(a.currentStageType()).toUpperCase();
        String name = nullSafe(a.currentStageName()).toLowerCase();
        return type.contains("OFFER")
                || name.contains("offer")
                || name.contains("đề nghị");
    }

    private static String nullSafe(String s) {
        return s != null ? s : "";
    }

    private static <T> List<T> safeList(java.util.function.Supplier<List<T>> supplier) {
        try {
            List<T> list = supplier.get();
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Dashboard aggregate thất bại: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            return Collections.emptyList();
        }
    }
}