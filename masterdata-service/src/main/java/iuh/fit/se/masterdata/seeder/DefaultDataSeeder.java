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
        List.of("Toàn thời gian", "Bán thời gian", "Thực tập", "Cộng tác viên")
                .forEach(name -> {
                    if (!employmentTypeRepository.existsByNameIgnoreCase(name)) {
                        employmentTypeRepository.save(
                                EmploymentType.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedContractTypes() {
        List.of("Không xác định thời hạn", "Xác định thời hạn 12 tháng", "Xác định thời hạn 24 tháng",
                        "Thực tập", "Cộng tác viên")
                .forEach(name -> {
                    if (!contractTypeRepository.existsByNameIgnoreCase(name)) {
                        contractTypeRepository.save(
                                ContractType.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedRecruitmentSources() {
        List.of("Trang tuyển dụng của công ty", "ITviec", "TopDev", "LinkedIn", "TopCV", "VietnamWorks",
                        "Giới thiệu nội bộ", "Nhóm Facebook về IT", "Ngày hội việc làm IT", "Headhunter")
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
        List.of("Chưa đủ số năm kinh nghiệm", "Kỹ năng kỹ thuật chưa đạt", "Chưa đạt bài phỏng vấn kỹ thuật",
                        "Công nghệ chính không khớp vị trí", "Mức lương mong muốn vượt khung",
                        "Vị trí đã tuyển đủ", "Tiếng Anh chưa đạt yêu cầu", "Không phản hồi liên hệ",
                        "Chưa phù hợp cách làm việc của nhóm", "Đã nhận việc ở công ty khác",
                        "Hồ sơ thiếu thông tin")
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
        List.of("Kiến thức nền tảng (cấu trúc dữ liệu, thuật toán)", "Kỹ năng lập trình và chất lượng mã",
                        "Thiết kế hệ thống", "Tư duy giải quyết vấn đề", "Kinh nghiệm dự án thực tế",
                        "Giao tiếp và làm việc nhóm", "Tinh thần học hỏi", "Tiếng Anh đọc tài liệu kỹ thuật")
                .forEach(name -> {
                    if (!interviewCriteriaRepository.existsByNameIgnoreCase(name)) {
                        interviewCriteriaRepository.save(
                                InterviewCriteria.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedDepartments() {
        String[][] departments = {
                {"Phòng Backend", "Xây dựng dịch vụ, API và cơ sở dữ liệu của sản phẩm"},
                {"Phòng Frontend", "Phát triển giao diện web của sản phẩm"},
                {"Phòng Mobile", "Phát triển ứng dụng iOS và Android"},
                {"Phòng Kiểm thử (QA)", "Kiểm thử thủ công, kiểm thử tự động và đảm bảo chất lượng"},
                {"Phòng DevOps & Cloud", "Hạ tầng, triển khai liên tục và vận hành hệ thống"},
                {"Phòng Dữ liệu & AI", "Kỹ thuật dữ liệu, phân tích và mô hình học máy"},
                {"Phòng Nhân sự", "Tuyển dụng, đào tạo và chăm sóc nhân viên"},
        };
        for (String[] d : departments) {
            if (!departmentRepository.existsByNameIgnoreCase(d[0])) {
                departmentRepository.save(Department.builder()
                        .name(d[0]).description(d[1]).active(true).build());
            }
        }
    }

    private void seedJobLevels() {
        String[] names = {"Intern", "Fresher", "Junior", "Middle", "Senior", "Tech Lead", "Engineering Manager"};
        for (int i = 0; i < names.length; i++) {
            if (!jobLevelRepository.existsByNameIgnoreCase(names[i])) {
                jobLevelRepository.save(JobLevel.builder()
                        .name(names[i]).orderNo(i + 1).active(true).build());
            }
        }
    }

    private void seedJobTitles() {
        List.of("Lập trình viên Backend", "Lập trình viên Frontend", "Lập trình viên Full-stack",
                        "Lập trình viên Mobile", "Kỹ sư kiểm thử phần mềm", "Kỹ sư kiểm thử tự động",
                        "Kỹ sư DevOps", "Kỹ sư Cloud", "Kỹ sư dữ liệu", "Kỹ sư AI/ML",
                        "Chuyên viên phân tích dữ liệu", "Chuyên viên phân tích nghiệp vụ",
                        "Thiết kế UI/UX", "Quản lý dự án phần mềm", "Chuyên viên an toàn thông tin",
                        "Chuyên viên tuyển dụng IT")
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
                {"Văn phòng TP. Hồ Chí Minh", "Tầng 8, 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh"},
                {"Văn phòng Hà Nội", "Tầng 15, 86 Duy Tân, Quận Cầu Giấy, Hà Nội"},
                {"Văn phòng Đà Nẵng", "Tầng 4, 15 Quang Trung, Quận Hải Châu, Đà Nẵng"},
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
                {"Java", "Chuyên môn"}, {"Spring Boot", "Chuyên môn"}, {"Node.js", "Chuyên môn"},
                {"Python", "Chuyên môn"}, {"Go", "Chuyên môn"}, {"C#/.NET", "Chuyên môn"},
                {"JavaScript", "Chuyên môn"}, {"TypeScript", "Chuyên môn"}, {"React", "Chuyên môn"},
                {"Vue.js", "Chuyên môn"}, {"Next.js", "Chuyên môn"}, {"HTML/CSS", "Chuyên môn"},
                {"React Native", "Chuyên môn"}, {"Flutter", "Chuyên môn"}, {"Kotlin", "Chuyên môn"},
                {"Swift", "Chuyên môn"}, {"SQL", "Chuyên môn"}, {"PostgreSQL", "Chuyên môn"},
                {"MySQL", "Chuyên môn"}, {"MongoDB", "Chuyên môn"}, {"Redis", "Chuyên môn"},
                {"Kafka", "Chuyên môn"}, {"RabbitMQ", "Chuyên môn"}, {"REST API", "Chuyên môn"},
                {"Microservices", "Chuyên môn"}, {"Docker", "Chuyên môn"}, {"Kubernetes", "Chuyên môn"},
                {"CI/CD", "Chuyên môn"}, {"AWS", "Chuyên môn"}, {"Linux", "Chuyên môn"},
                {"Terraform", "Chuyên môn"}, {"Kiểm thử thủ công", "Chuyên môn"},
                {"Selenium", "Chuyên môn"}, {"Playwright", "Chuyên môn"}, {"Kiểm thử API", "Chuyên môn"},
                {"Machine Learning", "Chuyên môn"}, {"PyTorch", "Chuyên môn"}, {"Pandas", "Chuyên môn"},
                {"Airflow", "Chuyên môn"}, {"Spark", "Chuyên môn"},
                {"Git", "Công cụ"}, {"Jira", "Công cụ"}, {"Figma", "Công cụ"}, {"Postman", "Công cụ"},
                {"Giao tiếp", "Kỹ năng mềm"}, {"Làm việc nhóm", "Kỹ năng mềm"},
                {"Giải quyết vấn đề", "Kỹ năng mềm"}, {"Tự học", "Kỹ năng mềm"},
                {"Tiếng Anh", "Ngoại ngữ"}, {"Tiếng Nhật", "Ngoại ngữ"},
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

    /** Tên quy trình 6 bước — một bước cho mỗi giai đoạn cố định của giao diện (docs/UI DS06). */
    public static final String SIX_STAGE_PIPELINE_NAME = "Quy trình 6 giai đoạn";

    /**
     * Quy trình mặc định cho tin MỚI là quy trình 6 bước (quyết định Q8 = b,
     * docs/learning/03-ke-hoach-trien-khai-ui.md mục 9): Ứng tuyển · Sàng lọc · Phỏng vấn ·
     * Thư mời · Đã tuyển · Từ chối. Tin cũ vẫn giữ quy trình đang gắn (thường là 9 bước), không đổi.
     * Chạy lại nhiều lần an toàn: chỉ tạo khi chưa có, rồi đảm bảo đây là quy trình mặc định DUY NHẤT.
     */
    private void seedDefaultPipeline() {
        RecruitmentPipeline sixStage = pipelineRepository.findFirstByNameIgnoreCase(SIX_STAGE_PIPELINE_NAME)
                .orElseGet(() -> pipelineRepository.save(buildSixStagePipeline()));
        for (RecruitmentPipeline p : pipelineRepository.findAll()) {
            boolean shouldBeDefault = p.getId().equals(sixStage.getId());
            if (p.isDefault() != shouldBeDefault) {
                p.setDefault(shouldBeDefault);
                pipelineRepository.save(p);
            }
        }
    }

    /**
     * Bước Sàng lọc dùng CV_SCREENING: interview-service chỉ cho lên lịch khi hồ sơ đã VƯỢT QUA
     * bước CV_SCREENING (InterviewService.create), nên chuyển sang "Phỏng vấn" là lên lịch được ngay
     * (khớp R34 "Mở lịch phỏng vấn ngay sau khi chuyển"). Mỗi lần "chuyển tiếp" = sang giai đoạn kế.
     */
    static RecruitmentPipeline buildSixStagePipeline() {
        RecruitmentPipeline pipeline = RecruitmentPipeline.builder()
                .name(SIX_STAGE_PIPELINE_NAME)
                .isDefault(true)
                .active(true)
                .build();

        Object[][] stages = {
                {"Ứng tuyển", StageType.APPLIED, 1},
                {"Sàng lọc", StageType.CV_SCREENING, 2},
                {"Phỏng vấn", StageType.TECHNICAL_INTERVIEW, 3},
                {"Thư mời", StageType.OFFER, 4},
                {"Đã tuyển", StageType.HIRED, 5},
                {"Từ chối", StageType.REJECTED, 6},
        };
        for (Object[] s : stages) {
            pipeline.getStages().add(PipelineStage.builder()
                    .pipeline(pipeline)
                    .name((String) s[0])
                    .stageType((StageType) s[1])
                    .stageOrder((Integer) s[2])
                    .build());
        }
        return pipeline;
    }
}
