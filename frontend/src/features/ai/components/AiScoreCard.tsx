import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Progress, Skeleton, Tag, Tooltip } from "antd";
import { LoadingOutlined, ReloadOutlined, RobotOutlined, WarningOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getApplicationScore, rescoreApplication } from "../aiApi";
import type { ApplicationScoreResponse, ScoredDimension } from "../types";
import { AI_TIER_META, isAiScoring } from "../aiScore";
import { COLORS } from "../../../app/theme";

/** Đang chấm (nền) thì hỏi lại sau mỗi khoảng này. */
// [GIẢI THÍCH] Khi hồ sơ đang chấm, cứ 5 giây thẻ tự hỏi lại server một lần (polling).
const POLL_MS = 5000;

interface Props {
    applicationId: number;
    /** Admin / Recruiter: được chấm lại. */
    canRescore: boolean;
    hasResume: boolean;
}

// [GIẢI THÍCH] Đổi lỗi gọi API thành câu dễ hiểu (hết thời gian / lỗi server / mất kết nối).
function errorText(err: unknown): string {
    const e = err as AxiosError<{ detail?: string; message?: string }>;
    if (e.code === "ECONNABORTED") return "Quá thời gian chờ AI chấm (>2 phút). Vui lòng thử lại sau.";
    if (e.response) return e.response.data?.detail ?? e.response.data?.message ?? `Lỗi server (HTTP ${e.response.status}).`;
    return "Không thể kết nối đến server AI.";
}

