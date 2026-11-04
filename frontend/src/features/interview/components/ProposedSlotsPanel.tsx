import { useCallback, useEffect, useState } from "react";
import { App, Button } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import { getSlotsByApplication, selectSlot } from "../interviewApi";
import type { ApiMessageResponse, InterviewSlotResponse } from "../types";
import { COLORS } from "../../../app/theme";
import { InlineNotice } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/**
 * Phía HR (R09/R14): các khung giờ đã gửi ở R18 "Để ứng viên chọn" — ứng viên chọn khung nào,
 * hạn chọn, và nút "Chốt lịch" để biến khung đó thành buổi phỏng vấn (InterviewSlotService.selectSlot).
 * Chỉ hiện khi đơn còn khung giờ đang đề xuất.
 */
export default function ProposedSlotsPanel({ applicationId, onScheduled }: { applicationId: number; onScheduled: () => void }) {
    const { message } = App.useApp();
    const [slots, setSlots] = useState<InterviewSlotResponse[]>([]);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(() => {
        getSlotsByApplication(applicationId)
            .then((r) => setSlots(r.data.filter((s) => s.status === "PROPOSED")))
            .catch(() => setSlots([]));
    }, [applicationId]);

    useEffect(() => { load(); }, [load]);

    if (slots.length === 0) return null;
    const chosen = slots.find((s) => s.candidateConfirmed);
    const deadline = slots.find((s) => s.responseDeadline)?.responseDeadline;
    const expired = !!deadline && dayjs(deadline).isBefore(dayjs()) && !chosen;

    const finalize = async (s: InterviewSlotResponse) => {
        setBusyId(s.id);
        try {
            await selectSlot(s.id);
            message.success("Đã chốt lịch. Người phỏng vấn sẽ xác nhận rồi báo ứng viên.");
            load();
            onScheduled();
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không chốt được lịch");
        } finally { setBusyId(null); }
    };

    return (
        <InlineNotice tone={chosen ? "success" : expired ? "warning" : "brand"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <b>
                    {chosen ? "Ứng viên đã chọn giờ — chốt lịch để tạo buổi phỏng vấn"
                        : expired ? "Đã hết hạn chọn giờ mà ứng viên chưa chọn"
                            : `Đã gửi ${slots.length} khung giờ — chờ ứng viên chọn`}
                    {deadline && !chosen && (
                        <span style={{ fontWeight: 400, color: COLORS.textSecondary }}> · hạn {dayjs(deadline).format("DD/MM HH:mm")}</span>
                    )}
                </b>
                {slots.map((s) => {
                    const st = dayjs(s.startTime);
                    return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                            <span style={{ minWidth: 190 }}>
                                {WEEKDAY[st.day()]} {st.format("DD/MM")} · {st.format("HH:mm")} – {dayjs(s.endTime).format("HH:mm")}
                            </span>
                            {s.candidateConfirmed
                                ? <StatusTag tone="success" label="Ứng viên chọn" />
                                : <span style={{ color: COLORS.textMuted }}>—</span>}
                            {s.candidateConfirmed && (
                                <Button size="small" type="primary" icon={<CheckCircleFilled />} loading={busyId === s.id} onClick={() => finalize(s)}>
                                    Chốt lịch
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </InlineNotice>
    );
}
