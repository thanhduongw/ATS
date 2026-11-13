import { useCallback, useEffect, useState, useRef, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    App, Tag, Button, Space, Spin, Popconfirm, Tabs, Skeleton, Alert, Input,
} from "antd";
import {
    CalendarOutlined, SendOutlined, DownloadOutlined, ExpandOutlined, RobotOutlined,
    FileUnknownOutlined, EnvironmentOutlined, VideoCameraOutlined, LinkOutlined,
    ClockCircleOutlined, StopOutlined, ReloadOutlined, LeftOutlined, RightOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
    getApplicationById, getApplicationHistory, getApplicationComments, getApplications, addApplicationComment,
} from "../applicationApi";
import { getOffers } from "../../offer/offerApi";
import type { OfferResponse } from "../../offer/types";
import { getCandidateById } from "../candidateApi";
import { getPostingById } from "../../recruitment/recruitmentApi";
import { getPipelines, getCatalogItems } from "../../masterdata/masterdataApi";
import type { PipelineStageResponse } from "../../masterdata/types";
import type {
    ApiMessageResponse, ApplicationResponse, CandidateResponse,
    ApplicationHistoryResponse, ApplicationCommentResponse,
} from "../types";
import RejectApplicationModal from "../components/RejectApplicationModal";
import InterviewQuickCreateModal from "../../interview/components/InterviewQuickCreateModal";
import { getInterviews, cancelInterview } from "../../interview/interviewApi";
import { INTERVIEW_CANCELLABLE, type InterviewResponse } from "../../interview/types";
import ApplicationEvaluationPanel from "../components/ApplicationEvaluationPanel";
import { COLORS, FIXED_STAGES } from "../../../app/theme";
import { OFFER_STATUS, genderLabel, interviewStatusMeta, statusMeta } from "../../../app/statusLabels";
import StatusTag from "../../../components/ui/StatusTag";
import { INTERVIEW_HELD } from "../../interview/types";
import { AiScorePill, Avatar, Panel } from "../../../components/ui/designKit";
import { aiTierMeta } from "../../ai/aiScore";
import { fullDate } from "../../../app/datetime";
import { formatMoney } from "../../../app/money";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import EmptyState from "../../../components/ui/EmptyState";
import CvParseResultPanel from "../../ai/components/CvParseResultPanel";
import AiScoreCard from "../../ai/components/AiScoreCard";
import type { CVExtractionResult, ExtractionProvenance, CVExtractionResponse } from "../../ai/types";
import { getCvExtraction, reExtractCv } from "../../ai/aiApi";
import StageTag from "../../../components/ui/StageTag";
import { advanceSteps, planNextFixedStage } from "../stageAdvance";

/**
 * R14/H09 theo docs/UI: CV trái và tab phải cao bằng phần còn lại của màn hình (cuộn bên trong khung),
 * trang không phải cuộn. 275px ≈ đầu trang + thẻ ứng viên + khoảng đệm dưới.
 */
const FIT_HEIGHT = "calc(100vh - 275px)";
import { FIXED_STAGE_LABEL, stageTypeFilterOf, toFixedStage } from "../../../app/stages";

const INTERVIEW_STAGE_TYPES = ["TECHNICAL_INTERVIEW", "HR_INTERVIEW", "FINAL_INTERVIEW"];

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString("vi-VN") : "—";

/** Một dòng nhãn — giá trị gọn trong tab. */
function Field({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ display: "flex", gap: 12, padding: "6px 0", fontSize: 13 }}>
            <span style={{ width: 130, flexShrink: 0, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontWeight: 500 }}>{value || "—"}</span>
        </div>
    );
}

/**
 * Moi giai doan co mot viec dang can lam, va viec do nam o mot tab. Mo san dung tab do
 * de HR khong phai nho "danh gia nam o tab nao".
 */
