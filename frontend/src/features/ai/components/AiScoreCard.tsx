import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Collapse, Progress, Skeleton, Tag } from "antd";
import { LoadingOutlined, ReloadOutlined, RobotOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getApplicationScore, rescoreApplication } from "../aiApi";
import type {
    AiTier,
    ApplicationScoreResponse,
    RequirementResult,
    RequirementStatus,
    ScoredBy,
    ScoredDimension,
} from "../types";
import { aiTierMeta, isAiScoring } from "../aiScore";
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

// [GIẢI THÍCH] Ai chấm tiêu chí / kiểm tra yêu cầu: quy tắc code (lặp lại được), AI, hay code kết hợp AI.
const SCORED_BY_LABEL: Record<ScoredBy, string> = {
    CODE: "Code",
    LLM: "AI",
    CODE_AND_LLM: "Code + AI",
};

// [GIẢI THÍCH] Màu trạng thái yêu cầu bắt buộc (Bước 4): Đạt xanh, Không đạt đỏ, Không xác định được vàng.
const REQUIREMENT_STATUS_META: Record<RequirementStatus, { label: string; color: string }> = {
    MET: { label: "Đạt", color: "green" },
    UNMET: { label: "Không đạt", color: "red" },
    UNKNOWN: { label: "Không xác định được", color: "gold" },
};

// [GIẢI THÍCH] Kiểu khung "Lý do xếp loại" theo xếp loại: Phù hợp xanh, Không phù hợp đỏ, Chưa phân loại vàng.
const TIER_ALERT_TYPE: Record<AiTier, "success" | "error" | "warning"> = {
    FIT: "success",
    NOT_FIT: "error",
    UNCLASSIFIED: "warning",
};

// [GIẢI THÍCH] Chữ bên phải của một tiêu chí: "Mức x/4", hoặc "Không áp dụng" / "Không xác định được".
function levelText(d: ScoredDimension): string {
    if (!d.applicable) return "Không áp dụng";
    if (d.level == null) return "Không xác định được";
    return `Mức ${d.level}/4`;
}

// [GIẢI THÍCH] Phần luôn hiện của MỘT tiêu chí: tên, trọng số thực tế (bằng nhau), mức, thanh điểm.
// Tiêu chí không áp dụng làm mờ. Bấm vào để mở lý do và dẫn chứng.
function DimensionHeader({ d }: { d: ScoredDimension }) {
    const weight = Math.round((d.weight ?? 0) * 100);
    const counted = d.applicable && d.score != null;
    return (
        <div style={{ opacity: d.applicable ? 1 : 0.55, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                <span style={{ fontWeight: 500 }}>
                    {d.label}
                    {counted && <span style={{ color: COLORS.textMuted, fontWeight: 400 }}> · {weight}%</span>}
                </span>
                <span style={{ color: COLORS.textSecondary, whiteSpace: "nowrap" }}>{levelText(d)}</span>
            </div>
            {counted && <Progress percent={d.score ?? 0} showInfo={false} size="small" strokeColor={COLORS.primary} />}
        </div>
    );
}

// [GIẢI THÍCH] Phần mở ra của một tiêu chí: lý do, dẫn chứng trích từ CV (hoặc dữ kiện code dùng), ai chấm.
// Kết quả chấm theo cách cũ không có dẫn chứng / người chấm thì chỉ hiện lý do.
function DimensionDetail({ d }: { d: ScoredDimension }) {
    if (!d.applicable) {
        return (
            <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>
                Tin tuyển dụng không đề cập tiêu chí này nên không tính vào điểm.
            </div>
        );
    }
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.55 }}>
            {d.reason && <div>{d.reason}</div>}
            {d.evidence && d.evidence.length > 0 && (
                <div>
                    <div style={{ color: COLORS.textMuted }}>Dẫn chứng:</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {d.evidence.map((e, i) => <li key={i} style={{ fontStyle: "italic" }}>{e}</li>)}
                    </ul>
                </div>
            )}
            {d.scored_by && (
                <div style={{ color: COLORS.textMuted }}>Chấm bởi: {SCORED_BY_LABEL[d.scored_by] ?? d.scored_by}</div>
            )}
        </div>
    );
}

