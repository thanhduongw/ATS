package iuh.fit.se.candidate.candidate;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateTagRepository extends JpaRepository<CandidateTag, Long> {
    boolean existsByCandidateIdAndTagIgnoreCase(Long candidateId, String tag);
}
