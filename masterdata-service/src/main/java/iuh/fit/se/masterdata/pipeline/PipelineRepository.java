package iuh.fit.se.masterdata.pipeline;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PipelineRepository extends JpaRepository<RecruitmentPipeline, Long> {
    List<RecruitmentPipeline> findAllByOrderByNameAsc();
}
