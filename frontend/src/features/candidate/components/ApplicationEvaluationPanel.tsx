import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Avatar, Button, Empty, Rate, Space, Spin, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";

import { getApplicationEvaluations } from "../../interview/interviewApi";
import {
    INTERVIEW_HELD,
    type ApiMessageResponse,
    type EvaluationResponse,
    type InterviewResponse,
} from "../../interview/types";
import type { ApplicationHistoryResponse } from "../types";
import { COLORS, RADIUS } from "../../../app/theme";

interface Props {
    candidateId: number;
    applicationId: number;
    interviews: InterviewResponse[];
    /** Lịch sử chuyển vòng của hồ sơ — dùng để suy ra mỗi bài chấm thuộc vòng nào. */
    history: ApplicationHistoryResponse[];
    currentUserId: number | null;
    isHr: boolean;
}

const RECOMMENDATION_LABEL: Record<string, string> = {
    STRONG_YES: "Rất khuyến nghị nhận",
    YES: "Khuyến nghị nhận",
    NO: "Không khuyến nghị",
    STRONG_NO: "Kiên quyết không nhận",
};

const RECOMMENDATION_COLOR: Record<string, string> = {
    STRONG_YES: "success",
    YES: "success",
    NO: "warning",
    STRONG_NO: "error",
};

const UNKNOWN_ROUND = "Chưa xác định vòng";

const getInitials = (name: string) => {
    const parts = (name || "").split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name || "?").substring(0, 2).toUpperCase();
};

/**
 * Vòng của một mốc thời gian = lần chuyển vòng gần nhất TRƯỚC mốc đó.
 * Hệ thống không lưu vòng trên bài chấm nên phải đối chiếu với lịch sử hồ sơ.
 */
function roundAt(at: string | null | undefined, sortedHistory: ApplicationHistoryResponse[]): string {
    if (!at || sortedHistory.length === 0) return UNKNOWN_ROUND;
    const moment = dayjs(at);
    let round = UNKNOWN_ROUND;
    for (const entry of sortedHistory) {
        if (dayjs(entry.changedAt).isAfter(moment)) break;
        round = entry.toStageName;
    }
    return round;
}

