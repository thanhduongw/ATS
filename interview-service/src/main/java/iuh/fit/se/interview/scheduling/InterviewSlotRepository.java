package iuh.fit.se.interview.scheduling;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewSlotRepository extends JpaRepository<InterviewSlot, Long> {
    List<InterviewSlot> findByTenantIdAndApplicationIdOrderByStartTimeAsc(Long tenantId, Long applicationId);

    List<InterviewSlot> findByTenantIdAndStatusOrderByStartTimeAsc(Long tenantId, InterviewSlotStatus status);

    Optional<InterviewSlot> findByIdAndTenantId(Long id, Long tenantId);

    List<InterviewSlot> findByTenantIdAndApplicationIdAndIdNot(Long tenantId, Long applicationId, Long id);
}
