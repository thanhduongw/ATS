import { useState } from "react";
import { App, Input, Radio } from "antd";
import type { AxiosError } from "axios";
import { candidateDeclineInterview } from "../interviewApi";
import type { ApiMessageResponse } from "../types";
import { withdrawMyApplication } from "../../candidate/applicationApi";
import { SmallDialog } from "../../../components/ui/designKit";
import { COLORS } from "../../../app/theme";

/**
 * Ứng viên từ chối lịch phỏng vấn (lịch 1 giờ cố định — quyết định 04/11/2026). Hai lựa chọn:
 *  - "Xin dời lịch": lý do bắt buộc → buổi chuyển "Ứng viên xin dời", HR và người phỏng vấn nhận thông báo
 *    để đặt giờ mới (`PATCH /interview/interviews/{id}/candidate-decline`).
 *  - "Không tham gia nữa": rút đơn (`PATCH /application/applications/my/{id}/withdraw`) — backend tự huỷ
 *    buổi phỏng vấn khi đơn kết thúc. Không hoàn tác.
 */
type Choice = "RESCHEDULE" | "WITHDRAW";

export default function CandidateDeclineDialog({
    open, interviewId, applicationId, jobTitle, when, onClose, onDone,
}: {
    open: boolean;
    interviewId: number;
    applicationId: number;
    jobTitle: string;
    when: string;
    onClose: () => void;
    onDone: () => void;
}) {
    const { message } = App.useApp();
    const [choice, setChoice] = useState<Choice>("RESCHEDULE");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const close = () => { setChoice("RESCHEDULE"); setReason(""); onClose(); };

    const submit = async () => {
        setBusy(true);
        try {
            if (choice === "RESCHEDULE") {
                await candidateDeclineInterview(interviewId, reason.trim());
                message.success("Đã gửi yêu cầu dời lịch. Nhà tuyển dụng sẽ hẹn lại giờ mới với bạn.");
            } else {
                await withdrawMyApplication(applicationId);
                message.success(`Đã rút đơn ứng tuyển ${jobTitle}`);
            }
            close();
            onDone();
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không gửi được, vui lòng thử lại");
        } finally { setBusy(false); }
    };

    return (
        <SmallDialog
            open={open}
            title="Từ chối lịch phỏng vấn"
            subtitle={`${jobTitle} · ${when}`}
            okText={choice === "RESCHEDULE" ? "Gửi yêu cầu dời lịch" : "Rút đơn ứng tuyển"}
            danger={choice === "WITHDRAW"}
            okDisabled={choice === "RESCHEDULE" && !reason.trim()}
            okLoading={busy}
            onCancel={close}
            onOk={submit}
        >
            <Radio.Group value={choice} onChange={(e) => setChoice(e.target.value)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Radio value="RESCHEDULE">
                    <b>Xin dời lịch</b>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Bạn vẫn muốn phỏng vấn nhưng giờ này không phù hợp.</div>
                </Radio>
                <Radio value="WITHDRAW">
                    <b>Không tham gia nữa</b>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Rút đơn ứng tuyển vị trí này. Không hoàn tác được.</div>
                </Radio>
            </Radio.Group>
            {choice === "RESCHEDULE" && (
                <Input.TextArea
                    rows={3}
                    maxLength={500}
                    showCount
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Lý do (bắt buộc) — ví dụ: trùng lịch thi cuối kỳ, có thể phỏng vấn sau 15:00 các ngày trong tuần"
                />
            )}
        </SmallDialog>
    );
}
