// ===== Dùng chung cho 12 danh mục đơn giản + Mẫu email =====
export interface CatalogItem {
    id: number;
    active: boolean;
    [key: string]: string | number | boolean;
}

export type CatalogFieldType = "text" | "textarea" | "number";

export interface CatalogFieldConfig {
    name: string;        // phải khớp đúng field trong Request/Response DTO bên Java
    label: string;
    type: CatalogFieldType;
    required?: boolean;
    hideInTable?: boolean; // ẩn khỏi cột bảng (vd: nội dung email dài) nhưng vẫn hiện trong form
}

/** Nhóm trên màn Danh mục — tổng quan (R41). */
export type CatalogGroup = "ORG" | "WORK" | "CANDIDATE" | "EVALUATION" | "OTHER";

export interface CatalogConfig {
    key: string;
    tabLabel: string;
    title: string;
    endpoint: string;      // vd: "/masterdata/departments" — khớp @RequestMapping bên BE
    primaryField: string;  // field chính, thường là "name" (Email Template dùng "code")
    fields: CatalogFieldConfig[];
    group: CatalogGroup;
    /** Dòng mô tả trên thẻ tổng quan; bỏ trống thì liệt kê vài mục đang dùng. */
    hint?: string;
    /** Chữ trên nút thêm, ví dụ "Thêm lý do". */
    addLabel: string;
    /** Field hiện thành dòng phụ dưới tên (thay vì cột riêng). */
    secondaryField?: string;
    /** Ghi chú cuối bảng. */
    footnote?: string;
}

// ===== Pipeline (quy trình tuyển dụng) =====
export type StageType =
    | "APPLIED"
    | "CV_SCREENING"
    | "HR_SCREENING"
    | "TECHNICAL_INTERVIEW"
    | "HR_INTERVIEW"
    | "FINAL_INTERVIEW"
    | "OFFER"
    | "HIRED"
    | "REJECTED"
    | "CUSTOM";

export interface PipelineStageResponse {
    id: number;
    name: string;
    stageType: StageType;
    stageOrder: number;
}

export interface PipelineResponse {
    id: number;
    name: string;
    isDefault: boolean;
    active: boolean;
    stages: PipelineStageResponse[];
}

export interface PipelineStageRequest {
    name: string;
    stageType: StageType;
    stageOrder: number;
}

export interface PipelineRequest {
    name: string;
    stages: PipelineStageRequest[];
}

export interface ApiMessageResponse {
    message: string;
}