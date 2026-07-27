package iuh.fit.se.candidate.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationHistoryRepository extends JpaRepository<ApplicationHistory, Long> {
    List<ApplicationHistory> findByApplicationIdOrderByChangedAtAsc(Long applicationId);
}