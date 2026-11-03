import type { CatalogConfig, CatalogGroup } from "./types";

/**
 * Các danh mục hiện trên màn Danh mục (R41). Quy trình tuyển dụng (pipeline) không còn ở đây:
 * mọi vị trí dùng 6 giai đoạn cố định (DS06, quyết định B1).
 * "Trạng thái tuyển dụng" bị bỏ khỏi màn vì không còn nơi nào dùng.
 */
export const CATALOG_GROUPS: { key: CatalogGroup; label: string }[] = [
    { key: "ORG", label: "Tổ chức" },
    { key: "WORK", label: "Điều kiện làm việc" },
    { key: "CANDIDATE", label: "Hồ sơ ứng viên" },
    { key: "EVALUATION", label: "Đánh giá & từ chối" },
    { key: "OTHER", label: "Thông báo & tuỳ chỉnh" },
];

/** Hai mục không dùng bảng danh mục chung. */
export const SPECIAL_CATALOGS = {
    emailTemplates: "emailTemplates",
    customFields: "customFields",
} as const;

export const catalogConfigs: CatalogConfig[] = [
    {
        key: "departments",
        tabLabel: "Phòng ban",
        title: "Phòng ban",
        endpoint: "/masterdata/departments",
        primaryField: "name",
        secondaryField: "description",
        group: "ORG",
        hint: "Dùng cho yêu cầu tuyển dụng và phân quyền đại diện phòng ban",
        addLabel: "Thêm phòng ban",
        fields: [
            { name: "name", label: "Tên phòng ban", type: "text", required: true },
            { name: "description", label: "Mô tả", type: "textarea" },
        ],
    },
    {
        key: "jobTitles",
        tabLabel: "Chức danh",
        title: "Chức danh",
        endpoint: "/masterdata/job-titles",
        primaryField: "name",
        group: "ORG",
        hint: "Tên chức danh chuẩn khi tạo yêu cầu",
        addLabel: "Thêm chức danh",
        fields: [{ name: "name", label: "Tên chức danh", type: "text", required: true }],
    },
    {
        key: "jobLevels",
        tabLabel: "Cấp bậc",
        title: "Cấp bậc",
        endpoint: "/masterdata/job-levels",
        primaryField: "name",
        group: "ORG",
        addLabel: "Thêm cấp bậc",
        fields: [
            { name: "name", label: "Tên cấp bậc", type: "text", required: true },
            { name: "orderNo", label: "Thứ tự", type: "number", required: true },
        ],
    },
    {
        key: "workLocations",
        tabLabel: "Địa điểm làm việc",
        title: "Địa điểm làm việc",
        endpoint: "/masterdata/work-locations",
        primaryField: "name",
        secondaryField: "address",
        group: "ORG",
        addLabel: "Thêm địa điểm",
        fields: [
            { name: "name", label: "Tên địa điểm", type: "text", required: true },
            { name: "address", label: "Địa chỉ", type: "text" },
        ],
    },
    {
        key: "employmentTypes",
        tabLabel: "Loại hình làm việc",
        title: "Loại hình làm việc",
        endpoint: "/masterdata/employment-types",
        primaryField: "name",
        group: "WORK",
        addLabel: "Thêm loại hình",
        fields: [{ name: "name", label: "Tên loại hình", type: "text", required: true }],
    },
    {
        key: "contractTypes",
        tabLabel: "Loại hợp đồng",
        title: "Loại hợp đồng",
        endpoint: "/masterdata/contract-types",
        primaryField: "name",
        group: "WORK",
        hint: "Dùng khi soạn thư mời",
        addLabel: "Thêm loại hợp đồng",
        fields: [{ name: "name", label: "Tên loại hợp đồng", type: "text", required: true }],
    },
    {
        key: "skills",
        tabLabel: "Kỹ năng",
        title: "Kỹ năng",
        endpoint: "/masterdata/skills",
        primaryField: "name",
        secondaryField: "category",
        group: "CANDIDATE",
        hint: "Gắn vào yêu cầu tuyển dụng và hồ sơ ứng viên",
        addLabel: "Thêm kỹ năng",
        fields: [
            { name: "name", label: "Tên kỹ năng", type: "text", required: true },
            { name: "category", label: "Nhóm kỹ năng", type: "text" },
        ],
    },
    {
        key: "educationLevels",
        tabLabel: "Trình độ học vấn",
        title: "Trình độ học vấn",
        endpoint: "/masterdata/education-levels",
        primaryField: "name",
        group: "CANDIDATE",
        addLabel: "Thêm trình độ",
        fields: [
            { name: "name", label: "Tên trình độ", type: "text", required: true },
            { name: "orderNo", label: "Thứ tự", type: "number", required: true },
        ],
    },
    {
        key: "experienceLevels",
        tabLabel: "Mức kinh nghiệm",
        title: "Mức kinh nghiệm",
        endpoint: "/masterdata/experience-levels",
        primaryField: "name",
        group: "CANDIDATE",
        addLabel: "Thêm mức kinh nghiệm",
        fields: [
            { name: "name", label: "Tên mức kinh nghiệm", type: "text", required: true },
            { name: "minYears", label: "Số năm tối thiểu", type: "number", required: true },
            { name: "maxYears", label: "Số năm tối đa", type: "number", required: true },
        ],
    },
    {
        key: "recruitmentSources",
        tabLabel: "Nguồn tuyển dụng",
        title: "Nguồn tuyển dụng",
        endpoint: "/masterdata/recruitment-sources",
        primaryField: "name",
        group: "CANDIDATE",
        hint: "Ứng viên đến từ đâu — chọn khi thêm ứng viên",
        addLabel: "Thêm nguồn",
        fields: [{ name: "name", label: "Tên nguồn", type: "text", required: true }],
    },
    {
        key: "rejectionReasons",
        tabLabel: "Lý do từ chối",
        title: "Lý do từ chối",
        endpoint: "/masterdata/rejection-reasons",
        primaryField: "name",
        group: "EVALUATION",
        hint: "Chọn khi từ chối ứng viên",
        addLabel: "Thêm lý do",
        fields: [{ name: "name", label: "Lý do từ chối", type: "text", required: true }],
    },
    {
        key: "interviewCriteria",
        tabLabel: "Tiêu chí phỏng vấn",
        title: "Tiêu chí phỏng vấn",
        endpoint: "/masterdata/interview-criteria",
        primaryField: "name",
        secondaryField: "description",
        group: "EVALUATION",
        hint: "Người phỏng vấn chấm 1–5 sao",
        addLabel: "Thêm tiêu chí",
        footnote: "Người phỏng vấn chấm mỗi tiêu chí từ 1 đến 5 sao và ghi nhận xét.",
        fields: [
            { name: "name", label: "Tên tiêu chí", type: "text", required: true },
            { name: "description", label: "Mô tả", type: "textarea" },
        ],
    },
    {
        key: SPECIAL_CATALOGS.emailTemplates,
        tabLabel: "Mẫu email",
        title: "Mẫu email",
        endpoint: "/masterdata/email-templates",
        primaryField: "code",
        group: "OTHER",
        hint: "Nội dung email gửi ứng viên và người phỏng vấn",
        addLabel: "Thêm mẫu",
        fields: [
            { name: "code", label: "Loại thông báo", type: "text", required: true },
            { name: "subject", label: "Tiêu đề email", type: "text", required: true },
            { name: "body", label: "Nội dung email", type: "textarea", required: true, hideInTable: true },
        ],
    },
];

export const catalogByKey = (key: string | undefined) => catalogConfigs.find((c) => c.key === key);
