package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.client.dto.CatalogItemResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationScoreRequest;
import iuh.fit.se.interview.evaluation.dto.EvaluationSubmitRequest;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.interview.Interview;
import iuh.fit.se.interview.interview.InterviewInterviewer;
import iuh.fit.se.interview.interview.InterviewRepository;
import iuh.fit.se.interview.interview.InterviewStatus;
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

    private final InterviewEvaluationRepository evaluationRepository;
    private final InterviewRepository interviewRepository;
    private final MasterDataServiceClient masterDataServiceClient;

    @Transactional
    public EvaluationResponse submit(Long tenantId, Long interviewId, Long actorUserId, EvaluationSubmitRequest req) {
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy buổi phỏng vấn"));

        InterviewEvaluation evaluation = evaluationRepository.findByInterviewIdAndInterviewerId(interviewId, actorUserId)
                .orElseThrow(() -> new AccessDeniedException("Bạn không được phân công phỏng vấn cho buổi này"));

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

        boolean allSubmitted = evaluationRepository.findByInterviewId(interviewId).stream()
                .allMatch(e -> e.getSubmittedAt() != null);
        if (allSubmitted && interview.getStatus() == InterviewStatus.SCHEDULED) {
            interview.setStatus(InterviewStatus.COMPLETED);
            interviewRepository.save(interview);
        }

        return toResponse(evaluation, interview);
    }

    public List<EvaluationResponse> getByInterview(Long tenantId, Long interviewId) {
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy buổi phỏng vấn"));

        return evaluationRepository.findByInterviewId(interviewId).stream()
                .map(e -> toResponse(e, interview))
                .toList();
    }

    private void validateCriteria(List<EvaluationScoreRequest> scores) {
        List<CatalogItemResponse> criteriaList = masterDataServiceClient.getInterviewCriteria();
        List<Long> validIds = criteriaList == null ? List.of() : criteriaList.stream()
                .map(CatalogItemResponse::id).toList();
        boolean allValid = scores.stream().map(EvaluationScoreRequest::criteriaId).allMatch(validIds::contains);
        if (!allValid) {
            throw new BusinessException("Danh sách tiêu chí đánh giá chứa giá trị không hợp lệ");
        }
    }

    private EvaluationResponse toResponse(InterviewEvaluation evaluation, Interview interview) {
        List<CatalogItemResponse> criteriaList = masterDataServiceClient.getInterviewCriteria();
        Map<Long, String> criteriaNameMap = criteriaList == null ? Map.of() : criteriaList.stream()
                .collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));

        String interviewerName = interview.getInterviewers().stream()
                .filter(i -> i.getInterviewerId().equals(evaluation.getInterviewerId()))
                .map(InterviewInterviewer::getInterviewerNameSnapshot)
                .findFirst().orElse("N/A");

        List<EvaluationResponse.ScoreDetail> scoreDetails = evaluation.getScores().stream()
                .map(s -> new EvaluationResponse.ScoreDetail(
                        s.getCriteriaId(), criteriaNameMap.getOrDefault(s.getCriteriaId(), "N/A"),
                        s.getScore(), s.getComment()))
                .toList();

        return new EvaluationResponse(
                evaluation.getInterviewerId(), interviewerName, evaluation.getOverallRecommendation(),
                evaluation.getGeneralComment(), evaluation.getSalaryProposed(), evaluation.getSalaryNote(),
                evaluation.getSubmittedAt(), scoreDetails
        );
    }
}