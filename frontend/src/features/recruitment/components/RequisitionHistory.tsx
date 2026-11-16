import dayjs from "dayjs";
import { AUDIT_ACTION_LABEL } from "../../../app/statusLabels";
import { COLORS } from "../../../app/theme";
import { Avatar, Panel } from "../../../components/ui/designKit";
import { useResourceHistory } from "../../auditlog/useResourceHistory";
import type { JobRequisitionResponse } from "../types";

/** Câu ngắn cho từng bước của yêu cầu; không có thì dùng nhãn chung của nhật ký. */
const VERB: Record<string, string> = {
    REQUISITION_CREATED: "tạo yêu cầu",
    REQUISITION_UPDATED: "sửa yêu cầu",
    REQUISITION_SUBMITTED: "gửi duyệt",
    REQUISITION_APPROVED: "duyệt yêu cầu",
    REQUISITION_REJECTED: "từ chối yêu cầu",
    REQUISITION_CHANGES_REQUESTED: "yêu cầu phòng ban sửa",
};

/**
 * Khối "Lịch sử" của yêu cầu tuyển dụng (3.11): đọc từ nhật ký hệ thống — tạo, sửa, gửi duyệt, yêu cầu sửa, duyệt,
 * từ chối. Yêu cầu tạo trước khi có nhật ký thì vẫn có mốc "tạo yêu cầu" lấy từ createdAt.
 */
export default function RequisitionHistory({ requisition: r }: { requisition: JobRequisitionResponse }) {
    const logs = useResourceHistory([{ type: "REQUISITION", ids: [r.id] }]);
    const hasCreated = logs.some((l) => l.action === "REQUISITION_CREATED");
    const rows = [
        ...logs.map((l) => ({
            key: `l-${l.id}`, who: l.who ?? "Hệ thống", whoId: l.actorUserId,
            what: VERB[l.action] ?? (AUDIT_ACTION_LABEL[l.action] ?? l.action).toLowerCase(), at: l.createdAt,
        })),
        ...(hasCreated ? [] : [{ key: "created", who: r.requesterName, whoId: r.requesterId, what: "tạo yêu cầu", at: r.createdAt }]),
    ];
    return (
        <Panel title="Lịch sử" bodyGap={8}>
            {rows.map((x) => (
                <span key={x.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Avatar name={x.who} colorKey={x.whoId} size={22} />
                    <span style={{ flex: 1, minWidth: 0 }}>{x.who} {x.what}</span>
                    <span style={{ color: COLORS.textMuted, fontSize: 12, flexShrink: 0 }}>{dayjs(x.at).format("DD/MM HH:mm")}</span>
                </span>
            ))}
        </Panel>
    );
}