export default function ApplicationEvaluationPanel({
    candidateId,
    applicationId,
    interviews,
    history,
    currentUserId,
    isHr,
}: Props) {
    const { message } = App.useApp();
    const navigate = useNavigate();

    const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getApplicationEvaluations(applicationId);
            setEvaluations(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được danh sách đánh giá");
        } finally {
            setLoading(false);
        }
    }, [applicationId, message]);

    useEffect(() => { load(); }, [load]);

    const sortedHistory = useMemo(
        () => [...history].sort((a, b) => dayjs(a.changedAt).valueOf() - dayjs(b.changedAt).valueOf()),
        [history],
    );

    const interviewById = useMemo(
        () => new Map(interviews.map((i) => [i.id, i])),
        [interviews],
    );

    /**
     * Buổi phỏng vấn mà người đang xem được phân công và chưa nộp bài.
     * Người phỏng vấn chỉ chấm được đúng những buổi này.
     */
    const pendingOwnInterview = useMemo(
        () => interviews.find((iv) =>
            INTERVIEW_HELD.has(iv.status) &&
            iv.interviewers.some((p) => p.interviewerId === currentUserId && !p.evaluationSubmitted),
        ),
        [interviews, currentUserId],
    );

    const evaluatePath = `/candidates/${candidateId}/applications/${applicationId}/evaluate`;

    const openCreate = () => {
        // HR chấm thẳng cho vòng hiện tại của hồ sơ; người phỏng vấn chấm theo buổi được giao.
        if (!isHr && pendingOwnInterview) {
            navigate(`${evaluatePath}?interviewId=${pendingOwnInterview.id}`);
            return;
        }
        navigate(evaluatePath);
    };

    const canCreate = isHr || !!pendingOwnInterview;

    /** Nguoi xem co bai cham nao cua chinh minh trong ho so nay khong. */
    const hasOwnEvaluation = evaluations.some((e) => e.interviewerId === currentUserId);

    /**
     * Bai cua nguoi khac bi che vi hai ly do khac han nhau: hoac minh chua nop bai
     * (nop xong la mo), hoac minh khong duoc phan cong ho so nay (khong bao gio mo).
     * Noi ro de nguoi dung khong cho doi mot thao tac ho khong lam duoc.
     */
    const lockedReason = hasOwnEvaluation || pendingOwnInterview
        ? "Bạn cần nộp đánh giá của mình trước, sau đó mới đọc được bài chấm của người khác."
        : "Bạn không được phân công phỏng vấn hồ sơ này nên không xem được nội dung các bài chấm.";

    const rows = useMemo(
        () => [...evaluations]
            .sort((a, b) => dayjs(b.submittedAt ?? 0).valueOf() - dayjs(a.submittedAt ?? 0).valueOf())
            .map((e) => {
                const interview = e.interviewId != null ? interviewById.get(e.interviewId) : undefined;
                const round = e.interviewId != null
                    ? roundAt(interview?.createdAt, sortedHistory)
                    : roundAt(e.submittedAt, sortedHistory);
                const scores = e.scores ?? [];
                const average = scores.length
                    ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
                    : 0;
                return { evaluation: e, round, average };
            }),
        [evaluations, interviewById, sortedHistory],
    );

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Danh sách đánh giá</span>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!canCreate}
                    onClick={openCreate}
                >
                    Thêm đánh giá
                </Button>
            </div>

            {!canCreate && (
                <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>
                    {hasOwnEvaluation
                        ? "Bạn đã nộp đánh giá cho hồ sơ này. Đánh giá đã nộp sẽ khóa lại, không sửa được."
                        : "Bạn chỉ đánh giá được những buổi phỏng vấn mình được phân công."}
                </div>
            )}

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <Spin />
                </div>
            ) : rows.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có đánh giá nào cho ứng viên này"
                    style={{ marginTop: 32 }}
                />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {rows.map(({ evaluation: e, round, average }) => {
                        const locked = e.submittedAt != null && !e.contentVisible;
                        return (
                            <div
                                key={e.id}
                                style={{
                                    border: `1px solid ${COLORS.borderLight}`,
                                    borderRadius: RADIUS.md,
                                    padding: "16px 18px",
                                    background: "#fff",
                                }}
                            >
                                <div style={{
                                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                    gap: 16, marginBottom: 10, flexWrap: "wrap",
                                }}>
                                    <Space size={10} align="start">
                                        <Avatar
                                            size={36}
                                            style={{
                                                background: e.interviewId == null ? COLORS.info : COLORS.primary,
                                                color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0,
                                            }}
                                        >
                                            {getInitials(e.interviewerName)}
                                        </Avatar>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>{e.interviewerName}</div>
                                            <div style={{ fontSize: 12.5, color: COLORS.textSecondary }}>{round}</div>
                                        </div>
                                    </Space>

                                    {locked ? (
                                        <Tag color="warning" style={{ margin: 0 }}>Chưa mở khóa</Tag>
                                    ) : (
                                        <Space size={10} align="center">
                                            {e.overallRecommendation && (
                                                <Tag
                                                    color={RECOMMENDATION_COLOR[e.overallRecommendation] ?? "default"}
                                                    style={{ margin: 0 }}
                                                >
                                                    {RECOMMENDATION_LABEL[e.overallRecommendation] ?? e.overallRecommendation}
                                                </Tag>
                                            )}
                                            <Rate disabled allowHalf value={Math.round(average * 2) / 2} style={{ fontSize: 15 }} />
                                        </Space>
                                    )}
                                </div>

                                {locked ? (
                                    <div style={{ fontSize: 13.5, color: COLORS.textMuted }}>
                                        {lockedReason}
                                    </div>
                                ) : (
                                    <>
                                        {e.generalComment && (
                                            <div style={{ fontSize: 13.5, color: COLORS.textPrimary, lineHeight: 1.55, marginBottom: 8 }}>
                                                {e.generalComment}
                                            </div>
                                        )}
                                        {(e.scores?.length ?? 0) > 0 && (
                                            <Space wrap size={[6, 6]} style={{ marginBottom: 8 }}>
                                                {e.scores.map((s) => (
                                                    <Tag key={s.criteriaId} style={{ margin: 0 }}>
                                                        {s.criteriaName}: {s.score}/5
                                                    </Tag>
                                                ))}
                                            </Space>
                                        )}
                                        {e.salaryProposed != null && (
                                            <div style={{ fontSize: 13, color: COLORS.primaryDark, fontWeight: 600, marginBottom: 6 }}>
                                                Đề xuất mức lương: {e.salaryProposed.toLocaleString("vi-VN")} VNĐ
                                            </div>
                                        )}
                                    </>
                                )}

                                <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                                    {e.submittedAt
                                        ? dayjs(e.submittedAt).format("DD/MM/YYYY · HH:mm")
                                        : "Chưa nộp"}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
