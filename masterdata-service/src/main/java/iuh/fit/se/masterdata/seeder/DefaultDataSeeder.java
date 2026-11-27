package iuh.fit.se.masterdata.seeder;

import iuh.fit.se.masterdata.contracttype.ContractType;
import iuh.fit.se.masterdata.contracttype.ContractTypeRepository;
import iuh.fit.se.masterdata.educationlevel.EducationLevel;
import iuh.fit.se.masterdata.educationlevel.EducationLevelRepository;
import iuh.fit.se.masterdata.emailtemplate.EmailTemplate;
import iuh.fit.se.masterdata.emailtemplate.EmailTemplateRepository;
import iuh.fit.se.masterdata.employmenttype.EmploymentType;
import iuh.fit.se.masterdata.employmenttype.EmploymentTypeRepository;
import iuh.fit.se.masterdata.experiencelevel.ExperienceLevel;
import iuh.fit.se.masterdata.experiencelevel.ExperienceLevelRepository;
import iuh.fit.se.masterdata.pipeline.PipelineRepository;
import iuh.fit.se.masterdata.pipeline.PipelineStage;
import iuh.fit.se.masterdata.pipeline.RecruitmentPipeline;
import iuh.fit.se.masterdata.pipeline.enums.StageType;
import iuh.fit.se.masterdata.recruitmentsource.RecruitmentSource;
import iuh.fit.se.masterdata.recruitmentsource.RecruitmentSourceRepository;
import iuh.fit.se.masterdata.rejectionreason.RejectionReason;
import iuh.fit.se.masterdata.rejectionreason.RejectionReasonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Nạp danh mục mặc định mỗi lần masterdata-service khởi động; bản ghi đã tồn tại (theo name / code) thì bỏ qua.
 *
 * Chỉ nạp những gì hệ thống cần để chạy hoặc mọi công ty đều dùng như nhau:
 * mẫu email (notification-service tìm theo mã), quy trình 6 giai đoạn, nguồn "Trang tuyển dụng của công ty",
 * lý do từ chối chung, loại hình làm việc, loại hợp đồng, trình độ học vấn, mức kinh nghiệm.
 * Phòng ban, chức danh, cấp bậc, kỹ năng, địa điểm làm việc, tiêu chí phỏng vấn do Quản trị tự cấu hình.
 */
@Component
@RequiredArgsConstructor
public class DefaultDataSeeder {

    public static final String CAREERS_SITE_SOURCE = "Trang tuyển dụng của công ty";

    private final EmploymentTypeRepository employmentTypeRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final RecruitmentSourceRepository recruitmentSourceRepository;
    private final EducationLevelRepository educationLevelRepository;
    private final RejectionReasonRepository rejectionReasonRepository;
    private final PipelineRepository pipelineRepository;
    private final ExperienceLevelRepository experienceLevelRepository;
    private final EmailTemplateRepository emailTemplateRepository;

    @Transactional
    public void seedDefaults() {
        seedEmploymentTypes();
        seedContractTypes();
        seedRecruitmentSources();
        seedEducationLevels();
        seedRejectionReasons();
        seedExperienceLevels();
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
        // Bộ luật Lao động 2019, Điều 20: chỉ có hai loại hợp đồng lao động.
        List.of("Không xác định thời hạn", "Xác định thời hạn")
                .forEach(name -> {
                    if (!contractTypeRepository.existsByNameIgnoreCase(name)) {
                        contractTypeRepository.save(
                                ContractType.builder().name(name).active(true).build());
                    }
                });
    }

    private void seedRecruitmentSources() {
        // Bắt buộc: ứng viên tự nộp đơn trên web/mobile được gán nguồn này (ApplyJobPage, jobs/apply.tsx).
        // Các nguồn khác (LinkedIn, TopCV, giới thiệu nội bộ...) do Quản trị tự thêm.
        List.of(CAREERS_SITE_SOURCE)
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
        // Bộ lý do chung, không gắn ngành nghề (tham khảo bộ mặc định của Greenhouse). Quản trị sửa / thêm tuỳ công ty.
        List.of("Thiếu kỹ năng hoặc trình độ theo yêu cầu", "Đã chọn ứng viên khác phù hợp hơn",
                        "Chưa phù hợp văn hoá công ty", "Hồ sơ trùng", "Ứng viên từ chối đề nghị",
                        "Ứng viên không còn quan tâm", "Khác")
                .forEach(name -> {
                    if (!rejectionReasonRepository.existsByNameIgnoreCase(name)) {
                        rejectionReasonRepository.save(
                                RejectionReason.builder().name(name).active(true).build());
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
