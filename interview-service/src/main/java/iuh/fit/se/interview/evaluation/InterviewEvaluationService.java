package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.client.dto.ApplicationAdvanceStageRequest;
import iuh.fit.se.interview.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.interview.client.dto.CatalogItemResponse;
import iuh.fit.se.interview.client.dto.UserSummaryResponse;
import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.evaluation.dto.EvaluationResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationDraftRequest;
import iuh.fit.se.interview.evaluation.dto.EvaluationScoreRequest;
import iuh.fit.se.interview.evaluation.dto.EvaluationScoreResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationSubmitRequest;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.interview.Interview;
import iuh.fit.se.interview.interview.InterviewInterviewer;
import iuh.fit.se.interview.interview.InterviewRepository;
import iuh.fit.se.interview.interview.InterviewService;
import iuh.fit.se.interview.interview.InterviewStatus;
import iuh.fit.se.interview.security.AuthorizationPolicy;
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
    private final AuthServiceClient authServiceClient;

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
        return toResponse(evaluation, interview, buildCriteriaNameMap(), true, true);
    }

    public List<EvaluationResponse> getByInterview(
            Long interviewId, CurrentUser actor) {

        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy buổi phỏng vấn"));
        interviewService.requireCanView(interview, actor);

        boolean isHr = AccessGuard.isHr(actor.role());
        List<InterviewEvaluation> all = evaluationRepository.findByInterviewId(interviewId);

        // Trả về cả dòng chưa nộp để giao diện biết ai còn nợ đánh giá; nội dung thì che
        // theo quy tắc bên dưới, nên danh sách này không làm lộ bài chấm của ai.
        //
        // Người phỏng vấn chỉ đọc được bài của đồng nghiệp SAU KHI đã nộp bài của mình,
        // để nhận định của người khác không làm lệch điểm họ chấm. HR/Admin xem được mọi lúc.
        boolean selfSubmitted = all.stream().anyMatch(
                e -> e.getInterviewerId().equals(actor.userId()) && e.getSubmittedAt() != null);
        boolean canReadOthers = isHr || selfSubmitted;

        Map<Long, String> criteriaNameMap = buildCriteriaNameMap();

        return all.stream()
                .map(e -> {
                    boolean own = e.getInterviewerId().equals(actor.userId());
                    // Bản nháp của người khác không bao giờ đọc được, kể cả HR — nó chưa phải bài nộp.
                    boolean contentVisible = own || (canReadOthers && e.getSubmittedAt() != null);
                    boolean includeSalary = contentVisible && (isHr || own);
                    return toResponse(e, interview, criteriaNameMap, contentVisible, includeSalary);
                })
                .toList();
    }

    /**
     * Lưu nháp bài chấm của chính người gọi. Gọi lại bao nhiêu lần cũng được cho tới khi nộp;
     * sau khi nộp thì khóa, khớp với quy tắc "trước khi nộp sửa tự do, sau khi nộp khóa lại".
     */
    @Transactional
    public EvaluationResponse saveDraft(
            Long interviewId,
            CurrentUser actor,
            EvaluationDraftRequest req) {

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
            throw new BusinessException("Bạn đã nộp đánh giá cho buổi này rồi, không sửa lại được");
        }

        List<EvaluationScoreRequest> scores = req.scores() == null ? List.of() : req.scores();
        validateCriteria(scores);

        evaluation.setOverallRecommendation(req.overallRecommendation());
        evaluation.setGeneralComment(req.generalComment());
        evaluation.setSalaryProposed(req.salaryProposed());
        evaluation.setSalaryNote(req.salaryNote());

        evaluation.getScores().clear();
        scores.forEach(s -> evaluation.getScores().add(InterviewEvaluationScore.builder()
                .evaluation(evaluation)
                .criteriaId(s.criteriaId())
                .score(s.score())
                .comment(s.comment())
                .build()));

        evaluationRepository.save(evaluation);
        return toResponse(evaluation, interview, buildCriteriaNameMap(), true, true);
    }

    /**
     * HR cham danh gia cho ho so o vong hien tai, khong gan buoi phong van nao.
     * Dung cho nhung vong khong co phong van (vi du Sang loc CV).
     */
    @Transactional
    public EvaluationResponse submitForApplication(
            Long applicationId,
            CurrentUser actor,
            EvaluationSubmitRequest req) {

        AuthorizationPolicy.requireHr(actor);
        ApplicationSummaryResponse application = applicationServiceClient.getApplicationById(applicationId);
        if (application == null) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển");
        }

        validateCriteria(req.scores());

        InterviewEvaluation evaluation = InterviewEvaluation.builder()
                .applicationId(applicationId)
                .interviewerId(actor.userId())
                .overallRecommendation(req.overallRecommendation())
                .generalComment(req.generalComment())
                .salaryProposed(req.salaryProposed())
                .salaryNote(req.salaryNote())
                .submittedAt(LocalDateTime.now())
                .build();
        req.scores().forEach(sc -> evaluation.getScores().add(InterviewEvaluationScore.builder()
                .evaluation(evaluation)
                .criteriaId(sc.criteriaId())
                .score(sc.score())
                .comment(sc.comment())
                .build()));

        evaluationRepository.save(evaluation);
        return toResponse(evaluation, null, buildCriteriaNameMap(), true, true);
    }

    /**
     * Toan bo danh gia cua mot ho so — ca bai cham theo buoi phong van lan bai HR cham roi.
     * Nguoi phong van chi doc duoc bai cua dong nghiep sau khi da nop it nhat mot bai
     * cho chinh ho so nay; HR/Admin doc duoc moi luc.
     */
    public List<EvaluationResponse> getByApplication(Long applicationId, CurrentUser actor) {
        AuthorizationPolicy.requireInternal(actor);

        boolean isHr = AccessGuard.isHr(actor.role());
        List<InterviewEvaluation> all = evaluationRepository.findByApplicationIdOrderByIdAsc(applicationId);

        boolean selfSubmitted = all.stream().anyMatch(
                e -> e.getInterviewerId().equals(actor.userId()) && e.getSubmittedAt() != null);
        boolean canReadOthers = isHr || selfSubmitted;

        Map<Long, String> criteriaNameMap = buildCriteriaNameMap();

        return all.stream()
                .map(e -> {
                    boolean own = e.getInterviewerId().equals(actor.userId());
                    boolean contentVisible = own || (canReadOthers && e.getSubmittedAt() != null);
                    boolean includeSalary = contentVisible && (isHr || own);
                    return toResponse(e, e.getInterview(), criteriaNameMap, contentVisible, includeSalary);
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

    /** Ten nguoi cham khi khong co snapshot tren buoi phong van. */
    private String resolveUserName(Long userId) {
        try {
            List<UserSummaryResponse> users = authServiceClient.getUsers(null);
            if (users == null) return "N/A";
            return users.stream()
                    .filter(u -> userId.equals(u.id()))
                    .map(UserSummaryResponse::fullName)
                    .findFirst()
                    .orElse("N/A");
        } catch (RuntimeException exception) {
            return "N/A";
        }
    }

    /** Tra tieu chi mot lan roi dung lai cho ca danh sach, thay vi goi masterdata cho tung dong. */
    private Map<Long, String> buildCriteriaNameMap() {
        List<CatalogItemResponse> criteriaList = masterDataServiceClient.getInterviewCriteria();
        return criteriaList == null
                ? Map.of()
                : criteriaList.stream()
                .collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));
    }

    private EvaluationResponse toResponse(
            InterviewEvaluation evaluation,
            Interview interview,
            Map<Long, String> criteriaNameMap,
            boolean contentVisible,
            boolean includeSalary) {

        // Bai cham gan buoi phong van lay ten tu snapshot cua buoi do; bai HR cham roi
        // (khong co buoi phong van) phai hoi auth-service.
        String interviewerName = interview == null ? null : interview.getInterviewers().stream()
                .filter(i -> i.getInterviewerId().equals(evaluation.getInterviewerId()))
                .map(InterviewInterviewer::getInterviewerNameSnapshot)
                .findFirst()
                .orElse(null);
        if (interviewerName == null) {
            interviewerName = resolveUserName(evaluation.getInterviewerId());
        }

        // Khong duoc phep doc thi chi con danh tinh va moc thoi gian nop.
        if (!contentVisible) {
            return new EvaluationResponse(
                    evaluation.getId(),
                    evaluation.getInterview() == null ? null : evaluation.getInterview().getId(),
                    evaluation.getInterviewerId(),
                    interviewerName,
                    null, null, null, null,
                    evaluation.getSubmittedAt(),
                    false,
                    List.of()
            );
        }

        List<EvaluationScoreResponse> scoreDetails = evaluation.getScores().stream()
                .map(s -> new EvaluationScoreResponse(
                        s.getCriteriaId(),
                        criteriaNameMap.getOrDefault(s.getCriteriaId(), "N/A"),
                        s.getScore(),
                        s.getComment()))
                .toList();

        return new EvaluationResponse(
                evaluation.getId(),
                evaluation.getInterview() == null ? null : evaluation.getInterview().getId(),
                evaluation.getInterviewerId(),
                interviewerName,
                evaluation.getOverallRecommendation(),
                evaluation.getGeneralComment(),
                includeSalary ? evaluation.getSalaryProposed() : null,
                includeSalary ? evaluation.getSalaryNote() : null,
                evaluation.getSubmittedAt(),
                true,
                scoreDetails
        );
    }
}
