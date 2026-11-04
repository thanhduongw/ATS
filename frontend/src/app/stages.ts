import type { FixedStage } from "./theme";

/**
 * 6 giai đoạn cố định của giao diện (DS01, DS06, quyết định B1 = phương án 1):
 * backend vẫn giữ pipeline cấu hình được; giao diện chỉ hiển thị 6 nhóm.
 *   Ứng tuyển · Sàng lọc · Phỏng vấn · Thư mời · Đã tuyển (+ Từ chối). Không dùng "vòng 1/2".
 * Logic nghiệp vụ (vd. có được lên lịch phỏng vấn không) vẫn dựa trên stageType GỐC,
 * xem features/interview/scheduleEligibility.ts.
 */

export const FIXED_STAGE_LABEL: Record<FixedStage, string> = {
    APPLIED: "Ứng tuyển",
    SCREENING: "Sàng lọc",
    INTERVIEW: "Phỏng vấn",
    OFFER: "Thư mời",
    HIRED: "Đã tuyển",
    REJECTED: "Từ chối",
};

/** stageType của backend thuộc nhóm nào. */
export const STAGE_TYPES_OF: Record<FixedStage, string[]> = {
    APPLIED: ["APPLIED"],
    SCREENING: ["CV_SCREENING", "HR_SCREENING"],
    INTERVIEW: ["TECHNICAL_INTERVIEW", "HR_INTERVIEW", "FINAL_INTERVIEW"],
    OFFER: ["OFFER"],
    HIRED: ["HIRED"],
    REJECTED: ["REJECTED"],
};

const BY_TYPE: Record<string, FixedStage> = Object.fromEntries(
    (Object.keys(STAGE_TYPES_OF) as FixedStage[]).flatMap((g) => STAGE_TYPES_OF[g].map((t) => [t, g])),
);

/**
 * Quy stageType về 1 trong 6 nhóm.
 * CUSTOM (giai đoạn tự đặt của pipeline cũ) không biết thuộc nhóm nào → xếp vào Sàng lọc
 * (quy tắc mặc định ở T1.4 của docs/learning/03-ke-hoach-trien-khai-ui.md).
 */
export function toFixedStage(stageType?: string | null): FixedStage {
    if (!stageType) return "APPLIED";
    const g = BY_TYPE[stageType];
    if (g) return g;
    if (stageType.includes("INTERVIEW")) return "INTERVIEW";
    if (stageType.includes("SCREENING")) return "SCREENING";
    return "SCREENING";
}

export function fixedStageLabel(stageType?: string | null): string {
    return FIXED_STAGE_LABEL[toFixedStage(stageType)];
}

/** Giá trị gửi lên tham số `stageType` của API danh sách hồ sơ để lọc theo nhóm. */
export function stageTypeFilterOf(stage: FixedStage): string {
    return STAGE_TYPES_OF[stage].join(",");
}
