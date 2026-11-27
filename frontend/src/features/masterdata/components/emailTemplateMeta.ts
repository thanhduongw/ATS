/**
 * Mô tả từng mẫu email: tên, khi nào gửi, ai nhận, nội dung mẫu để xem trước.
 * Mã phải khớp notification-service: mã = tên NotificationType; loại gửi cho cả ứng viên lẫn nhân viên
 * có hai mẫu riêng (hậu tố __CANDIDATE / __STAFF). Bộ mẫu do DefaultDataSeeder (masterdata-service) nạp sẵn.
 */
export interface EmailTemplateMeta {
    name: string;
    when: string;
    to: string;
    /** Giá trị {{title}} / {{message}} mẫu khi xem trước. */
    sampleTitle: string;
    sampleMessage: string;
}

const CANDIDATE = "Ứng viên";
const RECRUITER = "Chuyên viên tuyển dụng";
const DEPARTMENT = "Đại diện phòng ban";
const INTERVIEWER = "Người phỏng vấn";

export const EMAIL_TEMPLATE_META: Record<string, EmailTemplateMeta> = {
    APPLICATION_RECEIVED: {
        name: "Xác nhận đã nhận hồ sơ", when: "Ứng viên vừa nộp hồ sơ", to: CANDIDATE,
        sampleTitle: "Đã nhận hồ sơ ứng tuyển", sampleMessage: "Công ty đã nhận hồ sơ của bạn cho vị trí Kế toán tổng hợp.",
    },
    APPLICATION_STAGE_CHANGED__CANDIDATE: {
        name: "Cập nhật hồ sơ (gửi ứng viên)", when: "Hồ sơ chuyển giai đoạn hoặc ứng viên rút đơn", to: CANDIDATE,
        sampleTitle: "Hồ sơ của bạn đã chuyển sang vòng Phỏng vấn",
        sampleMessage: "Hồ sơ ứng tuyển vị trí Kế toán tổng hợp của bạn đã chuyển sang vòng Phỏng vấn.",
    },
    APPLICATION_REJECTED: {
        name: "Kết quả hồ sơ — chưa phù hợp", when: "Hồ sơ bị từ chối", to: CANDIDATE,
        sampleTitle: "Kết quả hồ sơ ứng tuyển",
        sampleMessage: "Rất tiếc, hồ sơ ứng tuyển vị trí Kế toán tổng hợp của bạn chưa phù hợp ở đợt này.",
    },
    INTERVIEW_HM_CONFIRMED: {
        name: "Thư mời phỏng vấn", when: "Lịch phỏng vấn đã được phòng ban chốt", to: CANDIDATE,
        sampleTitle: "Lịch phỏng vấn",
        sampleMessage: "Bạn có lịch phỏng vấn lúc 09:00 thứ Hai, 07/12/2026 tại Văn phòng Hà Nội.",
    },
    INTERVIEW_REMINDER__CANDIDATE: {
        name: "Nhắc lịch phỏng vấn (gửi ứng viên)", when: "Trước giờ phỏng vấn", to: CANDIDATE,
        sampleTitle: "Nhắc lịch phỏng vấn",
        sampleMessage: "Buổi phỏng vấn của bạn diễn ra hôm nay, lúc 09:00 thứ Hai, 07/12/2026 tại Văn phòng Hà Nội.",
    },
    INTERVIEW_CANCELLED__CANDIDATE: {
        name: "Huỷ lịch phỏng vấn (gửi ứng viên)", when: "Buổi phỏng vấn bị huỷ", to: CANDIDATE,
        sampleTitle: "Lịch phỏng vấn đã huỷ",
        sampleMessage: "Buổi phỏng vấn lúc 09:00 thứ Hai, 07/12/2026 đã huỷ. Bộ phận tuyển dụng sẽ liên hệ nếu có lịch mới.",
    },
    OFFER_READY_FOR_CANDIDATE: {
        name: "Thư mời nhận việc", when: "Thư mời nhận việc được gửi", to: CANDIDATE,
        sampleTitle: "Bạn nhận được thư mời nhận việc",
        sampleMessage: "Công ty đã gửi thư mời nhận việc vị trí Kế toán tổng hợp cho bạn. Hãy xem và phản hồi trước hạn.",
    },
    REQUISITION_PENDING_APPROVAL: {
        name: "Yêu cầu tuyển dụng chờ duyệt", when: "Phòng ban gửi yêu cầu tuyển dụng", to: RECRUITER,
        sampleTitle: "Yêu cầu tuyển dụng cần bạn phê duyệt", sampleMessage: "Yêu cầu \"Kế toán tổng hợp\" đang chờ bạn phê duyệt.",
    },
    REQUISITION_REVIEWED: {
        name: "Kết quả duyệt yêu cầu tuyển dụng", when: "Yêu cầu được duyệt, từ chối hoặc cần sửa", to: DEPARTMENT,
        sampleTitle: "Yêu cầu tuyển dụng đã được duyệt", sampleMessage: "Yêu cầu \"Kế toán tổng hợp\" đã được duyệt.",
    },
    APPLICATION_CREATED: {
        name: "Có hồ sơ ứng tuyển mới", when: "Ứng viên nộp hồ sơ", to: RECRUITER,
        sampleTitle: "Hồ sơ ứng tuyển mới", sampleMessage: "Nguyễn Văn An vừa nộp hồ sơ ứng tuyển vị trí Kế toán tổng hợp.",
    },
    APPLICATION_STAGE_CHANGED__STAFF: {
        name: "Cập nhật hồ sơ (gửi nhân viên)", when: "Hồ sơ đổi giai đoạn, ứng viên rút đơn hoặc xoá dữ liệu", to: RECRUITER,
        sampleTitle: "Ứng viên rút đơn", sampleMessage: "Nguyễn Văn An đã rút đơn ứng tuyển vị trí Kế toán tổng hợp.",
    },
    APPLICATION_STALE_REMINDER: {
        name: "Nhắc hồ sơ tồn đọng", when: "Hồ sơ lâu ngày chưa được xử lý", to: RECRUITER,
        sampleTitle: "Hồ sơ chưa xử lý lâu ngày",
        sampleMessage: "Nguyễn Văn An đang ở giai đoạn \"Sàng lọc\" đã 7 ngày chưa được cập nhật.",
    },
    APPLICATION_COMMENT_MENTION: {
        name: "Được nhắc trong bình luận", when: "Có người nhắc tên bạn trong bình luận hồ sơ", to: `${RECRUITER}, ${DEPARTMENT}`,
        sampleTitle: "Trần Thị Bình đã nhắc đến bạn", sampleMessage: "Anh xem giúp em hồ sơ này trước thứ Sáu nhé.",
    },
    INTERVIEW_SCHEDULED: {
        name: "Phân công phỏng vấn", when: "Bạn được thêm vào một buổi phỏng vấn", to: INTERVIEWER,
        sampleTitle: "Lịch phỏng vấn chờ bạn xác nhận",
        sampleMessage: "Bạn được phân công phỏng vấn Nguyễn Văn An lúc 09:00 thứ Hai, 07/12/2026.",
    },
    INTERVIEW_CONFIRMED: {
        name: "Ứng viên xác nhận lịch", when: "Ứng viên xác nhận tham dự", to: INTERVIEWER,
        sampleTitle: "Ứng viên đã xác nhận lịch phỏng vấn", sampleMessage: "Nguyễn Văn An đã xác nhận lịch lúc 09:00 thứ Hai, 07/12/2026.",
    },
    INTERVIEW_CANDIDATE_DECLINED: {
        name: "Ứng viên xin dời lịch", when: "Ứng viên từ chối giờ phỏng vấn", to: RECRUITER,
        sampleTitle: "Ứng viên xin dời lịch phỏng vấn",
        sampleMessage: "Nguyễn Văn An xin dời buổi phỏng vấn lúc 09:00 thứ Hai, 07/12/2026. Lý do: trùng lịch học. Hãy đặt lại giờ mới.",
    },
    INTERVIEW_CANCELLED__STAFF: {
        name: "Huỷ lịch phỏng vấn (gửi nhân viên)", when: "Buổi phỏng vấn bị huỷ", to: INTERVIEWER,
        sampleTitle: "Buổi phỏng vấn đã huỷ", sampleMessage: "Buổi phỏng vấn Nguyễn Văn An lúc 09:00 thứ Hai, 07/12/2026 đã huỷ.",
    },
    INTERVIEW_REMINDER__STAFF: {
        name: "Nhắc lịch phỏng vấn (gửi nhân viên)", when: "Trước giờ phỏng vấn", to: INTERVIEWER,
        sampleTitle: "Nhắc lịch phỏng vấn", sampleMessage: "Buổi phỏng vấn Nguyễn Văn An diễn ra hôm nay, lúc 09:00.",
    },
    EVALUATION_INCOMPLETE_REMINDER: {
        name: "Nhắc nộp đánh giá phỏng vấn", when: "Sau buổi phỏng vấn còn phiếu chưa nộp", to: `${INTERVIEWER}, ${RECRUITER}`,
        sampleTitle: "Bạn chưa nộp đánh giá phỏng vấn",
        sampleMessage: "Vui lòng hoàn tất đánh giá cho buổi phỏng vấn Nguyễn Văn An lúc 09:00 thứ Hai, 07/12/2026.",
    },
    OFFER_PENDING_CONFIRMATION: {
        name: "Thư mời đã gửi ứng viên", when: "Thư mời nhận việc được duyệt và gửi", to: RECRUITER,
        sampleTitle: "Thư mời đã gửi cho ứng viên", sampleMessage: "Thư mời nhận việc vị trí Kế toán tổng hợp của Nguyễn Văn An đã được gửi.",
    },
    OFFER_ACCEPTED: {
        name: "Ứng viên nhận lời", when: "Ứng viên chấp nhận thư mời", to: RECRUITER,
        sampleTitle: "Ứng viên đã nhận lời", sampleMessage: "Nguyễn Văn An đã chấp nhận thư mời nhận việc vị trí Kế toán tổng hợp.",
    },
    OFFER_DECLINED: {
        name: "Ứng viên từ chối thư mời", when: "Ứng viên từ chối thư mời", to: RECRUITER,
        sampleTitle: "Ứng viên từ chối thư mời", sampleMessage: "Nguyễn Văn An đã từ chối thư mời nhận việc vị trí Kế toán tổng hợp.",
    },
};

/** Thứ tự hiển thị: theo thứ tự khai báo ở trên (email gửi ứng viên trước). */
export const EMAIL_TEMPLATE_ORDER = Object.keys(EMAIL_TEMPLATE_META);

/** Biến dùng được trong tiêu đề / nội dung. */
export const EMAIL_VARIABLES: { key: string; label: string }[] = [
    { key: "recipientName", label: "tên người nhận" },
    { key: "message", label: "nội dung chi tiết của thông báo (tên ứng viên, vị trí, giờ…)" },
    { key: "title", label: "tiêu đề ngắn của thông báo" },
    { key: "companyName", label: "tên công ty" },
    { key: "link", label: "đường dẫn tới trang liên quan (nút bấm đã tự thêm cuối thư)" },
];