function relevantTabFor(stageType: string): string {
    if (stageType.includes("INTERVIEW")) return "evaluation";
    if (stageType === "OFFER" || stageType === "HIRED") return "offer";
    if (stageType === "REJECTED") return "activity";
    // Ứng tuyển, Sàng lọc: việc đầu tiên là đọc CV và xem điểm AI.
    return "ai";
}

const TAB_KEYS = ["ai", "evaluation", "interview", "offer", "activity", "info"];

/** Thứ tự 5 giai đoạn chính (không tính Từ chối) để hiện "3/5". */
const MAIN_FIXED = FIXED_STAGES.filter((s) => s !== "REJECTED");

export default function CandidateApplicationDetailPage() {
    const { applicationId: applicationIdParam } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role);
    const isHr = !!role && HR_ROLES.includes(role);
    const currentUserIdRaw = useAppSelector((st) => st.auth.user?.userId);
    const currentUserId = currentUserIdRaw ? Number(currentUserIdRaw) : null;

    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    const [candidate, setCandidate] = useState<CandidateResponse | null>(null);
    const [stages, setStages] = useState<PipelineStageResponse[]>([]);
    const [history, setHistory] = useState<ApplicationHistoryResponse[]>([]);
    const [comments, setComments] = useState<ApplicationCommentResponse[]>([]);
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [offers, setOffers] = useState<OfferResponse[]>([]);
    /** Hồ sơ cùng việc làm, cùng giai đoạn — cho "‹ Trước 3 / 6 trong Phỏng vấn Sau ›". */
    const [siblings, setSiblings] = useState<ApplicationResponse[]>([]);
    const [noteDraft, setNoteDraft] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [cancelingInterviewId, setCancelingInterviewId] = useState<number | null>(null);

    const [interviewModalOpen, setInterviewModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [aiResult, setAiResult] = useState<CVExtractionResult | null>(null);
    const [aiProvenance, setAiProvenance] = useState<ExtractionProvenance | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const applicationId = Number(applicationIdParam);
    /** Guard to prevent duplicate auto-extraction calls */
    const aiExtractTriggered = useRef(false);

    const loadAll = useCallback(async () => {
        if (!applicationId) return;
        setLoading(true);
        try {
            const appRes = await getApplicationById(applicationId);
            setApplication(appRes.data);
            const [candRes, postingRes, pipelineListRes, historyRes, commentsRes, interviewsRes, workLocationRes] = await Promise.all([
                getCandidateById(appRes.data.candidateId),
                getPostingById(appRes.data.jobPostingId),
                getPipelines(),
                getApplicationHistory(applicationId),
                getApplicationComments(applicationId),
                getInterviews(applicationId),
                getCatalogItems("/masterdata/work-locations"),
            ]);
            setCandidate(candRes.data);
            const pipeline = pipelineListRes.data.find((p) => p.id === postingRes.data.pipelineId);
            setStages(pipeline ? [...pipeline.stages].sort((a, b) => a.stageOrder - b.stageOrder) : []);
            setHistory(historyRes.data);
            setComments(commentsRes.data);
            setInterviews([...interviewsRes.data].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
            setWorkLocationMap(Object.fromEntries(workLocationRes.data.map((w) => [w.id, String(w.name)])));
            // Phần phụ: lỗi không chặn màn.
            getOffers({ applicationId, size: 20 })
                .then((r) => setOffers(r.data.content))
                .catch(() => setOffers([]));
            getApplications({
                jobPostingId: appRes.data.jobPostingId,
                stageType: stageTypeFilterOf(toFixedStage(appRes.data.currentStageType)),
                size: 500,
            })
                .then((r) => setSiblings([...r.data.content].sort(
                    (a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())))
                .catch(() => setSiblings([]));
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được hồ sơ ứng tuyển");
        } finally {
            setLoading(false);
        }
    }, [applicationId, message]);

    useEffect(() => { loadAll(); }, [loadAll]);

    /** Đổi lỗi gọi API trích xuất thành câu báo cho người dùng. */
    const extractionErrorText = (err: unknown): string => {
        const axiosErr = err as AxiosError<{ message?: string; error_message?: string; detail?: string }>;
        if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout")) {
            return "Quá thời gian xử lý (>2 phút). AI-service có thể đang quá tải.";
        }
        if (axiosErr.response) {
            const data = axiosErr.response.data;
            return data?.detail ?? data?.error_message ?? data?.message ?? `Lỗi server (HTTP ${axiosErr.response.status}).`;
        }
        return "Không thể kết nối đến server AI.";
    };

    /**
     * Lấy kết quả trích xuất CV đã lưu ở ai-service (chưa có thì ai-service trích xuất ngay).
     * `force` = trích xuất lại (chỉ HR).
     */
    const loadExtraction = useCallback(async (force: boolean) => {
        setAiLoading(true);
        setAiError(null);
        try {
            const res = force ? await reExtractCv(applicationId) : await getCvExtraction(applicationId);
            const data: CVExtractionResponse = res.data;
            if (data.status === "error" || !data.result) {
                setAiResult(null);
                setAiProvenance(null);
                setAiError(data.error_message ?? "Không thể phân tích CV. Vui lòng thử lại.");
                return;
            }
            setAiResult(data.result);
            setAiProvenance(data.provenance);
            if (force) message.success("Đã phân tích lại CV thành công");
        } catch (err) {
            setAiError(extractionErrorText(err));
        } finally {
            setAiLoading(false);
        }
    }, [applicationId, message]);

    useEffect(() => {
        if (!application?.resumeUrl || aiExtractTriggered.current) return;
        aiExtractTriggered.current = true;
        loadExtraction(false);
    }, [application, loadExtraction]);

    /** Thử lại sau lỗi: lần trước thất bại thì ai-service tự trích xuất lại. */
    const handleRetryExtract = useCallback(() => loadExtraction(false), [loadExtraction]);
    const handleReExtract = useCallback(() => loadExtraction(true), [loadExtraction]);

    const handlePass = async () => {
        if (!application) return;
        setActionLoading(true);
        try {
            // Sang giai đoạn cố định kế tiếp (DS06). Quy trình 6 bước: 1 lần; quy trình cũ 9 bước: có thể nhiều lần.
            const plan = planNextFixedStage(stages, application.currentStageId);
            await advanceSteps(application.id, plan?.steps ?? 1, "Chuyển giai đoạn tiếp theo");
            message.success(plan
                ? `Đã chuyển sang ${FIXED_STAGE_LABEL[plan.target]}, ứng viên sẽ được thông báo qua email`
                : "Đã chuyển giai đoạn, ứng viên sẽ được thông báo qua email");
            loadAll();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveNote = async () => {
        const content = noteDraft.trim();
        if (!content) return;
        setSavingNote(true);
        try {
            await addApplicationComment(applicationId, content);
            setNoteDraft("");
            const res = await getApplicationComments(applicationId);
            setComments(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không lưu được ghi chú");
        } finally {
            setSavingNote(false);
        }
    };

    const handleCancelInterview = async (interviewId: number) => {
        setCancelingInterviewId(interviewId);
        try {
            await cancelInterview(interviewId);
            message.success("Đã hủy lịch phỏng vấn");
            loadAll();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không hủy được lịch phỏng vấn");
        } finally {
            setCancelingInterviewId(null);
        }
    };

    // Con thieu bat ky manh du lieu nao ma van dang tai thi quay vong, chua ket luan gi.
    if (loading && (!application || !candidate)) {
        return (
            <div className="page-container" style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    // Tai xong that su ma van thieu thi moi la khong tim thay.
    if (!application || !candidate) {
        return (
            <div className="page-container">
                <EmptyState title="Không tìm thấy hồ sơ ứng tuyển" description="Hồ sơ có thể đã bị xóa hoặc bạn không có quyền xem." />
            </div>
        );
    }

    const isRejected = application.currentStageType === "REJECTED";
    const isHired = application.currentStageType === "HIRED";

    // Tab mo san theo giai doan, kem nhan nho de biet viec dang can lam nam o dau.
    // Nhan goi y bam theo giai doan ho so; con tab mo san thi ?tab= duoc quyen thang.
    const stageTabKey = relevantTabFor(application.currentStageType);
    const requestedTab = searchParams.get("tab");
    const activeTabKey = requestedTab && TAB_KEYS.includes(requestedTab)
        ? requestedTab
        : stageTabKey;
    const nextPlan = planNextFixedStage(stages, application.currentStageId);
    const fixedStage = toFixedStage(application.currentStageType);
    const stepIndex = (MAIN_FIXED as readonly string[]).indexOf(fixedStage) + 1;
    const siblingIndex = siblings.findIndex((s) => s.id === application.id);
    const prevSibling = siblingIndex > 0 ? siblings[siblingIndex - 1] : null;
    const nextSibling = siblingIndex >= 0 && siblingIndex < siblings.length - 1 ? siblings[siblingIndex + 1] : null;
    const openSibling = (a: ApplicationResponse) => navigate(`/candidates/${a.candidateId}/applications/${a.id}`);
    const activeInterviews = interviews.filter((iv) => iv.status !== "CANCELLED" && iv.status !== "CANDIDATE_DECLINED");
    const evalDone = activeInterviews.reduce((n, iv) => n + iv.interviewers.filter((i) => i.evaluationSubmitted).length, 0);
    const evalTotal = activeInterviews.reduce((n, iv) => n + iv.interviewers.length, 0);
    const tier = aiTierMeta(application.aiTier);

    // Chỉ cho phép lên lịch khi hồ sơ đang thực sự ở một vòng phỏng vấn.
    const showInterviewBtn = INTERVIEW_STAGE_TYPES.includes(application.currentStageType);
    const showOfferBtn = application.currentStageType === "OFFER";

    const fmtStamp = (v: string) => {
        const d = new Date(v);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const activity = [
        ...history.map((h) => ({
            key: `h-${h.id}`, at: h.changedAt, who: h.changedByUserName, whoId: h.changedByUserId,
            what: h.fromStageName ? `chuyển sang ${h.toStageName}` : `nộp hồ sơ · ${h.toStageName}`,
            body: h.note,
        })),
        ...comments.map((c) => ({
            key: `c-${c.id}`, at: c.createdAt, who: c.authorUserName, whoId: c.authorUserId,
            what: "ghi chú", body: c.content,
        })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    /* ── Tab: Thông tin (giữ phần dữ liệu cũ không có trong HTML nhưng vẫn cần) ── */
    const infoTab = (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Field label="Ngày sinh" value={formatDate(candidate.dateOfBirth)} />
            <Field label="Giới tính" value={genderLabel(candidate.gender)} />
            <Field label="Học vấn" value={candidate.educationLevelName} />
            <Field label="Địa chỉ" value={candidate.address} />
            <Field label="Phòng ban" value={application.departmentName} />
            <Field label="Nguồn ứng tuyển" value={application.recruitmentSourceName} />
            {application.rejectionReasonName && <Field label="Lý do từ chối" value={application.rejectionReasonName} />}
            {application.note && <Field label="Ghi chú ứng tuyển" value={application.note} />}
            {candidate.skillNames?.length > 0 && (
                <Field label="Kỹ năng" value={(
                    <Space wrap size={4}>
                        {candidate.skillNames.map((s) => <Tag key={s} style={{ margin: 0 }}>{s}</Tag>)}
                    </Space>
                )} />
            )}
        </div>
    );

    /* ── Tab: Phỏng vấn ──────────────────────────────── */
    const interviewTab = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {interviews.length === 0 ? (
                <div style={{ color: COLORS.textMuted, fontSize: 13, padding: "8px 0" }}>
                    Chưa có lịch phỏng vấn nào cho hồ sơ này.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {interviews.map((iv) => {
                        const meta = interviewStatusMeta(iv.status);
                        const cancellable = INTERVIEW_CANCELLABLE.has(iv.status);
                        const scheduled = new Date(iv.scheduledAt);
                        return (
                            <div key={iv.id} style={{
                                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
                                padding: "14px 16px", borderRadius: 14, background: COLORS.fill,
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                                            <CalendarOutlined style={{ color: COLORS.textMuted }} />
                                            {scheduled.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                                        </span>
                                        <Tag color={meta.color} style={{ borderRadius: 6, margin: 0 }}>{meta.label}</Tag>
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: COLORS.textSecondary }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <ClockCircleOutlined /> {iv.durationMinutes} phút
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <VideoCameraOutlined /> {iv.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng"}
                                        </span>
                                        {iv.format === "ONLINE" && iv.meetingLink ? (
                                            <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                <LinkOutlined /> Đường dẫn họp
                                            </a>
                                        ) : iv.workLocationId ? (
                                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                <EnvironmentOutlined /> {workLocationMap[iv.workLocationId] ?? "—"}
                                            </span>
                                        ) : null}
                                        {iv.interviewers.length > 0 && (
                                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                <span style={{ color: COLORS.textMuted }}>Người phỏng vấn:</span> {iv.interviewers.map((p) => p.fullName).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                    {iv.status === "CANDIDATE_DECLINED" && iv.candidateDeclineReason && (
                                        <div style={{ fontSize: 13, color: COLORS.warning, marginTop: 6 }}>
                                            Ứng viên xin dời: “{iv.candidateDeclineReason}”
                                        </div>
                                    )}
                                    {iv.note && (
                                        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>{iv.note}</div>
                                    )}
                                </div>
                                {isHr && cancellable && (
                                    <Popconfirm
                                        title="Hủy lịch phỏng vấn này?"
                                        description="Buổi phỏng vấn sẽ chuyển sang trạng thái Đã hủy."
                                        okText="Hủy lịch"
                                        cancelText="Đóng"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => handleCancelInterview(iv.id)}
                                    >
                                        <Button size="small" danger icon={<StopOutlined />} loading={cancelingInterviewId === iv.id}>
                                            Hủy lịch
                                        </Button>
                                    </Popconfirm>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                Mỗi ứng viên thường có 1 buổi phỏng vấn; chuyên viên tuyển dụng có thể thêm buổi khi cần.
            </span>
        </div>
    );

    /* ── Tab: Hoạt động (R13) — ghi chú + dòng thời gian, mới nhất trên cùng ── */
    const activityTab = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {role !== "CANDIDATE" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Input.TextArea
                        rows={2}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Viết ghi chú cho đồng nghiệp…"
                        maxLength={2000}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button size="small" type="primary" disabled={!noteDraft.trim()} loading={savingNote} onClick={handleSaveNote}>
                            Lưu ghi chú
                        </Button>
                    </div>
                </div>
            )}
            {activity.length === 0 ? (
                <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>Chưa có hoạt động nào.</span>
            ) : activity.map((a) => (
                <div key={a.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Avatar name={a.who} colorKey={a.whoId} size={28} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                            <span><b style={{ fontWeight: 600 }}>{a.who}</b> <span style={{ color: COLORS.textSecondary }}>{a.what}</span></span>
                            <span style={{ fontSize: 12, color: COLORS.textMuted, flexShrink: 0 }}>{fmtStamp(a.at)}</span>
                        </div>
                        {a.body && <span style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{a.body}</span>}
                    </div>
                </div>
            ))}
        </div>
    );

    /* ── Tab: Thư mời ── */
    const offerTab = offers.length === 0 ? (
        <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>
            {fixedStage === "OFFER" ? "Chưa có thư mời cho hồ sơ này." : "Thư mời được soạn khi hồ sơ tới giai đoạn Thư mời."}
        </span>
    ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {offers.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => navigate(`/offers/${o.id}`)}
                    style={{
                        all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 14, background: COLORS.fill,
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Thư mời #{o.id}</span>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            {o.salaryOffered != null ? `${formatMoney(o.salaryOffered)} · ` : ""}Khởi đầu {fullDate(o.startDate)}{o.responseDeadline ? ` · hạn phản hồi ${fullDate(o.responseDeadline)}` : ""}
                        </span>
                    </div>
                    <StatusTag {...statusMeta(OFFER_STATUS, o.status)} />
                    <RightOutlined style={{ color: COLORS.textMuted, fontSize: 12 }} />
                </button>
            ))}
        </div>
    );

    /* ── CV (cột trái, R14) ── */
    const cvPanel = (
                <div style={{
                    border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, overflow: "hidden",
                    background: "#1824310C", height: FIT_HEIGHT, minHeight: 380, display: "flex", flexDirection: "column",
                }}>
                    <div style={{
                        background: "#1824311A", padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                        fontSize: 13, fontWeight: 500,
                    }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {application.resumeUrl ? "CV ứng viên" : "Chưa có CV"}
                        </span>
                        {application.resumeUrl && (
                            <Space size={8}>
                                <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="small" icon={<DownloadOutlined />}>Tải xuống</Button>
                                </a>
                                <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="small" icon={<ExpandOutlined />}>Mở tab mới</Button>
                                </a>
                            </Space>
                        )}
                    </div>
                    {application.resumeUrl ? (
                        <iframe
                            src={application.resumeUrl}
                            title="CV ứng viên"
                            style={{ width: "100%", flex: 1, minHeight: 0, border: "none" }}
                        />
                    ) : (
                        <div style={{
                            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: 12, padding: 40, color: COLORS.textSecondary,
                        }}>
                            <FileUnknownOutlined style={{ fontSize: 56, opacity: 0.4 }} />
                            <div style={{ fontWeight: 600, color: COLORS.textPrimary }}>Ứng viên chưa tải CV lên</div>
                        </div>
                    )}
                </div>
    );

    /* ── Tab Điểm AI: thẻ chấm điểm + thông tin AI trích xuất từ CV ── */
    const aiTab = (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AiScoreCard applicationId={application.id} canRescore={isHr} hasResume={!!application.resumeUrl} />
                {/* ── AI Loading state ── */}
                {aiLoading && (
                    <div style={{
                        background: "#7C4DFF1A", border: "1px solid #7C4DFF33", borderRadius: 12, padding: "24px 20px",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI</Tag>
                            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Đang trích xuất thông tin CV...</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: "50%",
                                background: "linear-gradient(135deg, #7C4DFF 0%, #3F56EA 100%)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                animation: "pulse 1.5s ease-in-out infinite",
                            }}>
                                <RobotOutlined style={{ fontSize: 28, color: "#fff" }} />
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>
                                    AI đang phân tích nội dung CV...
                                </div>
                                <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 4 }}>
                                    Quá trình này có thể mất 10–60 giây
                                </div>
                            </div>
                        </div>
                        <Skeleton active paragraph={{ rows: 4 }} />
                        <style>{`
                            @keyframes pulse {
                                0%, 100% { transform: scale(1); opacity: 1; }
                                50% { transform: scale(1.08); opacity: 0.85; }
                            }
                        `}</style>
                    </div>
                )}

                {/* ── AI Error state ── */}
                {!aiLoading && aiError && (
                    <div style={{
                        background: "#FA2A2D17", border: "1px solid #FA2A2D33", borderRadius: 12, padding: "18px 20px",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI</Tag>
                            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Trích xuất thông tin CV</span>
                        </div>
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể phân tích CV"
                            description={aiError}
                            style={{ borderRadius: 10, marginBottom: 12 }}
                        />
                        <Button icon={<ReloadOutlined />} onClick={handleRetryExtract} block>
                            Thử lại
                        </Button>
                    </div>
                )}

                {/* ── AI Result with scrollbar ── */}
                {!aiLoading && !aiError && aiResult && aiProvenance && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI Trích Xuất CV</Tag>
                            {isHr && (
                                <Button size="small" icon={<RobotOutlined />} onClick={handleReExtract} loading={aiLoading}>Phân tích lại</Button>
                            )}
                        </div>
                        <div
                            className="ai-result-scroll"
                            style={{
                                paddingRight: 4,
                            }}
                        >
                            <CvParseResultPanel result={aiResult} provenance={aiProvenance} />
                        </div>
                    </div>
                )}

                {/* ── No CV uploaded & no extraction in progress ── */}
                {!aiLoading && !aiError && !aiResult && !application.resumeUrl && (
                    <div style={{
                        background: "#7C4DFF1A", border: "1px solid #7C4DFF33", borderRadius: 12, padding: "18px 20px",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI</Tag>
                            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Trích xuất thông tin CV</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: "50%", background: "#7C4DFF1A", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <FileUnknownOutlined style={{ fontSize: 22, color: "#7C4DFF" }} />
                            </div>
                            <div style={{ fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 1.55 }}>
                                <div style={{ fontWeight: 600, color: COLORS.textPrimary, marginBottom: 2 }}>
                                    Chưa có CV để phân tích
                                </div>
                                Ứng viên cần tải CV lên trước khi AI có thể trích xuất thông tin.
                            </div>
                        </div>
                    </div>
                )}
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Điểm AI chỉ để tham khảo, không thay đánh giá phỏng vấn.</span>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Dải điều hướng: Ứng viên › Tên · Trước / Sau trong cùng giai đoạn của việc làm */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                    <a onClick={() => navigate("/applications")}>Ứng viên</a>
                    <span style={{ margin: "0 6px", color: COLORS.textMuted }}>›</span>
                    <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{candidate.fullName}</span>
                </span>
                {siblingIndex >= 0 && siblings.length > 1 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textSecondary }}>
                        <Button size="small" type="text" icon={<LeftOutlined />} disabled={!prevSibling} onClick={() => prevSibling && openSibling(prevSibling)}>Trước</Button>
                        {siblingIndex + 1} / {siblings.length} trong {FIXED_STAGE_LABEL[fixedStage]}
                        <Button size="small" type="text" disabled={!nextSibling} onClick={() => nextSibling && openSibling(nextSibling)}>
                            Sau <RightOutlined />
                        </Button>
                    </span>
                )}
            </div>

            {/* Khung giờ đã gửi ở R18 "Để ứng viên chọn": ứng viên chọn xong thì HR chốt lịch ở đây. */}

            {/* ── Thẻ định danh ── */}
            <Panel>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <Avatar name={candidate.fullName} colorKey={candidate.id} size={56} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 320px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 22, fontWeight: 700 }}>{candidate.fullName}</span>
                            {application.aiScore != null && (
                                <AiScorePill score={Math.round(application.aiScore)} suffix={tier ? ` ${tier.label.toLowerCase()}` : undefined} />
                            )}
                        </div>
                        {candidate.currentPosition && <span style={{ fontSize: 14 }}>{candidate.currentPosition}</span>}
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            {[candidate.email, candidate.phone, `Ứng tuyển ${fullDate(application.appliedAt)}`,
                                application.assignedRecruiterName ? `Phụ trách: ${application.assignedRecruiterName}` : null]
                                .filter(Boolean).join(" · ")}
                        </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, marginLeft: "auto" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <a onClick={() => navigate(`/recruitment/postings/${application.jobPostingId}`)} style={{ fontWeight: 600 }}>
                                {application.jobTitle || `Việc làm #${application.jobPostingId}`}
                            </a>
                            <StageTag stageType={application.currentStageType} />
                            {stepIndex > 0 && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{stepIndex}/{MAIN_FIXED.length}</span>}
                        </div>
                        {!isHr && (() => {
                            /* H09: Đại diện phòng ban chỉ xem hồ sơ và nộp đánh giá buổi mình được phân công. */
                            const mine = interviews.find((iv) => INTERVIEW_HELD.has(iv.status)
                                && iv.interviewers.some((p) => p.interviewerId === currentUserId && !p.evaluationSubmitted));
                            return (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                    {mine && (
                                        <Button type="primary" onClick={() => navigate(`/candidates/${application.candidateId}/applications/${application.id}/evaluate?interviewId=${mine.id}`)}>
                                            Viết đánh giá
                                        </Button>
                                    )}
                                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Bạn chỉ xem hồ sơ và nộp đánh giá</span>
                                </div>
                            );
                        })()}
                        {isHr && !isHired && !isRejected && (
                            <Space wrap size={8} style={{ justifyContent: "flex-end" }}>
                                {showInterviewBtn && (
                                    <Button icon={<CalendarOutlined />} onClick={() => navigate(`/interviews/schedule/${application.id}`)}>
                                        {activeInterviews.length ? "Thêm buổi phỏng vấn" : "Lên lịch phỏng vấn"}
                                    </Button>
                                )}
                                {showOfferBtn && !offers.some((o) => o.status !== "REJECTED" && o.status !== "EXPIRED") && (
                                    <Button icon={<SendOutlined />} onClick={() => navigate(`/offers/create?applicationId=${application.id}`)}>
                                        Soạn thư mời
                                    </Button>
                                )}
                                <Button danger onClick={() => setRejectModalOpen(true)}>Từ chối</Button>
                                {nextPlan && nextPlan.target !== "HIRED" && (
                                    <Button type="primary" loading={actionLoading} onClick={handlePass}>
                                        Chuyển sang {FIXED_STAGE_LABEL[nextPlan.target]}
                                    </Button>
                                )}
                            </Space>
                        )}
                    </div>
                </div>
            </Panel>

            {/* ── CV trái · tab phải ── */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 460px", minWidth: 0 }}>{cvPanel}</div>
                <Panel style={{ flex: "1 1 540px", minWidth: 0, height: FIT_HEIGHT, minHeight: 380, overflowY: "auto" }}>
                    <Tabs
                        className="sticky-tabs"
                        defaultActiveKey={activeTabKey}
                        size="small"
                        tabBarGutter={18}
                        items={[
                            { key: "ai", label: "Điểm AI", children: aiTab },
                            {
                                key: "evaluation",
                                label: evalTotal ? `Đánh giá ${evalDone}/${evalTotal}` : "Đánh giá",
                                children: (
                                    <ApplicationEvaluationPanel
                                        candidateId={application.candidateId}
                                        applicationId={application.id}
                                        interviews={interviews}
                                        history={history}
                                        currentUserId={currentUserId}
                                        isHr={isHr}
                                    />
                                ),
                            },
                            { key: "interview", label: activeInterviews.length ? `Phỏng vấn ${activeInterviews.length}` : "Phỏng vấn", children: interviewTab },
                            { key: "offer", label: "Thư mời", children: offerTab },
                            { key: "activity", label: "Hoạt động", children: activityTab },
                            { key: "info", label: "Thông tin", children: infoTab },
                        ]}
                    />
                </Panel>
            </div>

            <InterviewQuickCreateModal
                open={interviewModalOpen}
                lockedApplicationId={application.id}
                onClose={() => setInterviewModalOpen(false)}
                onSuccess={() => { setInterviewModalOpen(false); loadAll(); }}
            />
            <RejectApplicationModal
                open={rejectModalOpen}
                applicationId={application.id}
                onClose={() => setRejectModalOpen(false)}
                onSuccess={() => { setRejectModalOpen(false); loadAll(); }}
            />

        </div>
    );
}
