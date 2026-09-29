/**
 * Chuỗi hiển thị dùng chung (quy tắc 7 của CLAUDE.md). Chuỗi chỉ thuộc về một màn thì đặt
 * dưới khóa của màn đó khi làm màn ấy.
 */
export const STRINGS = {
  common: {
    retry: "Thử lại",
    back: "Quay lại",
    close: "Đóng",
    clearSearch: "Xóa nội dung tìm kiếm",
    showPassword: "Hiện mật khẩu",
    hidePassword: "Ẩn mật khẩu",
    required: " *",
    loading: "Đang tải",
  },
  errorState: {
    title: "Không tải được dữ liệu",
    fallback: "Kiểm tra kết nối mạng rồi thử lại.",
  },
  tabs: {
    candidate: {
      jobs: "Việc làm",
      applications: "Đơn của tôi",
      interviews: "Lịch PV",
      profile: "Hồ sơ",
    },
    hm: {
      todo: "Cần duyệt",
      interviews: "Phỏng vấn",
    },
    hr: {
      home: "Tổng quan",
      requisitions: "Yêu cầu TD",
      applications: "Hồ sơ",
    },
  },
  placeholder: {
    session: "Phiên đăng nhập",
    email: "Email",
    role: "Vai trò",
    department: "Phòng ban",
    signOut: "Đăng xuất",
  },
  roles: {
    COMPANY_ADMIN: "Quản trị doanh nghiệp",
    RECRUITER: "Chuyên viên tuyển dụng",
    HIRING_MANAGER: "Quản lý tuyển dụng",
    CANDIDATE: "Ứng viên",
  },

  /** Nhãn trạng thái — chỉ đọc qua `src/lib/status.ts`, đừng lấy thẳng ở màn hình. */
  status: {
    stage: {
      APPLIED: "Ứng tuyển",
      CV_SCREENING: "Sàng lọc CV",
      HR_SCREENING: "Sàng lọc HR",
      TECHNICAL_INTERVIEW: "PV kỹ thuật",
      HR_INTERVIEW: "PV HR",
      FINAL_INTERVIEW: "PV vòng cuối",
      OFFER: "Đề nghị nhận việc",
      HIRED: "Đã tuyển dụng",
      REJECTED: "Từ chối",
      CUSTOM: "Vòng khác",
    },
    interview: {
      SCHEDULED: "Chờ HM xác nhận",
      HM_RESCHEDULE_PROPOSED: "HM đề xuất đổi giờ",
      HM_CONFIRMED: "Chờ ứng viên xác nhận",
      CANDIDATE_CONFIRMED: "Đã xác nhận",
      EVALUATION_PENDING: "Chờ đánh giá",
      COMPLETED: "Hoàn tất",
      NO_SHOW: "Vắng mặt",
      CANCELLED: "Đã hủy",
    },
    /** Ứng viên nhìn cùng một trạng thái theo góc của mình. */
    interviewForCandidate: {
      HM_CONFIRMED: "Chờ xác nhận",
      EVALUATION_PENDING: "Đã diễn ra",
      COMPLETED: "Đã diễn ra",
    },
    offer: {
      DRAFT: "Nháp",
      PENDING_APPROVAL: "Chờ duyệt",
      APPROVED: "Đã gửi ứng viên",
      REJECTED: "Không được duyệt",
      ACCEPTED: "Đã nhận việc",
      DECLINED: "Ứng viên từ chối",
    },
    offerForCandidate: {
      APPROVED: "Chờ phản hồi",
      DECLINED: "Đã từ chối",
    },
    requisition: {
      DRAFT: "Nháp",
      PENDING_APPROVAL: "Chờ duyệt",
      APPROVED: "Đã duyệt",
      REJECTED: "Bị từ chối",
      CHANGES_REQUESTED: "Cần chỉnh sửa",
    },
    posting: {
      DRAFT: "Nháp",
      EDITING: "Đang sửa",
      APPROVED: "Đã duyệt",
      OPEN: "Đang mở",
      PAUSED: "Tạm dừng",
      CLOSED: "Đã đóng",
    },
    unknown: "Không rõ",
  },
} as const;
