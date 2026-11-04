import type { PublicJobPosting } from "./types";
import { WORK_ARRANGEMENT_LABEL } from "../recruitment/postingLabels";

/** Lương theo cách viết của trang tuyển dụng (C02): "30 – 42 triệu", "Từ 15 triệu", "Thoả thuận". */
export function salaryText(min: number | null, max: number | null): string {
    const m = (v: number) => {
        const t = v / 1_000_000;
        return Number.isInteger(t) ? String(t) : t.toFixed(1).replace(".", ",");
    };
    if (min == null && max == null) return "Thoả thuận";
    if (min != null && max != null) return min === max ? `${m(min)} triệu` : `${m(min)} – ${m(max)} triệu`;
    return min != null ? `Từ ${m(min)} triệu` : `Đến ${m(max!)} triệu`;
}

export const arrangementLabel = (j: PublicJobPosting) => (j.workArrangement ? WORK_ARRANGEMENT_LABEL[j.workArrangement] : null);

/** "Kinh nghiệm" là chữ tự do: ngắn ("2+ năm") thì làm chip, dài thì thành mục riêng trong nội dung tin. */
export function experienceParts(job: Pick<PublicJobPosting, "experienceRequired">) {
    const e = job.experienceRequired?.trim() || null;
    return { short: e && e.length <= 30 ? e : null, long: e && e.length > 30 ? e : null };
}
