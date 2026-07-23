package iuh.fit.se.masterdata.seeder;

import iuh.fit.se.masterdata.contracttype.ContractType;
import iuh.fit.se.masterdata.contracttype.ContractTypeRepository;
import iuh.fit.se.masterdata.educationlevel.EducationLevel;
import iuh.fit.se.masterdata.educationlevel.EducationLevelRepository;
import iuh.fit.se.masterdata.employmenttype.EmploymentType;
import iuh.fit.se.masterdata.employmenttype.EmploymentTypeRepository;
import iuh.fit.se.masterdata.pipeline.PipelineStage;
import iuh.fit.se.masterdata.pipeline.PipelineRepository;
import iuh.fit.se.masterdata.pipeline.RecruitmentPipeline;
import iuh.fit.se.masterdata.pipeline.enums.StageType;
import iuh.fit.se.masterdata.recruitmentsource.RecruitmentSource;
import iuh.fit.se.masterdata.recruitmentsource.RecruitmentSourceRepository;
import iuh.fit.se.masterdata.recruitmentstatus.RecruitmentStatus;
import iuh.fit.se.masterdata.recruitmentstatus.RecruitmentStatusRepository;
import iuh.fit.se.masterdata.rejectionreason.RejectionReason;
import iuh.fit.se.masterdata.rejectionreason.RejectionReasonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DefaultDataSeeder {

    private final EmploymentTypeRepository employmentTypeRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final RecruitmentSourceRepository recruitmentSourceRepository;
    private final EducationLevelRepository educationLevelRepository;
    private final RejectionReasonRepository rejectionReasonRepository;
    private final RecruitmentStatusRepository recruitmentStatusRepository;
    private final PipelineRepository pipelineRepository;

    @Transactional
    public void seedDefaults(Long tenantId) {
        List.of("Toàn thời gian", "Bán thời gian", "Thực tập", "Cộng tác viên")
                .forEach(name -> employmentTypeRepository.save(
                        EmploymentType.builder().tenantId(tenantId).name(name).active(true).build()));

        List.of("Thử việc", "Chính thức", "Thời vụ")
                .forEach(name -> contractTypeRepository.save(
                        ContractType.builder().tenantId(tenantId).name(name).active(true).build()));

        List.of("Website công ty", "LinkedIn", "Giới thiệu nội bộ", "Facebook", "TopCV", "VietnamWorks")
                .forEach(name -> recruitmentSourceRepository.save(
                        RecruitmentSource.builder().tenantId(tenantId).name(name).active(true).build()));

        String[] educationLevels = {"Trung học phổ thông", "Cao đẳng", "Đại học", "Thạc sĩ", "Tiến sĩ"};
        for (int i = 0; i < educationLevels.length; i++) {
            educationLevelRepository.save(EducationLevel.builder()
                    .tenantId(tenantId).name(educationLevels[i]).orderNo(i + 1).active(true).build());
        }

        List.of("Không đủ kinh nghiệm", "Không đạt yêu cầu phỏng vấn", "Mức lương không phù hợp",
                        "Vị trí đã tuyển đủ", "Ứng viên tự rút hồ sơ", "Không phù hợp văn hóa công ty")
                .forEach(name -> rejectionReasonRepository.save(
                        RejectionReason.builder().tenantId(tenantId).name(name).active(true).build()));

        String[] statuses = {"Bản nháp", "Chờ phê duyệt", "Đã phê duyệt", "Đang mở", "Tạm dừng", "Đã đóng", "Từ chối"};
        for (int i = 0; i < statuses.length; i++) {
            recruitmentStatusRepository.save(RecruitmentStatus.builder()
                    .tenantId(tenantId).name(statuses[i]).orderNo(i + 1).active(true).build());
        }

        seedDefaultPipeline(tenantId);
    }

    private void seedDefaultPipeline(Long tenantId) {
        RecruitmentPipeline pipeline = RecruitmentPipeline.builder()
                .tenantId(tenantId)
                .name("Quy trình tuyển dụng mặc định")
                .isDefault(true)
                .active(true)
                .build();

        Object[][] stages = {
                {"Ứng tuyển", StageType.APPLIED, 1},
                {"Sàng lọc CV", StageType.CV_SCREENING, 2},
                {"Sàng lọc HR", StageType.HR_SCREENING, 3},
                {"Phỏng vấn kỹ thuật", StageType.TECHNICAL_INTERVIEW, 4},
                {"Phỏng vấn HR", StageType.HR_INTERVIEW, 5},
                {"Phỏng vấn vòng cuối", StageType.FINAL_INTERVIEW, 6},
                {"Đề nghị nhận việc", StageType.OFFER, 7},
                {"Đã tuyển dụng", StageType.HIRED, 8},
                {"Từ chối", StageType.REJECTED, 9},
        };

        for (Object[] s : stages) {
            pipeline.getStages().add(PipelineStage.builder()
                    .pipeline(pipeline)
                    .name((String) s[0])
                    .stageType((StageType) s[1])
                    .stageOrder((Integer) s[2])
                    .build());
        }

        pipelineRepository.save(pipeline);
    }
}