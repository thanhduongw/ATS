package iuh.fit.se.interview.interview;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findAllByOrderByScheduledAtDesc();
    List<Interview> findByApplicationIdOrderByScheduledAtDesc(Long applicationId);
    List<Interview> findByJobPostingIdOrderByScheduledAtDesc(Long jobPostingId);
    List<Interview> findByCandidateIdOrderByScheduledAtDesc(Long candidateId);
    List<Interview> findByInterviewers_InterviewerIdOrderByScheduledAtDesc(Long interviewerId);

    @Query("""
            select distinct i from Interview i
            left join i.interviewers iv
            where i.departmentId = :departmentId or iv.interviewerId = :userId
            order by i.scheduledAt desc
            """)
    List<Interview> findForHiringManager(
            @Param("departmentId") Long departmentId,
            @Param("userId") Long userId);

    @Query("""
            select i from Interview i
            where i.departmentId = :departmentId or i.assignedRecruiterId = :userId
            order by i.scheduledAt desc
            """)
    List<Interview> findForRecruiter(
            @Param("departmentId") Long departmentId,
            @Param("userId") Long userId);

    /** Lịch hiện có của các người phỏng vấn — dùng để tránh trùng lịch khi xếp lịch hàng loạt. */
    List<Interview> findByInterviewers_InterviewerIdInAndStatusIn(
            List<Long> interviewerIds, List<InterviewStatus> statuses);
}
