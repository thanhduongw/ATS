package iuh.fit.se.candidate.candidate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CandidateRepository extends JpaRepository<Candidate, Long>, JpaSpecificationExecutor<Candidate> {
    List<Candidate> findByDeletedAtIsNullOrderByCreatedAtDesc();
    Optional<Candidate> findByIdAndDeletedAtIsNull(Long id);
    Optional<Candidate> findByUserIdAndDeletedAtIsNull(Long userId);

    Optional<Candidate> findFirstByCvFileUrlEndingWithAndDeletedAtIsNull(String fileName);
    Optional<Candidate> findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByIdAsc(String email);
    boolean existsByEmailIgnoreCaseAndDeletedAtIsNull(String email);
    List<Candidate> findByDeletedAtIsNullAndCreatedAtBefore(LocalDateTime threshold);
}
