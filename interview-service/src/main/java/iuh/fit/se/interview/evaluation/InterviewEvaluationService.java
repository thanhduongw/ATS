package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.client.dto.ApplicationAdvanceStageRequest;
import iuh.fit.se.interview.client.dto.CatalogItemResponse;
import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.evaluation.dto.EvaluationResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationScoreRequest;
import iuh.fit.se.interview.evaluation.dto.EvaluationScoreResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationSubmitRequest;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.interview.Interview;
import iuh.fit.se.interview.interview.InterviewRepository;
import iuh.fit.se.interview.interview.InterviewService;
import iuh.fit.se.interview.interview.InterviewStatus;
import iuh.fit.se.interview.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterviewEvaluationService {

    private static final java.util.Set<RecommendationType> POSITIVE_RECOMMENDATIONS =
            java.util.Set.of(RecommendationType.STRONG_YES, RecommendationType.YES);

    private final InterviewEvaluationRepository evaluationRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewService interviewService;
    private final MasterDataServiceClient masterDataServiceClient;
    private final ApplicationServiceClient applicationServiceClient;

    @Transactional
    public EvaluationResponse submit(
            Long interviewId,
            CurrentUser actor,
            EvaluationSubmitRequest req) {

        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy buổi phỏng vấn"));
        interviewService.requireCanView(interview, actor);

        if (interview.getStatus() == InterviewStatus.CANCELLED) {
            throw new BusinessException("Buổi phỏng vấn đã bị hủy");
        }

        InterviewEvaluation evaluation = evaluationRepository
                .findByInterviewIdAndInterviewerId(interviewId, actor.userId())
                .orElseThrow(() -> new AccessDeniedException(
                        "Bạn không được phân công phỏng vấn cho buổi này"));

        if (evaluation.getSubmittedAt() != null) {
            throw new BusinessException("Bạn đã nộp đánh giá cho buổi này rồi");
        }

        validateCriteria(req.scores());

        evaluation.setOverallRecommendation(req.overallRecommendation());
        evaluation.setGeneralComment(req.generalComment());
        evaluation.setSalaryProposed(req.salaryProposed());
        evaluation.setSalaryNote(req.salaryNote());
        evaluation.setSubmittedAt(LocalDateTime.now());

        evaluation.getScores().clear();
        req.scores().forEach(s -> evaluation.getScores().add(InterviewEvaluationScore.builder()
                .evaluation(evaluation)
                .criteriaId(s.criteriaId())
                .score(s.score())
                .comment(s.comment())
                .build()));

        evaluationRepository.save(evaluation);

        // Tất cả interviewer đã nộp → COMPLETED
        List<InterviewEvaluation> allEvaluations = evaluationRepository.findByInterviewId(interviewId);
        boolean allSubmitted = allEvaluations.stream().allMatch(e -> e.getSubmittedAt() != null);
        if (allSubmitted
                && (interview.getStatus() == InterviewStatus.SCHEDULED
                || interview.getStatus() == InterviewStatus.CONFIRMED)) {
            interview.setStatus(InterviewStatus.COMPLETED);
            interviewRepository.save(interview);
        }

        // Workflow automation: toàn bộ hội đồng đề xuất Hire/Strong Hire → tự động chuyển vòng
        if (allSubmitted && allEvaluations.stream()
                .allMatch(e -> POSITIVE_RECOMMENDATIONS.contains(e.getOverallRecommendation()))) {
            try {
                applicationServiceClient.advanceStage(actor.userId(), "SYSTEM", interview.getApplicationId(),
                        new ApplicationAdvanceStageRequest(
                                "Tự động chuyển vòng — toàn bộ hội đồng đề xuất Hire"));
            } catch (Exception e) {
                // Best-effort — không chặn việc nộp đánh giá nếu tự động chuyển vòng thất bại
                // (vd: hồ sơ đã ở giai đoạn cuối, hoặc application-service tạm gián đoạn)
            }
        }

        // Người nộp luôn thấy lương của chính mình
        return toResponse(evaluation, interview, true);
    }

    public List<EvaluationResponse> getByInterview(
            Long interviewId, CurrentUser actor) {

        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy buổi phỏng vấn"));
        interviewService.requireCanView(interview, actor);

        boolean isHr = AccessGuard.isHr(actor.role());

        return evaluationRepository.findByInterviewId(interviewId).stream()
                // Chỉ trả evaluation đã nộp (tránh hàng placeholder rỗng)
                .filter(e -> e.getSubmittedAt() != null)
                .map(e -> {
                    boolean includeSalary = isHr || e.getInterviewerId().equals(actor.userId());
                    return toResponse(e, interview, includeSalary);
                })
                .toList();
    }

    private void validateCriteria(List<EvaluationScoreRequest> scores) {
        List<CatalogItemResponse> criteriaList = masterDataServiceClient.getInterviewCriteria();
        List<Long> validIds = criteriaList == null
                ? List.of()
                : criteriaList.stream().map(CatalogItemResponse::id).toList();
        boolean allValid = scores.stream()
                .map(EvaluationScoreRequest::criteriaId)
                .allMatch(validIds::contains);
        if (!allValid) {
            throw new BusinessException("Danh sách tiêu chí đánh giá chứa giá trị không hợp lệ");
        }
    }

    private EvaluationResponse toResponse(
            InterviewEvaluation evaluation,
            Interview interview,
            boolean includeSalary) {

        List<CatalogItemResponse> criteriaList = masterDataServiceClient.getInterviewCriteria();
        Map<Long, String> criteriaNameMap = criteriaList == null
                ? Map.of()
                : criteriaList.stream()
                .collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));

        String interviewerName = interview.getInterviewers().stream()
                .filter(i -> i.getInterviewerId().equals(evaluation.getInterviewerId()))
                .map(i -> i.getInterviewerNameSnapshot())
                .findFirst()
                .orElse("N/A");

        List<EvaluationScoreResponse> scoreDetails = evaluation.getScores().stream()
                .map(s -> new EvaluationScoreResponse(
                        s.getCriteriaId(),
                        criteriaNameMap.getOrDefault(s.getCriteriaId(), "N/A"),
                        s.getScore(),
                        s.getComment()))
                .toList();

        return new EvaluationResponse(
                evaluation.getInterviewerId(),
                interviewerName,
                evaluation.getOverallRecommendation(),
                evaluation.getGeneralComment(),
                includeSalary ? evaluation.getSalaryProposed() : null,
                includeSalary ? evaluation.getSalaryNote() : null,
                evaluation.getSubmittedAt(),
                scoreDetails
        );
    }
}
