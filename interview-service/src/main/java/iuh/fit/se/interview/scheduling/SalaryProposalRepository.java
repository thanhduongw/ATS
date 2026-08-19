package iuh.fit.se.interview.scheduling;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryProposalRepository extends JpaRepository<SalaryProposal, Long> {
    List<SalaryProposal> findByTenantIdAndApplicationIdOrderByCreatedAtDesc(Long tenantId, Long applicationId);

    Optional<SalaryProposal> findByIdAndTenantId(Long id, Long tenantId);
}