// [GIẢI THÍCH] Vẽ MỘT dòng tiêu chí: tên, trọng số (sau chia lại), mức x/4, thanh điểm, lý do của AI.
// Tiêu chí không áp dụng thì hiện mờ "Không áp dụng".
function DimensionRow({ d }: { d: ScoredDimension }) {
    const weight = Math.round(d.effective_weight * 100);
    if (!d.applicable) {
        return (
            <div style={{ opacity: 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{d.label}</span>
                    <span style={{ color: COLORS.textMuted }}>Không áp dụng</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>Tin tuyển dụng không đề cập tiêu chí này.</div>
            </div>
        );
    }
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>
                    {d.label} <span style={{ color: COLORS.textMuted, fontWeight: 400 }}>· {weight}%</span>
                </span>
                <span style={{ color: COLORS.textSecondary }}>Mức {d.level}/4</span>
            </div>
            <Progress percent={d.score ?? 0} showInfo={false} size="small" strokeColor={COLORS.primary} />
            {d.reason && <div style={{ fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.5 }}>{d.reason}</div>}
        </div>
    );
}

/**
 * Thẻ điểm AI của một hồ sơ: điểm, xếp loại, nhận xét, 5 tiêu chí, cảnh báo yêu cầu bắt buộc.
 * Điểm do ai-service tự chấm khi hồ sơ được nộp; khi đang chấm thì tự cập nhật.
 */
// [GIẢI THÍCH] THẺ AI ở tab Tổng quan của trang chi tiết hồ sơ.
// canRescore = người xem là Admin/Recruiter (được bấm Chấm lại). Server vẫn kiểm tra quyền lần nữa.
export default function AiScoreCard({ applicationId, canRescore, hasResume }: Props) {
    const { message } = App.useApp();
    const [score, setScore] = useState<ApplicationScoreResponse | null>(null);
    const [notScored, setNotScored] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [rescoring, setRescoring] = useState(false);

    // Gọi GET /api/v1/ai/scores/{id}. 404 KHÔNG phải lỗi: nghĩa là hồ sơ chưa được chấm -> hiện nút "Chấm ngay".
    const load = useCallback(async () => {
        try {
            const res = await getApplicationScore(applicationId);
            setScore(res.data);
            setNotScored(false);
            setLoadError(null);
        } catch (err) {
            if ((err as AxiosError).response?.status === 404) {
                setScore(null);
                setNotScored(true);
                setLoadError(null);
            } else {
                setLoadError(errorText(err));
            }
        } finally {
            setLoading(false);
        }
    }, [applicationId]);

    // Mở trang -> tải điểm một lần.
    useEffect(() => { load(); }, [load]);

    // Đang chấm -> hẹn 5 giây gọi lại load; mỗi lần load xong score đổi -> hẹn tiếp; chấm xong thì dừng.
    // return () => clearTimeout(...): rời trang thì huỷ hẹn giờ, không gọi API thừa.
    const scoring = isAiScoring(score?.status);
    useEffect(() => {
        if (!scoring) return;
        const timer = setTimeout(load, POLL_MS);
        return () => clearTimeout(timer);
    }, [scoring, score, load]);

    // Nút Chấm lại: gọi POST .../rescore và chờ kết quả (10-40 giây). 409 = đang có người chấm -> chờ polling.
    const handleRescore = async () => {
        setRescoring(true);
        try {
            const res = await rescoreApplication(applicationId);
            setScore(res.data);
            setNotScored(false);
            if (res.data.status === "COMPLETED") message.success("AI đã chấm lại hồ sơ");
        } catch (err) {
            if ((err as AxiosError).response?.status === 409) {
                message.info("Hồ sơ đang được AI chấm, kết quả sẽ tự cập nhật");
                load();
            } else {
                message.error(errorText(err));
            }
        } finally {
            setRescoring(false);
        }
    };

    const rescoreButton = (label: string) => canRescore && hasResume ? (
        <Button size="small" icon={<RobotOutlined />} loading={rescoring} disabled={scoring} onClick={handleRescore}>
            {label}
        </Button>
    ) : null;

    // Các trạng thái của thẻ, theo thứ tự: đang tải -> lỗi tải -> đang chấm -> chưa chấm -> chấm lỗi -> có kết quả.
    if (loading) return <Skeleton active paragraph={{ rows: 3 }} />;

    if (loadError) {
        return (
            <Alert
                type="error"
                showIcon
                title="Không tải được điểm AI"
                description={loadError}
                action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Thử lại</Button>}
            />
        );
    }

    if (rescoring || scoring) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.textSecondary, fontSize: 13.5 }}>
                <LoadingOutlined style={{ color: COLORS.primary }} />
                {score?.status === "PENDING" && !rescoring
                    ? "Hồ sơ đang chờ AI chấm…"
                    : "AI đang đọc CV và chấm hồ sơ (thường 10–40 giây)…"}
            </div>
        );
    }

    if (notScored || !score) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: COLORS.textSecondary, fontSize: 13.5 }}>
                    {hasResume ? "Hồ sơ chưa được AI chấm." : "Hồ sơ chưa có CV nên AI chưa chấm được."}
                </span>
                {rescoreButton("Chấm ngay")}
            </div>
        );
    }

    if (score.status === "FAILED" || !score.result || score.totalScore == null || !score.tier) {
        return (
            <Alert
                type="error"
                showIcon
                title="AI chưa chấm được hồ sơ này"
                description={score.errorMessage ?? "Không rõ nguyên nhân."}
                action={rescoreButton("Chấm lại")}
            />
        );
    }

    // Có kết quả: vòng tròn điểm + xếp loại, nhận xét, cảnh báo yêu cầu bắt buộc (nếu có), 5 dòng tiêu chí.
    const result = score.result;
    const tier = AI_TIER_META[score.tier];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <Progress
                    type="circle"
                    size={84}
                    percent={score.totalScore}
                    strokeColor={tier.stroke}
                    format={() => <span style={{ fontWeight: 700, fontSize: 22 }}>{score.totalScore}</span>}
                />
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <Tag color={tier.color} style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{tier.label}</Tag>
                    <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 6 }}>
                        Thang điểm 0–100
                        {result.years_calculated != null && ` · Kinh nghiệm tính từ CV: ${result.years_calculated} năm`}
                        {score.scoredAt && ` · Chấm ngày ${new Date(score.scoredAt + "Z").toLocaleDateString("vi-VN")}`}
                    </div>
                </div>
                {rescoreButton("Chấm lại")}
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.65, color: COLORS.textPrimary }}>{result.comment}</div>

            {result.must_have_unmet.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    title="Yêu cầu bắt buộc chưa đáp ứng"
                    description={
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {result.must_have_unmet.map((m) => <li key={m}>{m}</li>)}
                        </ul>
                    }
                />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {result.dimensions.map((d) => <DimensionRow key={d.dimension} d={d} />)}
            </div>

            <Tooltip title="Điểm tính từ 5 tiêu chí với trọng số cố định; tiêu chí tin tuyển dụng không đề cập được bỏ và chia lại trọng số.">
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                    Điểm do AI đề xuất để tham khảo, không thay thế đánh giá của nhà tuyển dụng. AI không dùng
                    tên, liên hệ, ngày sinh, giới tính, địa chỉ của ứng viên khi chấm.
                </div>
            </Tooltip>
        </div>
    );
}
