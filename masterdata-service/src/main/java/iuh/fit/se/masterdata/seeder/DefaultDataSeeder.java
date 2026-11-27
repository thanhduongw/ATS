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

    /**
     * Mẫu email theo loại thông báo. Mã = tên NotificationType; loại gửi cho cả ứng viên lẫn nhân viên có hai mẫu
     * riêng (hậu tố __CANDIDATE / __STAFF). notification-service bọc nội dung vào khung HTML (tên, logo, màu công ty)
     * và tự thêm nút dẫn tới trang liên quan. Biến: {{recipientName}}, {{message}}, {{title}}, {{companyName}}, {{link}}.
     */
    private void seedEmailTemplates() {
        String[][] templates = {
                {"REQUISITION_PENDING_APPROVAL", "Yêu cầu tuyển dụng mới cần bạn phê duyệt",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng xem nội dung yêu cầu và phê duyệt hoặc phản hồi cho phòng ban trong thời gian sớm nhất.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"REQUISITION_REVIEWED", "{{title}}",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nBạn có thể xem chi tiết kết quả và nội dung cần bổ sung (nếu có) trong hệ thống.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"APPLICATION_CREATED", "Có hồ sơ ứng tuyển mới",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng xem hồ sơ và tiến hành sàng lọc.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"APPLICATION_STAGE_CHANGED__STAFF", "{{title}}",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"APPLICATION_STALE_REMINDER", "Nhắc nhở: có hồ sơ ứng tuyển chưa được xử lý",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng cập nhật trạng thái hồ sơ để ứng viên không phải chờ đợi lâu.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"APPLICATION_COMMENT_MENTION", "{{title}}",
                        "Xin chào {{recipientName}},\n\nBạn được nhắc đến trong một bình luận về hồ sơ ứng tuyển:\n\n“{{message}}”\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"INTERVIEW_SCHEDULED", "Bạn được phân công phỏng vấn",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng kiểm tra lịch và xác nhận để lời mời phỏng vấn được gửi tới ứng viên.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"INTERVIEW_CONFIRMED", "Ứng viên đã xác nhận lịch phỏng vấn",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"INTERVIEW_CANDIDATE_DECLINED", "Ứng viên đề nghị dời lịch phỏng vấn",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng sắp xếp lại thời gian phù hợp cho buổi phỏng vấn.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"INTERVIEW_CANCELLED__STAFF", "Buổi phỏng vấn đã bị huỷ",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"INTERVIEW_REMINDER__STAFF", "Nhắc lịch phỏng vấn sắp diễn ra",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng nộp phiếu đánh giá trong hệ thống sau khi kết thúc buổi phỏng vấn.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"EVALUATION_INCOMPLETE_REMINDER", "Nhắc nhở: phiếu đánh giá phỏng vấn chưa hoàn tất",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"OFFER_PENDING_CONFIRMATION", "Thư mời nhận việc đã được gửi tới ứng viên",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"OFFER_ACCEPTED", "Ứng viên đã chấp nhận thư mời nhận việc",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng chuẩn bị các thủ tục tiếp nhận nhân sự mới.\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"OFFER_DECLINED", "Ứng viên đã từ chối thư mời nhận việc",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nTrân trọng,\nHệ thống tuyển dụng {{companyName}}"},
                {"APPLICATION_RECEIVED", "{{companyName}} đã nhận hồ sơ ứng tuyển của bạn",
                        "Xin chào {{recipientName}},\n\nCảm ơn bạn đã quan tâm đến cơ hội nghề nghiệp tại {{companyName}}. {{message}}\n\nBộ phận Tuyển dụng sẽ xem xét hồ sơ và liên hệ với bạn trong thời gian sớm nhất. Bạn có thể theo dõi tiến độ hồ sơ bất cứ lúc nào.\n\nTrân trọng,\nBộ phận Tuyển dụng {{companyName}}"},
                {"APPLICATION_STAGE_CHANGED__CANDIDATE", "{{title}}",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nBạn có thể xem chi tiết tiến độ hồ sơ trong trang cá nhân.\n\nTrân trọng,\nBộ phận Tuyển dụng {{companyName}}"},
                {"APPLICATION_REJECTED", "Kết quả hồ sơ ứng tuyển tại {{companyName}}",
                        "Xin chào {{recipientName}},\n\nCảm ơn bạn đã dành thời gian ứng tuyển và tìm hiểu về {{companyName}}. {{message}}\n\nChúng tôi trân trọng sự quan tâm của bạn và hy vọng có dịp hợp tác trong những cơ hội phù hợp hơn. Chúc bạn nhiều thành công.\n\nTrân trọng,\nBộ phận Tuyển dụng {{companyName}}"},
                {"INTERVIEW_HM_CONFIRMED", "Thư mời phỏng vấn tại {{companyName}}",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng xác nhận tham dự trong hệ thống. Nếu không thể tham gia vào thời gian này, bạn có thể đề nghị dời lịch.\n\nTrân trọng,\nBộ phận Tuyển dụng {{companyName}}"},
                {"INTERVIEW_CANCELLED__CANDIDATE", "Thông báo huỷ lịch phỏng vấn",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nChúng tôi thành thật xin lỗi vì sự bất tiện này.\n\nTrân trọng,\nBộ phận Tuyển dụng {{companyName}}"},
                {"INTERVIEW_REMINDER__CANDIDATE", "Nhắc lịch phỏng vấn tại {{companyName}}",
                        "Xin chào {{recipientName}},\n\n{{message}}\n\nVui lòng có mặt (hoặc vào phòng họp trực tuyến) trước giờ hẹn vài phút. Chúc bạn có buổi phỏng vấn thành công.\n\nTrân trọng,\nBộ phận Tuyển dụng {{companyName}}"},
                {"OFFER_READY_FOR_CANDIDATE", "Thư mời nhận việc từ {{companyName}}",
                        "Xin chào {{recipientName}},\n\nChúc mừng bạn! {{message}}\n\nChúng tôi rất mong được chào đón bạn gia nhập đội ngũ {{companyName}}.\n\nTrân trọng,\nBộ phận Tuyển dụng {{companyName}}"}
        };
        java.util.Map<String, String[]> byCode = new java.util.HashMap<>();
        for (String[] t : templates) byCode.put(t[0].toUpperCase(), t);
        // Mẫu mặc định đời cũ (tiêu đề "[ATS] ...", ký "Hệ thống ATS") mà Quản trị chưa sửa: thay bằng bản mới;
        // mẫu chung cũ của loại đã tách theo người nhận thì xoá. Mẫu Quản trị đã sửa thì giữ nguyên.
        for (EmailTemplate old : emailTemplateRepository.findAll()) {
            boolean untouchedLegacy = old.getSubject() != null && old.getSubject().startsWith("[ATS] ")
                    && old.getBody() != null && old.getBody().contains("Hệ thống ATS");
            if (!untouchedLegacy) continue;
            String[] t = byCode.get(old.getCode().toUpperCase());
            if (t != null) {
                old.setSubject(t[1]);
                old.setBody(t[2]);
                emailTemplateRepository.save(old);
            } else if (LEGACY_SPLIT_CODES.contains(old.getCode().toUpperCase())) {
                emailTemplateRepository.delete(old);
            }
        }
        for (String[] t : templates) {
            if (!emailTemplateRepository.existsByCodeIgnoreCase(t[0])) {
                emailTemplateRepository.save(EmailTemplate.builder()
                        .code(t[0]).subject(t[1]).body(t[2]).active(true).build());
            }
        }
    }

    /** Loại thông báo trước dùng một mẫu chung, nay tách mẫu theo người nhận. */
    private static final java.util.Set<String> LEGACY_SPLIT_CODES =
            java.util.Set.of("APPLICATION_STAGE_CHANGED", "INTERVIEW_REMINDER", "INTERVIEW_CANCELLED");

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
