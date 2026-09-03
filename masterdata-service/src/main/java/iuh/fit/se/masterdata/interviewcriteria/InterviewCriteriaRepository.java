package iuh.fit.se.masterdata.interviewcriteria;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewCriteriaRepository extends JpaRepository<InterviewCriteria, Long> {
    List<InterviewCriteria> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
