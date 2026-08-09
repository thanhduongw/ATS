package iuh.fit.se.dashboard.dashboard;

import iuh.fit.se.dashboard.client.CandidateServiceClient;
import iuh.fit.se.dashboard.client.RecruitmentServiceClient;
import iuh.fit.se.dashboard.client.dto.ApplicationSummary;
import iuh.fit.se.dashboard.client.dto.CandidateSummary;
import iuh.fit.se.dashboard.client.dto.PostingSummary;
import iuh.fit.se.dashboard.client.dto.RequisitionSummary;
import iuh.fit.se.dashboard.dashboard.dto.DashboardSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Set<String> ACTIVE_REQUISITION_STATUSES = Set.of("PENDING_APPROVAL", "APPROVED");

    private final RecruitmentServiceClient recruitmentServiceClient;
    private final CandidateServiceClient candidateServiceClient;

    public DashboardSummaryResponse getSummary() {
        List<RequisitionSummary> requisitions = recruitmentServiceClient.getRequisitions();
        List<PostingSummary> postings = recruitmentServiceClient.getPostings();
        List<CandidateSummary> candidates = candidateServiceClient.getCandidates();
        List<ApplicationSummary> applications = candidateServiceClient.getApplications();

        long openPostings = postings.stream().filter(p -> "OPEN".equals(p.status())).count();
        long activeRequisitions = requisitions.stream()
                .filter(r -> ACTIVE_REQUISITION_STATUSES.contains(r.status())).count();

        long hired = applications.stream().filter(a -> "HIRED".equals(a.currentStageType())).count();
        long rejected = applications.stream().filter(a -> "REJECTED".equals(a.currentStageType())).count();
        long totalApplications = applications.size();

        double successRate = totalApplications == 0 ? 0.0 : (hired * 100.0) / totalApplications;

        var applicationsByStage = applications.stream()
                .collect(Collectors.groupingBy(ApplicationSummary::currentStageName, Collectors.counting()));

        return new DashboardSummaryResponse(
                openPostings, activeRequisitions, candidates.size(), totalApplications,
                hired, rejected, Math.round(successRate * 100.0) / 100.0, applicationsByStage
        );
    }
}