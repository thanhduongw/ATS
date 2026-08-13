package iuh.fit.se.interview.evaluation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewEvaluationRepository extends JpaRepository<InterviewEvaluation, Long> {
    List<InterviewEvaluation> findByInterviewId(Long interviewId);
    Optional<InterviewEvaluation> findByInterviewIdAndInterviewerId(Long interviewId, Long interviewerId);
    void deleteByEvaluationId(Long evaluationId);
}