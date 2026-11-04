import type { CandidateApplicationResponse } from "../types";
import StageTag from "../../../components/ui/StageTag";
import StatusTag from "../../../components/ui/StatusTag";
import { closedLabel } from "../useCandidatePortal";

/** Giai đoạn của đơn nhìn từ phía ứng viên: đơn bị loại hiện "Chưa phù hợp" / "Đã rút đơn" thay vì "Từ chối". */
export default function CandidateStageTag({ app }: { app: CandidateApplicationResponse }) {
    const closed = closedLabel(app);
    return closed ? <StatusTag {...closed} /> : <StageTag stageType={app.currentStageType} />;
}
