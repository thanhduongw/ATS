import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Collapse, Progress, Skeleton, Tag } from "antd";
import { LoadingOutlined, ReloadOutlined, RobotOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getApplicationScore, rescoreApplication } from "../aiApi";
import type { AiTier, ApplicationScoreResponse, ScoreCriterion } from "../types";
import { aiTierMeta, isAiScoring } from "../aiScore";
import { COLORS } from "../../../app/theme";

/** Đang chấm (nền) thì hỏi lại sau mỗi khoảng này. */
// Khi hồ sơ đang chấm, cứ 5 giây thẻ tự hỏi lại server một lần (polling).
const POLL_MS = 5000;

interface Props {
    applicationId: number;
    /** Admin / Recruiter: được chấm lại. */
    canRescore: boolean;
    hasResume: boolean;
}

// Đổi lỗi gọi API thành câu dễ hiểu (hết thời gian / lỗi server / mất kết nối).
function errorText(err: unknown): string {
    const e = err as AxiosError<{ detail?: string; message?: string }>;
    if (e.code === "ECONNABORTED") return "Quá thời gian chờ AI chấm (>2 phút). Vui lòng thử lại sau.";
    if (e.response) return e.response.data?.detail ?? e.response.data?.message ?? `Lỗi server (HTTP ${e.response.status}).`;
    return "Không thể kết nối đến server AI.";
}

// Kiểu khung "Lý do xếp loại" theo xếp loại: Phù hợp xanh, Không phù hợp đỏ, Chưa phân loại vàng.
const TIER_ALERT_TYPE: Record<AiTier, "success" | "error" | "warning"> = {
    FIT: "success",
    NOT_FIT: "error",
    UNCLASSIFIED: "warning",
};

const mutedText = { color: COLORS.textMuted, fontSize: 12.5 } as const;

// Dòng tiêu đề một tiêu chí: tên + "x/5" (Chứng chỉ không áp dụng -> "Không áp dụng"), thanh điểm nhỏ.
function CriterionHeader({ c }: { c: ScoreCriterion }) {
    const counted = c.applicable && c.score != null;
    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                <span style={{ fontWeight: 500, opacity: c.applicable ? 1 : 0.55 }}>{c.label}</span>
                <span style={{ color: COLORS.textSecondary, whiteSpace: "nowrap", fontSize: 12.5, opacity: c.applicable ? 1 : 0.55 }}>
                    {counted ? `${c.score}/5` : "Không áp dụng"}
                </span>
            </div>
            {counted && <Progress percent={(c.score ?? 0) * 20} showInfo={false} size="small" strokeColor={COLORS.primary} />}
        </div>
    );
}

// Danh sách câu trích nguyên văn (in nghiêng). Không có thì ghi rõ để HR biết AI không dẫn được bằng chứng.
function QuoteList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
    return (
        <div>
            <div style={mutedText}>{title}</div>
            {items.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {items.map((q, i) => <li key={i} style={{ fontStyle: "italic" }}>{q}</li>)}
                </ul>
            ) : (
                <div style={{ ...mutedText, fontStyle: "italic" }}>{empty}</div>
            )}
        </div>
    );
}

// Phần mở ra của một tiêu chí: lý do, trích từ CV, trích từ JD.
function CriterionDetail({ c }: { c: ScoreCriterion }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.55 }}>
            {c.applicable ? (
                <>
                    <div>{c.reason}</div>
                    <QuoteList title="Trích từ CV" items={c.cv_evidence} empty="Không có đoạn nào trong CV để dẫn chứng." />
                    <QuoteList title="Trích từ JD" items={c.jd_evidence} empty="Tin tuyển dụng không có yêu cầu tương ứng." />
                </>
            ) : (
                <div style={{ color: COLORS.textMuted }}>Tin tuyển dụng không đề cập tiêu chí này nên không tính vào điểm.</div>
            )}
        </div>
    );
}

/**
 * Thẻ điểm AI của một hồ sơ: điểm, xếp loại, lý do xếp loại và 4 tiêu chí (x/5) bấm mở lý do và câu trích.
 * Điểm do ai-service tự chấm khi hồ sơ được nộp; khi đang chấm thì tự cập nhật.
 */
