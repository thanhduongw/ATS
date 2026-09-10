package iuh.fit.se.masterdata.seeder;

import iuh.fit.se.masterdata.contracttype.ContractType;
import iuh.fit.se.masterdata.contracttype.ContractTypeRepository;
import iuh.fit.se.masterdata.department.Department;
import iuh.fit.se.masterdata.department.DepartmentRepository;
import iuh.fit.se.masterdata.educationlevel.EducationLevel;
import iuh.fit.se.masterdata.educationlevel.EducationLevelRepository;
import iuh.fit.se.masterdata.emailtemplate.EmailTemplate;
import iuh.fit.se.masterdata.emailtemplate.EmailTemplateRepository;
import iuh.fit.se.masterdata.employmenttype.EmploymentType;
import iuh.fit.se.masterdata.employmenttype.EmploymentTypeRepository;
import iuh.fit.se.masterdata.experiencelevel.ExperienceLevel;
import iuh.fit.se.masterdata.experiencelevel.ExperienceLevelRepository;
import iuh.fit.se.masterdata.interviewcriteria.InterviewCriteria;
import iuh.fit.se.masterdata.interviewcriteria.InterviewCriteriaRepository;
import iuh.fit.se.masterdata.joblevel.JobLevel;
import iuh.fit.se.masterdata.joblevel.JobLevelRepository;
import iuh.fit.se.masterdata.jobtitle.JobTitle;
import iuh.fit.se.masterdata.jobtitle.JobTitleRepository;
import iuh.fit.se.masterdata.pipeline.PipelineRepository;
import iuh.fit.se.masterdata.pipeline.PipelineStage;
import iuh.fit.se.masterdata.pipeline.RecruitmentPipeline;
import iuh.fit.se.masterdata.pipeline.enums.StageType;
import iuh.fit.se.masterdata.recruitmentsource.RecruitmentSource;
import iuh.fit.se.masterdata.recruitmentsource.RecruitmentSourceRepository;
import iuh.fit.se.masterdata.recruitmentstatus.RecruitmentStatus;
import iuh.fit.se.masterdata.recruitmentstatus.RecruitmentStatusRepository;
import iuh.fit.se.masterdata.rejectionreason.RejectionReason;
import iuh.fit.se.masterdata.rejectionreason.RejectionReasonRepository;
import iuh.fit.se.masterdata.skill.Skill;
import iuh.fit.se.masterdata.skill.SkillRepository;
import iuh.fit.se.masterdata.worklocation.WorkLocation;
import iuh.fit.se.masterdata.worklocation.WorkLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Nap danh muc mac dinh cho cong ty. Moi lan seed deu bo qua ban ghi da ton tai
 * (doi chieu theo name / code), nen chay lai nhieu lan khong sinh du lieu trung.
 */
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
    private final InterviewCriteriaRepository interviewCriteriaRepository;
    private final DepartmentRepository departmentRepository;
    private final JobTitleRepository jobTitleRepository;
    private final JobLevelRepository jobLevelRepository;
    private final SkillRepository skillRepository;
    private final WorkLocationRepository workLocationRepository;
    private final ExperienceLevelRepository experienceLevelRepository;
    private final EmailTemplateRepository emailTemplateRepository;

    @Transactional
    public void seedDefaults() {
        seedEmploymentTypes();
        seedContractTypes();
        seedRecruitmentSources();
        seedEducationLevels();
        seedRejectionReasons();
        seedRecruitmentStatuses();
        seedInterviewCriteria();
        seedDepartments();
        seedJobLevels();
        seedJobTitles();
        seedExperienceLevels();
        seedWorkLocations();
        seedSkills();
        seedEmailTemplates();
        seedDefaultPipeline();
    }

    private void seedEmploymentTypes() {
        List.of("Toàn thời gian", "Bán thời gian", "Thực tập", "Cộng tác viên", "Freelance")
                .forEach(name -> {
                    if (!employmentTypeRepository.existsByNameIgnoreCase(name)) {
                        employmentTypeRepository.save(
                                EmploymentType.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedContractTypes() {
        List.of("Thử việc", "Chính thức", "Thời vụ", "Hợp đồng dịch vụ", "Không xác định thời hạn")
                .forEach(name -> {
                    if (!contractTypeRepository.existsByNameIgnoreCase(name)) {
                        contractTypeRepository.save(
                                ContractType.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedRecruitmentSources() {
        List.of("Website công ty", "LinkedIn", "Giới thiệu nội bộ", "Facebook", "TopCV",
                        "VietnamWorks", "ITviec", "CareerBuilder", "Ngày hội việc làm", "Headhunter")
                .forEach(name -> {
                    if (!recruitmentSourceRepository.existsByNameIgnoreCase(name)) {
                        recruitmentSourceRepository.save(
                                RecruitmentSource.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedEducationLevels() {
        String[] names = {"Trung học phổ thông", "Trung cấp", "Cao đẳng", "Đại học", "Thạc sĩ", "Tiến sĩ"};
        for (int i = 0; i < names.length; i++) {
            if (!educationLevelRepository.existsByNameIgnoreCase(names[i])) {
                educationLevelRepository.save(EducationLevel.builder()
                        .name(names[i]).orderNo(i + 1).active(true).build());
            }
        }
    }

    private void seedRejectionReasons() {
        List.of("Không đủ kinh nghiệm", "Không đạt yêu cầu phỏng vấn", "Mức lương không phù hợp",
                        "Vị trí đã tuyển đủ", "Ứng viên tự rút hồ sơ", "Không phù hợp văn hóa công ty",
                        "Hồ sơ không đầy đủ", "Không phản hồi liên hệ", "Kỹ năng ngoại ngữ chưa đạt",
                        "Địa điểm làm việc không phù hợp")
                .forEach(name -> {
                    if (!rejectionReasonRepository.existsByNameIgnoreCase(name)) {
                        rejectionReasonRepository.save(
                                RejectionReason.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedRecruitmentStatuses() {
        String[] names = {"Bản nháp", "Chờ phê duyệt", "Đã phê duyệt", "Đang mở", "Tạm dừng", "Đã đóng", "Từ chối"};
        for (int i = 0; i < names.length; i++) {
            if (!recruitmentStatusRepository.existsByNameIgnoreCase(names[i])) {
                recruitmentStatusRepository.save(RecruitmentStatus.builder()
                        .name(names[i]).orderNo(i + 1).active(true).build());
            }
        }
    }

    private void seedInterviewCriteria() {
        List.of("Kiến thức chuyên môn", "Kỹ năng kỹ thuật", "Kỹ năng mềm & giao tiếp",
                        "Thái độ & tư duy giải quyết vấn đề", "Mức độ phù hợp với vị trí",
                        "Khả năng làm việc nhóm", "Tiềm năng phát triển", "Kỹ năng ngoại ngữ")
                .forEach(name -> {
                    if (!interviewCriteriaRepository.existsByNameIgnoreCase(name)) {
                        interviewCriteriaRepository.save(
                                InterviewCriteria.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedDepartments() {
        String[][] departments = {
                {"Ban Giám đốc", "Điều hành và định hướng chiến lược công ty"},
                {"Phòng Nhân sự", "Tuyển dụng, đào tạo và quản lý nhân sự"},
                {"Phòng Kỹ thuật", "Phát triển và vận hành sản phẩm công nghệ"},
                {"Phòng Kinh doanh", "Bán hàng và phát triển khách hàng"},
                {"Phòng Marketing", "Truyền thông, thương hiệu và tiếp thị"},
                {"Phòng Tài chính - Kế toán", "Quản lý tài chính, kế toán và ngân sách"},
                {"Phòng Hành chính", "Hành chính tổng hợp và cơ sở vật chất"},
                {"Phòng Chăm sóc khách hàng", "Hỗ trợ và chăm sóc khách hàng sau bán"},
                {"Phòng Sản phẩm", "Nghiên cứu, thiết kế và quản lý sản phẩm"},
                {"Phòng Đảm bảo chất lượng", "Kiểm thử và đảm bảo chất lượng sản phẩm"},
        };
        for (String[] d : departments) {
            if (!departmentRepository.existsByNameIgnoreCase(d[0])) {
                departmentRepository.save(Department.builder()
                        .name(d[0]).description(d[1]).active(true).build());
            }
        }
    }

    private void seedJobLevels() {
        String[] names = {"Thực tập sinh", "Nhân viên mới", "Nhân viên", "Nhân viên cao cấp",
                "Trưởng nhóm", "Trưởng phòng", "Giám đốc bộ phận", "Ban điều hành"};
        for (int i = 0; i < names.length; i++) {
            if (!jobLevelRepository.existsByNameIgnoreCase(names[i])) {
                jobLevelRepository.save(JobLevel.builder()
                        .name(names[i]).orderNo(i + 1).active(true).build());
            }
        }
    }

    private void seedJobTitles() {
        List.of("Lập trình viên Backend", "Lập trình viên Frontend", "Lập trình viên Full-stack",
                        "Lập trình viên Mobile", "Kỹ sư DevOps", "Kỹ sư kiểm thử phần mềm",
                        "Kỹ sư dữ liệu", "Chuyên viên phân tích nghiệp vụ", "Quản lý dự án",
                        "Quản lý sản phẩm", "Thiết kế UI/UX", "Chuyên viên tuyển dụng",
                        "Chuyên viên nhân sự tổng hợp", "Chuyên viên kinh doanh",
                        "Chuyên viên marketing", "Chuyên viên kế toán", "Chuyên viên hành chính",
                        "Chuyên viên chăm sóc khách hàng", "Kỹ sư hệ thống",
                        "Chuyên viên an toàn thông tin")
                .forEach(name -> {
                    if (!jobTitleRepository.existsByNameIgnoreCase(name)) {
                        jobTitleRepository.save(JobTitle.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedExperienceLevels() {
        Object[][] levels = {
                {"Chưa có kinh nghiệm", 0, 0},
                {"Dưới 1 năm", 0, 1},
                {"1 - 2 năm", 1, 2},
                {"2 - 3 năm", 2, 3},
                {"3 - 5 năm", 3, 5},
                {"5 - 10 năm", 5, 10},
                {"Trên 10 năm", 10, null},
        };
        for (Object[] l : levels) {
            String name = (String) l[0];
            if (!experienceLevelRepository.existsByNameIgnoreCase(name)) {
                experienceLevelRepository.save(ExperienceLevel.builder()
                        .name(name)
                        .minYears((Integer) l[1])
                        .maxYears((Integer) l[2])
                        .active(true)
                        .build());
            }
        }
    }

    private void seedWorkLocations() {
        String[][] locations = {
                {"Trụ sở TP. Hồ Chí Minh", "12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh"},
                {"Chi nhánh Hà Nội", "Tòa nhà Keangnam, Phạm Hùng, Quận Nam Từ Liêm, Hà Nội"},
                {"Chi nhánh Đà Nẵng", "Số 15 Quang Trung, Quận Hải Châu, Đà Nẵng"},
                {"Chi nhánh Cần Thơ", "Số 1 Lý Tự Trọng, Quận Ninh Kiều, Cần Thơ"},
                {"Làm việc từ xa", "Remote - làm việc trực tuyến toàn thời gian"},
                {"Linh hoạt (Hybrid)", "Kết hợp làm việc tại văn phòng và từ xa"},
        };
        for (String[] l : locations) {
            if (!workLocationRepository.existsByNameIgnoreCase(l[0])) {
                workLocationRepository.save(WorkLocation.builder()
                        .name(l[0]).address(l[1]).active(true).build());
            }
        }
    }

    private void seedSkills() {
        String[][] skills = {
                {"Java", "Technical"}, {"Spring Boot", "Technical"}, {"JavaScript", "Technical"},
                {"TypeScript", "Technical"}, {"ReactJS", "Technical"}, {"NodeJS", "Technical"},
                {"Python", "Technical"}, {"C#/.NET", "Technical"}, {"PHP", "Technical"},
                {"SQL", "Technical"}, {"PostgreSQL", "Technical"}, {"MongoDB", "Technical"},
                {"Docker", "Technical"}, {"Kubernetes", "Technical"}, {"CI/CD", "Technical"},
                {"AWS", "Technical"}, {"Git", "Technical"}, {"REST API", "Technical"},
                {"Microservices", "Technical"}, {"Kiểm thử phần mềm", "Technical"},
                {"Figma", "Tool"}, {"Jira", "Tool"}, {"Excel nâng cao", "Tool"},
                {"Giao tiếp", "Soft skill"}, {"Làm việc nhóm", "Soft skill"},
                {"Giải quyết vấn đề", "Soft skill"}, {"Quản lý thời gian", "Soft skill"},
                {"Tư duy phản biện", "Soft skill"}, {"Thuyết trình", "Soft skill"},
                {"Lãnh đạo", "Soft skill"}, {"Đàm phán", "Soft skill"},
                {"Tiếng Anh", "Language"}, {"Tiếng Nhật", "Language"},
                {"Tiếng Hàn", "Language"}, {"Tiếng Trung", "Language"},
        };
        for (String[] s : skills) {
            if (!skillRepository.existsByNameIgnoreCase(s[0])) {
                skillRepository.save(Skill.builder()
                        .name(s[0]).category(s[1]).active(true).build());
            }
        }
    }

    /**
     * Mau email khop voi NotificationType cua notification-service (code = ten enum).
     * Placeholder kha dung: title, message, recipientName, resourceType, resourceId.
     */
    private void seedEmailTemplates() {
        String[][] templates = {
                {"REQUISITION_PENDING_APPROVAL", "[ATS] Yêu cầu tuyển dụng chờ phê duyệt",
                        "Xin chào {{recipientName}},\n\nCó một yêu cầu tuyển dụng đang chờ bạn phê duyệt.\n\n{{message}}\n\nMã yêu cầu: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để xem chi tiết và xử lý.\n\nTrân trọng,\nHệ thống ATS"},
                {"APPLICATION_CREATED", "[ATS] Hồ sơ ứng tuyển mới",
                        "Xin chào {{recipientName}},\n\nMột hồ sơ ứng tuyển mới vừa được ghi nhận.\n\n{{message}}\n\nMã hồ sơ: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để sàng lọc hồ sơ.\n\nTrân trọng,\nHệ thống ATS"},
                {"APPLICATION_STAGE_CHANGED", "[ATS] Hồ sơ chuyển giai đoạn tuyển dụng",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nMã hồ sơ: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để theo dõi tiến độ.\n\nTrân trọng,\nHệ thống ATS"},
                {"APPLICATION_REJECTED", "[ATS] Kết quả hồ sơ ứng tuyển",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nMã hồ sơ: {{resourceId}}\nCảm ơn bạn đã quan tâm và dành thời gian cho vị trí này.\n\nTrân trọng,\nHệ thống ATS"},
                {"INTERVIEW_SCHEDULED", "[ATS] Lịch phỏng vấn đã được sắp xếp",
                        "Xin chào {{recipientName}},\n\nMột buổi phỏng vấn vừa được sắp xếp.\n\n{{message}}\n\nMã lịch phỏng vấn: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để xem chi tiết và xác nhận tham dự.\n\nTrân trọng,\nHệ thống ATS"},
                {"INTERVIEW_CONFIRMED", "[ATS] Xác nhận tham dự phỏng vấn",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nMã lịch phỏng vấn: {{resourceId}}\n\nTrân trọng,\nHệ thống ATS"},
                {"INTERVIEW_REMINDER", "[ATS] Nhắc lịch phỏng vấn sắp diễn ra",
                        "Xin chào {{recipientName}},\n\nĐây là email nhắc bạn về buổi phỏng vấn sắp diễn ra.\n\n{{message}}\n\nMã lịch phỏng vấn: {{resourceId}}\nVui lòng chuẩn bị và tham dự đúng giờ.\n\nTrân trọng,\nHệ thống ATS"},
                {"EVALUATION_INCOMPLETE_REMINDER", "[ATS] Nhắc hoàn tất đánh giá phỏng vấn",
                        "Xin chào {{recipientName}},\n\nBạn còn phiếu đánh giá phỏng vấn chưa hoàn tất.\n\n{{message}}\n\nMã lịch phỏng vấn: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để hoàn tất đánh giá.\n\nTrân trọng,\nHệ thống ATS"},
                {"OFFER_PENDING_CONFIRMATION", "[ATS] Đề nghị tuyển dụng chờ phê duyệt",
                        "Xin chào {{recipientName}},\n\nCó một đề nghị tuyển dụng đang chờ bạn phê duyệt.\n\n{{message}}\n\nMã đề nghị: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để xem chi tiết và xử lý.\n\nTrân trọng,\nHệ thống ATS"},
                {"OFFER_READY_FOR_CANDIDATE", "[ATS] Thư mời nhận việc",
                        "Xin chào {{recipientName}},\n\nChúng tôi rất vui được gửi đến bạn đề nghị nhận việc.\n\n{{message}}\n\nMã đề nghị: {{resourceId}}\nVui lòng phản hồi để chúng tôi hoàn tất các thủ tục tiếp theo.\n\nTrân trọng,\nHệ thống ATS"},
                {"OFFER_ACCEPTED", "[ATS] Ứng viên đã chấp nhận đề nghị",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nMã đề nghị: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để chuẩn bị thủ tục tiếp nhận.\n\nTrân trọng,\nHệ thống ATS"},
                {"OFFER_DECLINED", "[ATS] Ứng viên đã từ chối đề nghị",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nMã đề nghị: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để xem chi tiết.\n\nTrân trọng,\nHệ thống ATS"},
                {"APPLICATION_COMMENT_MENTION", "[ATS] Bạn được nhắc đến trong một bình luận",
                        "Xin chào {{recipientName}},\n\nBạn vừa được nhắc đến trong một bình luận về hồ sơ ứng tuyển.\n\n{{message}}\n\nMã hồ sơ: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để phản hồi.\n\nTrân trọng,\nHệ thống ATS"},
                {"APPLICATION_STALE_REMINDER", "[ATS] Hồ sơ tồn đọng cần xử lý",
                        "Xin chào {{recipientName}},\n\nCó hồ sơ ứng tuyển đã lâu chưa được cập nhật trạng thái.\n\n{{message}}\n\nMã hồ sơ: {{resourceId}}\nVui lòng đăng nhập hệ thống ATS để xử lý.\n\nTrân trọng,\nHệ thống ATS"},
        };
        for (String[] t : templates) {
            if (!emailTemplateRepository.existsByCodeIgnoreCase(t[0])) {
                emailTemplateRepository.save(EmailTemplate.builder()
                        .code(t[0]).subject(t[1]).body(t[2]).active(true).build());
            }
        }
    }

    private void seedDefaultPipeline() {
        if (pipelineRepository.count() > 0) {
            return;
        }

        RecruitmentPipeline pipeline = RecruitmentPipeline.builder()
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
