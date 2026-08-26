package iuh.fit.se.application.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationCommentRepository extends JpaRepository<ApplicationComment, Long> {
    List<ApplicationComment> findByApplicationIdOrderByCreatedAtAsc(Long applicationId);
}