// THẺ AI ở tab Tổng quan của trang chi tiết hồ sơ.
// canRescore = người xem là Admin/Recruiter (được bấm Chấm lại). Server vẫn kiểm tra quyền lần nữa.
export default function AiScoreCard({ applicationId, canRescore, hasResume }: Props) {
    const { message } = App.useApp();
    const [score, setScore] = useState<ApplicationScoreResponse | null>(null);
    const [notScored, setNotScored] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [rescoring, setRescoring] = useState(false);
    const rescoreBusy = useRef(false);

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
    const scoring = isAiScoring(score?.status);
    useEffect(() => {
        if (!scoring) return;
        const timer = setTimeout(load, POLL_MS);
        return () => clearTimeout(timer);
    }, [scoring, score, load]);

    // Nút Chấm lại: gọi POST .../rescore và chờ kết quả (10-40 giây). 409 = đang có người chấm -> chờ polling.
    const handleRescore = async () => {
        // Chặn bấm đúp: state `rescoring` chỉ có hiệu lực ở lần render sau, ref thì chặn ngay.
        if (rescoreBusy.current) return;
        rescoreBusy.current = true;
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
            rescoreBusy.current = false;
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

    if (score.status === "FAILED") {
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

    // COMPLETED. `result` null = ứng viên đã xoá dữ liệu cá nhân: giữ điểm và xếp loại, bỏ phần chi tiết (không báo lỗi).
    const result = score.result;
    const totalScore = score.totalScore ?? result?.total_score ?? null;
    const tier = score.tier ?? result?.tier ?? null;
    const tierMeta = aiTierMeta(tier);
    const tierLabel = tierMeta?.label ?? result?.tier_label;
    const alertType = tier ? TIER_ALERT_TYPE[tier] : "info";
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                {totalScore != null && (
                    <Progress
                        type="circle"
                        size={84}
                        percent={totalScore}
                        strokeColor={tierMeta?.stroke ?? COLORS.primary}
                        format={() => <span style={{ fontWeight: 700, fontSize: 22 }}>{totalScore}</span>}
                    />
                )}
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    {tierLabel && (
                        <Tag color={tierMeta?.color} style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{tierLabel}</Tag>
                    )}
                    <div style={{ ...mutedText, marginTop: 6 }}>
                        Thang điểm 0–100
                        {score.scoredAt && ` · Chấm ngày ${new Date(score.scoredAt + "Z").toLocaleDateString("vi-VN")}`}
                    </div>
                </div>
                {rescoreButton("Chấm lại")}
            </div>

            {result?.injection_detected && (
                <Alert
                    type="error" showIcon
                    title="CV có nội dung bất thường nhằm điều khiển AI"
                    description="Hệ thống phát hiện đoạn văn trong CV cố tình ra lệnh cho AI (prompt injection). Điểm bên dưới chỉ để tham khảo — hãy xem trực tiếp hồ sơ."
                />
            )}

            {result && Array.isArray(result.criteria) ? (
                <>
                    <Alert type={alertType} showIcon title="Lý do xếp loại" description={result.tier_reason} />
                    <Collapse
                        ghost
                        size="small"
                        items={result.criteria.map((c) => ({
                            key: c.key,
                            label: <CriterionHeader c={c} />,
                            children: <CriterionDetail c={c} />,
                        }))}
                    />
                </>
            ) : result ? (
                // Kết quả lưu theo định dạng chấm điểm cũ (không có từng tiêu chí): không vẽ được chi tiết, báo rõ để HR chấm lại.
                <Alert type="info" showIcon title="Kết quả chấm theo phiên bản cũ" description="Hồ sơ này được chấm trước khi hệ thống đổi cách chấm nên chưa có chi tiết từng tiêu chí. Bấm “Chấm lại” để cập nhật." />
            ) : (
                <div style={{ ...mutedText, fontStyle: "italic" }}>Chi tiết đã xoá theo yêu cầu của ứng viên</div>
            )}
        </div>
    );
}
