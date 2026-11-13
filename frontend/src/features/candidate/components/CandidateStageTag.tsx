import type { CandidateApplicationResponse } from "../types";
import StatusTag from "../../../components/ui/StatusTag";
import type { StatusTone } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { closedLabel } from "../useCandidatePortal";

/** Màu chip giai đoạn phía ứng viên (C11, C12, C20 của Candidate.html): đang chờ = xám, phỏng vấn = xanh chính,
 *  thư mời / đã tuyển = xanh lá. Khác chip của HR (phỏng vấn tím DS01) — ứng viên không cần phân biệt nhiều màu. */
const TONE: Record<string, StatusTone> = {
    APPLIED: "neutral", SCREENING: "neutral", INTERVIEW: "brand", OFFER: "success", HIRED: "success",
};

/** Giai đoạn của đơn nhìn từ phía ứng viên: đơn bị loại hiện "Chưa phù hợp" / "Đã rút đơn" thay vì "Từ chối". */
export default function CandidateStageTag({ app }: { app: CandidateApplicationResponse }) {
    const closed = closedLabel(app);
    if (closed) return <StatusTag {...closed} />;
    const stage = toFixedStage(app.currentStageType);
    return <StatusTag label={FIXED_STAGE_LABEL[stage]} tone={TONE[stage] ?? "neutral"} />;
}
