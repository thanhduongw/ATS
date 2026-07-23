package iuh.fit.se.masterdata.pipeline;

import iuh.fit.se.masterdata.pipeline.enums.StageType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pipeline_stage")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PipelineStage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private RecruitmentPipeline pipeline;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_type", nullable = false)
    private StageType stageType;

    @Column(name = "stage_order", nullable = false)
    private Integer stageOrder;
}