// [GIẢI THÍCH] Danh sách yêu cầu bắt buộc của JD (Bước 4): tên, trạng thái có màu, dẫn chứng, ai kiểm tra.
function RequirementList({ items }: { items: RequirementResult[] }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Yêu cầu bắt buộc</div>
            {items.map((r, i) => {
                const meta = REQUIREMENT_STATUS_META[r.status] ?? { label: r.status_label, color: "default" };
                return (
                    <div key={`${r.requirement}-${i}`} style={{ fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontWeight: 500 }}>{r.requirement}</span>
                            <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                            {r.evidence && <span style={{ fontStyle: "italic" }}>{r.evidence} · </span>}
                            Kiểm tra bởi: {SCORED_BY_LABEL[r.checked_by] ?? r.checked_by}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Thẻ điểm AI của một hồ sơ: điểm, xếp loại, lý do xếp loại, nhận xét, yêu cầu bắt buộc, 5 tiêu chí.
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

    // Chưa phân loại có thể KHÔNG có điểm (không tính được) — vẫn là kết quả hợp lệ, không phải lỗi.
    if (score.status === "FAILED" || !score.result) {
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

    // Có kết quả: điểm + xếp loại, lý do xếp loại, nhận xét, yêu cầu bắt buộc, 5 tiêu chí.
    // Kết quả chấm theo cách cũ (không có requirements / tier_reason / evidence) vẫn hiện được: thiếu phần nào bỏ phần đó.
    const result = score.result;
    const totalScore = score.totalScore ?? result.total_score ?? null;
    const tierMeta = aiTierMeta(score.tier ?? result.tier);
    const tierLabel = tierMeta?.label ?? result.tier_label;
    const alertType = score.tier && score.tier in TIER_ALERT_TYPE ? TIER_ALERT_TYPE[score.tier] : "info";
    const requirements = result.requirements ?? [];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                {totalScore != null ? (
                    <Progress
                        type="circle"
                        size={84}
                        percent={totalScore}
                        strokeColor={tierMeta?.stroke ?? COLORS.primary}
                        format={() => <span style={{ fontWeight: 700, fontSize: 22 }}>{totalScore}</span>}
                    />
                ) : (
                    <div
                        style={{
                            width: 84, height: 84, borderRadius: "50%", border: `6px solid ${COLORS.borderLight}`,
                            display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
                            fontSize: 11, color: COLORS.textMuted, lineHeight: 1.3,
                        }}
                    >
                        Chưa tính được điểm
                    </div>
                )}
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    {tierLabel && (
                        <Tag color={tierMeta?.color} style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{tierLabel}</Tag>
                    )}
                    <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 6 }}>
                        Thang điểm 0–100
                        {result.years_calculated != null && ` · Kinh nghiệm tính từ CV: ${result.years_calculated} năm`}
                        {score.scoredAt && ` · Chấm ngày ${new Date(score.scoredAt + "Z").toLocaleDateString("vi-VN")}`}
                    </div>
                </div>
                {rescoreButton("Chấm lại")}
            </div>

            {result.tier_reason ? (
                <>
                    <Alert type={alertType} showIcon title="Lý do xếp loại" description={result.tier_reason} />
                    {result.summary && (
                        <div style={{ fontSize: 14, lineHeight: 1.65, color: COLORS.textPrimary }}>{result.summary}</div>
                    )}
                </>
            ) : (
                result.comment && (
                    <div style={{ fontSize: 14, lineHeight: 1.65, color: COLORS.textPrimary }}>{result.comment}</div>
                )
            )}

            {requirements.length > 0 && <RequirementList items={requirements} />}

            {result.dimensions && result.dimensions.length > 0 && (
                <Collapse
                    ghost
                    size="small"
                    items={result.dimensions.map((d) => ({
                        key: d.dimension,
                        label: <DimensionHeader d={d} />,
                        children: <DimensionDetail d={d} />,
                    }))}
                />
            )}

            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.55 }}>
                Điểm là trung bình các tiêu chí tin tuyển dụng có đề cập (trọng số bằng nhau). AI không dùng
                tên, liên hệ, ngày sinh, giới tính, địa chỉ của ứng viên khi chấm.
                <div style={{ fontWeight: 600, marginTop: 4 }}>AI chỉ gợi ý; HR là người quyết định.</div>
            </div>
        </div>
    );
}
