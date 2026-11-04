package iuh.fit.se.masterdata.seeder;

import iuh.fit.se.masterdata.pipeline.PipelineRepository;
import iuh.fit.se.masterdata.pipeline.PipelineStage;
import iuh.fit.se.masterdata.pipeline.RecruitmentPipeline;
import iuh.fit.se.masterdata.pipeline.enums.StageType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Quy trình mặc định cho tin mới là quy trình 6 bước — một bước cho mỗi giai đoạn cố định
 * của giao diện (docs/UI DS06; quyết định Q8 = b).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SixStagePipelineSeedTest {

    @Mock private iuh.fit.se.masterdata.employmenttype.EmploymentTypeRepository employmentTypeRepository;
    @Mock private iuh.fit.se.masterdata.contracttype.ContractTypeRepository contractTypeRepository;
    @Mock private iuh.fit.se.masterdata.recruitmentsource.RecruitmentSourceRepository recruitmentSourceRepository;
    @Mock private iuh.fit.se.masterdata.educationlevel.EducationLevelRepository educationLevelRepository;
    @Mock private iuh.fit.se.masterdata.rejectionreason.RejectionReasonRepository rejectionReasonRepository;
    @Mock private iuh.fit.se.masterdata.recruitmentstatus.RecruitmentStatusRepository recruitmentStatusRepository;
    @Mock private PipelineRepository pipelineRepository;
    @Mock private iuh.fit.se.masterdata.interviewcriteria.InterviewCriteriaRepository interviewCriteriaRepository;
    @Mock private iuh.fit.se.masterdata.department.DepartmentRepository departmentRepository;
    @Mock private iuh.fit.se.masterdata.jobtitle.JobTitleRepository jobTitleRepository;
    @Mock private iuh.fit.se.masterdata.joblevel.JobLevelRepository jobLevelRepository;
    @Mock private iuh.fit.se.masterdata.skill.SkillRepository skillRepository;
    @Mock private iuh.fit.se.masterdata.worklocation.WorkLocationRepository workLocationRepository;
    @Mock private iuh.fit.se.masterdata.experiencelevel.ExperienceLevelRepository experienceLevelRepository;
    @Mock private iuh.fit.se.masterdata.emailtemplate.EmailTemplateRepository emailTemplateRepository;

    @InjectMocks private DefaultDataSeeder seeder;

    @Test
    void sixStagePipelineHasOneStagePerFixedGroupInOrder() {
        RecruitmentPipeline p = DefaultDataSeeder.buildSixStagePipeline();

        assertThat(p.isDefault()).isTrue();
        assertThat(p.isActive()).isTrue();
        assertThat(p.getStages()).extracting(PipelineStage::getName)
                .containsExactly("Ứng tuyển", "Sàng lọc", "Phỏng vấn", "Thư mời", "Đã tuyển", "Từ chối");
        assertThat(p.getStages()).extracting(PipelineStage::getStageType)
                .containsExactly(StageType.APPLIED, StageType.CV_SCREENING, StageType.TECHNICAL_INTERVIEW,
                        StageType.OFFER, StageType.HIRED, StageType.REJECTED);
        assertThat(p.getStages()).extracting(PipelineStage::getStageOrder)
                .containsExactly(1, 2, 3, 4, 5, 6);
    }

    @Test
    void createsSixStagePipelineAndMakesItTheOnlyDefault() {
        RecruitmentPipeline legacy = RecruitmentPipeline.builder()
                .id(1L).name("Quy trình tuyển dụng mặc định").isDefault(true).active(true).build();
        when(pipelineRepository.findFirstByNameIgnoreCase(DefaultDataSeeder.SIX_STAGE_PIPELINE_NAME))
                .thenReturn(Optional.empty());
        when(pipelineRepository.save(any(RecruitmentPipeline.class))).thenAnswer(inv -> {
            RecruitmentPipeline saved = inv.getArgument(0);
            if (saved.getId() == null) saved.setId(2L);
            return saved;
        });
        RecruitmentPipeline created = DefaultDataSeeder.buildSixStagePipeline();
        created.setId(2L);
        when(pipelineRepository.findAll()).thenReturn(List.of(legacy, created));

        seeder.seedDefaults();

        // Quy trình cũ vẫn còn và vẫn hoạt động (tin cũ dùng tiếp), chỉ không còn là mặc định.
        assertThat(legacy.isDefault()).isFalse();
        assertThat(legacy.isActive()).isTrue();
        assertThat(created.isDefault()).isTrue();
    }

    @Test
    void rerunDoesNotCreateAnotherSixStagePipeline() {
        RecruitmentPipeline existing = DefaultDataSeeder.buildSixStagePipeline();
        existing.setId(2L);
        when(pipelineRepository.findFirstByNameIgnoreCase(DefaultDataSeeder.SIX_STAGE_PIPELINE_NAME))
                .thenReturn(Optional.of(existing));
        when(pipelineRepository.findAll()).thenReturn(List.of(existing));

        seeder.seedDefaults();

        verify(pipelineRepository, never()).save(any(RecruitmentPipeline.class));
        assertThat(existing.isDefault()).isTrue();
    }
}
