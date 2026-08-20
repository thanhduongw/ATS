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
import iuh.fit.se.dashboard.dashboard.dto.RecruiterPerformance;
import iuh.fit.se.dashboard.dashboard.dto.SourceEffectiveness;
import iuh.fit.se.dashboard.dashboard.dto.StageConversion;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Comparator;
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

    public DashboardSummaryResponse getSummary(Long tenantId, Long userId, String role, LocalDate from, LocalDate to) {
        String safeRole = role != null ? role : "COMPANY_ADMIN";
        Long safeUserId = userId != null ? userId : 0L;

        List<RequisitionSummary> requisitions = safeList(
                () -> recruitmentServiceClient.getRequisitions(tenantId, safeUserId, safeRole).content());
        List<PostingSummary> postings = safeList(
                () -> recruitmentServiceClient.getPostings(tenantId, safeRole).content());
        List<CandidateSummary> candidates = safeList(
                () -> candidateServiceClient.getCandidates(tenantId).content());
        List<ApplicationSummary> applications = safeList(
                () -> applicationServiceClient.getApplications(tenantId, safeUserId, safeRole, from, to).content());

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

        Double avgTimeToHireDays = computeAvgTimeToHire(applications);
        List<SourceEffectiveness> sourceEffectiveness = computeSourceEffectiveness(applications);
        List<StageConversion> pipelineConversion = computeStageConversion(applications, totalApplications);
        List<RecruiterPerformance> recruiterPerformance = computeRecruiterPerformance(applications);

        return new DashboardSummaryResponse(
                openPostings,
                activeRequisitions,
                candidates.size(),
                totalApplications,
                hired,
                rejected,
                Math.round(successRate * 100.0) / 100.0,
                applicationsByStage,
                funnel,
                avgTimeToHireDays,
                sourceEffectiveness,
                pipelineConversion,
                recruiterPerformance
        );
    }

    /** Trung bình số ngày từ appliedAt đến hiredAt, chỉ tính các hồ sơ đã hired và có đủ 2 mốc thời gian. */
    private Double computeAvgTimeToHire(List<ApplicationSummary> applications) {
        List<Double> days = applications.stream()
                .filter(a -> a.appliedAt() != null && a.hiredAt() != null)
                .map(a -> Duration.between(a.appliedAt(), a.hiredAt()).toHours() / 24.0)
                .toList();
        if (days.isEmpty()) return null;
        double avg = days.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        return Math.round(avg * 10.0) / 10.0;
    }

    private List<SourceEffectiveness> computeSourceEffectiveness(List<ApplicationSummary> applications) {
        Map<String, List<ApplicationSummary>> bySource = applications.stream()
                .collect(Collectors.groupingBy(a ->
                        a.recruitmentSourceName() != null && !a.recruitmentSourceName().isBlank()
                                ? a.recruitmentSourceName() : "Không rõ"));

        return bySource.entrySet().stream()
                .map(e -> {
                    long total = e.getValue().size();
                    long hiredCount = e.getValue().stream()
                            .filter(a -> "HIRED".equalsIgnoreCase(nullSafe(a.currentStageType())))
                            .count();
                    double rate = total == 0 ? 0.0 : Math.round((hiredCount * 1000.0) / total) / 10.0;
                    return new SourceEffectiveness(e.getKey(), total, hiredCount, rate);
                })
                .sorted(Comparator.comparingLong(SourceEffectiveness::totalApplications).reversed())
                .toList();
    }

    /** Funnel tích lũy: với mỗi stageOrder xuất hiện, đếm số hồ sơ đang ở stage đó hoặc đã đi xa hơn. */
    private List<StageConversion> computeStageConversion(List<ApplicationSummary> applications, long total) {
        if (total == 0) return List.of();

        Map<Integer, String> orderToName = applications.stream()
                .filter(a -> a.currentStageOrder() != null && a.currentStageName() != null)
                .collect(Collectors.toMap(
                        ApplicationSummary::currentStageOrder, ApplicationSummary::currentStageName, (a, b) -> a));

        return orderToName.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    long reached = applications.stream()
                            .filter(a -> a.currentStageOrder() != null && a.currentStageOrder() >= e.getKey())
                            .count();
                    double percent = Math.round((reached * 1000.0) / total) / 10.0;
                    return new StageConversion(e.getValue(), e.getKey(), reached, percent);
                })
                .toList();
    }

    private List<RecruiterPerformance> computeRecruiterPerformance(List<ApplicationSummary> applications) {
        Map<String, List<ApplicationSummary>> byRecruiter = applications.stream()
                .filter(a -> a.assignedRecruiterName() != null && !a.assignedRecruiterName().isBlank())
                .collect(Collectors.groupingBy(ApplicationSummary::assignedRecruiterName));

        return byRecruiter.entrySet().stream()
                .map(e -> {
                    long total = e.getValue().size();
                    long hiredCount = e.getValue().stream()
                            .filter(a -> "HIRED".equalsIgnoreCase(nullSafe(a.currentStageType())))
                            .count();
                    double rate = total == 0 ? 0.0 : Math.round((hiredCount * 1000.0) / total) / 10.0;
                    return new RecruiterPerformance(e.getKey(), total, hiredCount, rate);
                })
                .sorted(Comparator.comparingLong(RecruiterPerformance::totalHandled).reversed())
                .toList();
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