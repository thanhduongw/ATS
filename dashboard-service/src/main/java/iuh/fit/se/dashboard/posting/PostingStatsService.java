package iuh.fit.se.dashboard.posting;

import iuh.fit.se.dashboard.client.ApplicationServiceClient;
import iuh.fit.se.dashboard.client.InterviewServiceClient;
import iuh.fit.se.dashboard.client.dto.ApplicationSummary;
import iuh.fit.se.dashboard.client.dto.InterviewSummary;
import iuh.fit.se.dashboard.posting.dto.PostingStatsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostingStatsService {

    private final ApplicationServiceClient applicationServiceClient;
    private final InterviewServiceClient interviewServiceClient;

    public PostingStatsResponse getStats(Long tenantId, Long userId, String role, Long jobPostingId) {
        String safeRole = role != null ? role : "COMPANY_ADMIN";
        Long safeUserId = userId != null ? userId : 0L;

        List<ApplicationSummary> applications = safeList(() ->
                applicationServiceClient.getApplicationsByPosting(tenantId, safeUserId, safeRole, jobPostingId).content());
        List<InterviewSummary> interviews = safeList(() ->
                interviewServiceClient.getInterviewsByPosting(tenantId, safeUserId, safeRole, jobPostingId));

        Map<String, Long> byStage = applications.stream()
                .collect(Collectors.groupingBy(
                        a -> a.currentStageName() != null && !a.currentStageName().isBlank()
                                ? a.currentStageName() : "Không rõ",
                        Collectors.counting()));

        long interviewingCount = applications.stream().filter(this::isInterviewStage).count();
        long offerCount = applications.stream()
                .filter(a -> "OFFER".equalsIgnoreCase(nullSafe(a.currentStageType())))
                .count();
        long hiredCount = applications.stream()
                .filter(a -> "HIRED".equalsIgnoreCase(nullSafe(a.currentStageType())))
                .count();

        Map<Long, String> latestInterviewStatus = interviews.stream()
                .filter(i -> i.applicationId() != null)
                .collect(Collectors.groupingBy(InterviewSummary::applicationId))
                .entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().stream()
                                .max(Comparator.comparing(
                                        InterviewSummary::scheduledAt,
                                        Comparator.nullsFirst(Comparator.naturalOrder())))
                                .map(InterviewSummary::status)
                                .orElse(null)));

        return new PostingStatsResponse(
                jobPostingId, applications.size(), interviewingCount, offerCount, hiredCount,
                byStage, latestInterviewStatus);
    }

    private boolean isInterviewStage(ApplicationSummary a) {
        String type = nullSafe(a.currentStageType()).toUpperCase();
        String name = nullSafe(a.currentStageName()).toLowerCase();
        return type.contains("INTERVIEW") || name.contains("phỏng vấn") || name.contains("interview");
    }

    private static String nullSafe(String s) {
        return s != null ? s : "";
    }

    private static <T> List<T> safeList(java.util.function.Supplier<List<T>> supplier) {
        try {
            List<T> list = supplier.get();
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("PostingStats aggregate thất bại: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            return Collections.emptyList();
        }
    }
}
