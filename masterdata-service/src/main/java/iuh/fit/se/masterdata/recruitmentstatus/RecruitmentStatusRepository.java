package iuh.fit.se.masterdata.recruitmentstatus;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RecruitmentStatusRepository extends JpaRepository<RecruitmentStatus, Long> {
    List<RecruitmentStatus> findAllByOrderByOrderNoAsc();
    boolean existsByNameIgnoreCase(String name);
}
