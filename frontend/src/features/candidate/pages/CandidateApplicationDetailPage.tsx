import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    App, Card, Row, Col, Tag, Button, Space, Spin, Avatar, Timeline, Popconfirm, Tabs, Skeleton, Alert,
} from "antd";
import {
    ArrowLeftOutlined, CalendarOutlined, DollarOutlined, CommentOutlined, SwapOutlined,
    DownloadOutlined, ExpandOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined,
    FileUnknownOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined,
    VideoCameraOutlined, LinkOutlined, TeamOutlined, ClockCircleOutlined, StopOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
    getApplicationById, advanceApplicationStage, getApplicationHistory, getApplicationComments,
} from "../applicationApi";
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
import OfferCreateModal from "../../offer/components/OfferCreateModal";
import { getInterviews, cancelInterview } from "../../interview/interviewApi";
import type { InterviewResponse } from "../../interview/types";
import ApplicationEvaluationPanel from "../components/ApplicationEvaluationPanel";
import { COLORS, SHADOWS } from "../../../app/theme";
import { stageTypeTagColor, INTERVIEW_STATUS, statusMeta } from "../../../app/statusLabels";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import EmptyState from "../../../components/ui/EmptyState";
import CvParseResultPanel from "../../ai/components/CvParseResultPanel";
import type { CVExtractionResult, ExtractionProvenance, CVExtractionResponse } from "../../ai/types";
import { extractCvFromUrl } from "../../ai/aiApi";
import { getCachedExtraction, setCachedExtraction, clearCachedExtraction } from "../../ai/cvCacheService";

interface ActivityItem {
    kind: "history" | "comment";
    timestamp: string;
    content: ReactNode;
}

const INTERVIEW_STAGE_TYPES = ["TECHNICAL_INTERVIEW", "HR_INTERVIEW", "FINAL_INTERVIEW"];

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString("vi-VN") : "—";

/** Một ô nhãn — giá trị trong lưới thông tin. */
function Field({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, color: COLORS.textSecondary, fontWeight: 500, marginBottom: 3 }}>
                {label}
            </div>
            <div style={{ fontSize: 14.5, color: COLORS.textPrimary, fontWeight: 500 }}>
                {value || "—"}
            </div>
        </div>
    );
}

/** Tiêu đề một khối nội dung trong tab, có gạch chân nhạt. */
function Section({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
    return (
        <section style={{ marginBottom: 32 }}>
            <div
                style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, fontSize: 15, fontWeight: 600, color: COLORS.textPrimary,
                    marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${COLORS.borderLight}`,
                }}
            >
                <span>{title}</span>
                {extra}
            </div>
            {children}
        </section>
    );
}

/**
 * Dải quy trình tuyển dụng: bước đã qua, bước hiện tại và bước còn lại,
 * kèm ngày chuyển vòng lấy từ lịch sử hồ sơ.
 */
function ProcessTimeline({ stages, currentStageId, rejected, stageDates }: {
    stages: PipelineStageResponse[];
    currentStageId: number;
    rejected: boolean;
    stageDates: Record<string, string>;
}) {
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    return (
        <div style={{ display: "flex", overflowX: "auto", paddingBottom: 8 }}>
            {stages.map((stage, index) => {
                const isPast = !rejected && currentIndex >= 0 && index < currentIndex;
                const isActive = !rejected && index === currentIndex;
                const dotBg = rejected ? "#FEE2E2" : isActive ? COLORS.accentWarm : isPast ? COLORS.primary : "#E5E7EB";
                const dotColor = rejected ? COLORS.error : isActive || isPast ? "#fff" : COLORS.textMuted;
                return (
                    <div
                        key={stage.id}
                        style={{ flex: 1, minWidth: 130, textAlign: "center", position: "relative", padding: "0 8px" }}
                    >
                        {index < stages.length - 1 && (
                            <span
                                style={{
                                    position: "absolute", top: 17, left: "50%", width: "100%", height: 3, zIndex: 0,
                                    background: isPast ? COLORS.primary : "#E5E7EB",
                                }}
                            />
                        )}
                        <div
                            style={{
                                width: 36, height: 36, borderRadius: "50%", margin: "0 auto 10px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, fontWeight: 600, position: "relative", zIndex: 1,
                                border: "3px solid #fff", boxShadow: `0 0 0 2px ${dotBg}`,
                                background: dotBg, color: dotColor,
                            }}
                        >
                            {rejected ? <CloseCircleOutlined /> : isPast ? <CheckCircleOutlined /> : index + 1}
                        </div>
                        <div
                            style={{
                                fontSize: 13, lineHeight: 1.35,
                                fontWeight: isActive || isPast ? 600 : 500,
                                color: isActive || isPast ? COLORS.textPrimary : COLORS.textMuted,
                            }}
                        >
                            {stage.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 3 }}>
                            {stageDates[stage.name] ? formatDate(stageDates[stage.name]) : "—"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function CandidateApplicationDetailPage() {
    const { applicationId: applicationIdParam } = useParams();
    const navigate = useNavigate();
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
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [cancelingInterviewId, setCancelingInterviewId] = useState<number | null>(null);

    const [interviewModalOpen, setInterviewModalOpen] = useState(false);
    const [offerModalOpen, setOfferModalOpen] = useState(false);
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
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được hồ sơ ứng tuyển");
        } finally {
            setLoading(false);
        }
    }, [applicationId, message]);

    useEffect(() => { loadAll(); }, [loadAll]);

    /**
     * Auto-extract CV when application is loaded and has a resumeUrl.
     * Checks cache first — only calls AI API if cache miss.
     */
    useEffect(() => {
        if (!application?.resumeUrl || aiExtractTriggered.current) return;
        aiExtractTriggered.current = true;

        const resumeUrl = application.resumeUrl;

        // 1. Check cache
        const cached = getCachedExtraction(applicationId, resumeUrl);
        if (cached) {
            setAiResult(cached.result);
            setAiProvenance(cached.provenance);
            return;
        }

        // 2. Cache miss → call AI API in background
        setAiLoading(true);
        setAiError(null);
        extractCvFromUrl(resumeUrl)
            .then((res) => {
                const data: CVExtractionResponse = res.data;
                if (data.status === "error" || !data.result) {
                    setAiError(data.error_message ?? "Không thể phân tích CV. Vui lòng thử lại.");
                    return;
                }
                setAiResult(data.result);
                setAiProvenance(data.provenance);
                // Save to cache
                setCachedExtraction(applicationId, {
                    resumeUrl,
                    result: data.result,
                    provenance: data.provenance,
                    cachedAt: Date.now(),
                });
            })
            .catch((err) => {
                const axiosErr = err as AxiosError<{ message?: string; error_message?: string; detail?: string }>;
                if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout")) {
                    setAiError("Quá thời gian xử lý (>2 phút). AI-service có thể đang quá tải.");
                } else if (axiosErr.response) {
                    const data = axiosErr.response.data;
                    setAiError(data?.error_message ?? data?.message ?? data?.detail ?? `Lỗi server (HTTP ${axiosErr.response.status}).`);
                } else {
                    setAiError("Không thể kết nối đến server AI.");
                }
            })
            .finally(() => setAiLoading(false));
    }, [application, applicationId]);

    /** Re-extract: clear cache and call AI again */
    const handleReExtract = useCallback(async () => {
        if (!application?.resumeUrl) return;
        clearCachedExtraction(applicationId);
        setAiResult(null);
        setAiProvenance(null);
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await extractCvFromUrl(application.resumeUrl);
            const data: CVExtractionResponse = res.data;
            if (data.status === "error" || !data.result) {
                setAiError(data.error_message ?? "Không thể phân tích CV.");
                return;
            }
            setAiResult(data.result);
            setAiProvenance(data.provenance);
            setCachedExtraction(applicationId, {
                resumeUrl: application.resumeUrl,
                result: data.result,
                provenance: data.provenance,
                cachedAt: Date.now(),
            });
            message.success("Đã phân tích lại CV thành công");
        } catch (err) {
            const axiosErr = err as AxiosError<{ message?: string; error_message?: string; detail?: string }>;
            setAiError(axiosErr.response?.data?.error_message ?? "Phân tích lại thất bại.");
        } finally {
            setAiLoading(false);
        }
    }, [application, applicationId, message]);

    /** Ngày hồ sơ bước vào từng vòng — lấy lần chuyển vào vòng đó sớm nhất. */
    const stageDates = useMemo(() => {
        const map: Record<string, string> = {};
        [...history]
            .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
            .forEach((h) => {
                if (!map[h.toStageName]) map[h.toStageName] = h.changedAt;
            });
        return map;
    }, [history]);

    const handlePass = async () => {
        if (!application) return;
        setActionLoading(true);
        try {
            await advanceApplicationStage(application.id, { note: "Chuyển vòng tiếp theo" });
            message.success("Đã chuyển vòng tiếp theo, ứng viên sẽ được thông báo qua email");
            loadAll();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setActionLoading(false);
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

    if (loading && !application) {
        return (
            <div className="page-container" style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!application || !candidate) {
        return (
            <div className="page-container">
                <EmptyState title="Không tìm thấy hồ sơ ứng tuyển" description="Hồ sơ có thể đã bị xóa hoặc bạn không có quyền xem." />
            </div>
        );
    }

    const isRejected = application.currentStageType === "REJECTED";
    const isHired = application.currentStageType === "HIRED";

    const mainStages = stages.filter((s) => s.stageType !== "REJECTED");
    const currentStageIndex = mainStages.findIndex((s) => s.id === application.currentStageId);
    const nextStage = currentStageIndex >= 0 && currentStageIndex < mainStages.length - 1
        ? mainStages[currentStageIndex + 1] : null;

    // Chỉ cho phép lên lịch khi hồ sơ đang thực sự ở một vòng phỏng vấn.
    const showInterviewBtn = INTERVIEW_STAGE_TYPES.includes(application.currentStageType);
    const showOfferBtn = application.currentStageType === "OFFER";

    const activity: ActivityItem[] = [
        ...history.map((h) => ({
            kind: "history" as const,
            timestamp: h.changedAt,
            content: (
                <>
                    <div style={{ fontWeight: 500 }}>{h.fromStageName ? `${h.fromStageName} → ${h.toStageName}` : `Bắt đầu: ${h.toStageName}`}</div>
                    {h.note && <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{h.note}</div>}
                    <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                        {h.changedByUserName} · {new Date(h.changedAt).toLocaleString("vi-VN")}
                    </div>
                </>
            ),
        })),
        ...comments.map((c) => ({
            kind: "comment" as const,
            timestamp: c.createdAt,
            content: (
                <>
                    <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                        {c.authorUserName} · {new Date(c.createdAt).toLocaleString("vi-VN")}
                    </div>
                </>
            ),
        })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const getInitials = (name: string) => {
        const parts = name.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const metaItem = (icon: ReactNode, value: ReactNode) => (
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: COLORS.textSecondary }}>
            {icon} {value}
        </span>
    );

    /* ── Tab 1: Tổng quan ─────────────────────────────── */
    const overviewTab = (
        <>
            {mainStages.length > 0 && (
                <Section title="Quy trình tuyển dụng">
                    <ProcessTimeline
                        stages={mainStages}
                        currentStageId={application.currentStageId}
                        rejected={isRejected}
                        stageDates={stageDates}
                    />
                </Section>
            )}

            {/* Ho ten, email, dien thoai, dia chi da nam tren the dinh danh phia tren
                nen khong lap lai o day. */}
            <Section title="Thông tin cơ bản">
                <Row gutter={48}>
                    <Col xs={24} md={12}>
                        <Field label="Ngày sinh" value={formatDate(candidate.dateOfBirth)} />
                        <Field label="Vị trí hiện tại" value={candidate.currentPosition} />
                    </Col>
                    <Col xs={24} md={12}>
                        <Field label="Giới tính" value={candidate.gender} />
                        <Field label="Học vấn" value={candidate.educationLevelName} />
                    </Col>
                </Row>
                {candidate.skillNames?.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12.5, color: COLORS.textSecondary, fontWeight: 500, marginBottom: 6 }}>
                            Kỹ năng
                        </div>
                        <Space wrap size={4}>
                            {candidate.skillNames.map((s) => (
                                <Tag key={s} color="blue" style={{ borderRadius: 6 }}>{s}</Tag>
                            ))}
                        </Space>
                    </div>
                )}
            </Section>

            <Section title="Thông tin ứng tuyển">
                <Row gutter={48}>
                    <Col xs={24} md={12}>
                        <Field label="Phòng ban" value={application.departmentName} />
                        <Field label="Nguồn ứng tuyển" value={application.recruitmentSourceName} />
                    </Col>
                    <Col xs={24} md={12}>
                        {application.rejectionReasonName && (
                            <Field label="Lý do từ chối" value={application.rejectionReasonName} />
                        )}
                    </Col>
                </Row>
                {application.note && (
                    <Field label="Ghi chú ứng tuyển" value={application.note} />
                )}
            </Section>

        </>
    );

    /* ── Tab: Phỏng vấn ──────────────────────────────── */
    const interviewTab = (
        <Section
            title="Lịch phỏng vấn"
            extra={isHr && showInterviewBtn ? (
                <Button size="small" icon={<CalendarOutlined />} onClick={() => setInterviewModalOpen(true)}>
                    Lên lịch
                </Button>
            ) : undefined}
        >
            {interviews.length === 0 ? (
                <div style={{ color: COLORS.textMuted, fontSize: 13, padding: "8px 0" }}>
                    Chưa có lịch phỏng vấn nào cho hồ sơ này.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {interviews.map((iv) => {
                        const meta = statusMeta(INTERVIEW_STATUS, iv.status);
                        const cancellable = iv.status === "SCHEDULED" || iv.status === "CONFIRMED";
                        const scheduled = new Date(iv.scheduledAt);
                        return (
                            <div key={iv.id} style={{
                                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
                                padding: "14px 16px", borderRadius: 10, border: `1px solid ${COLORS.borderLight}`, background: "#F9FAFB",
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
                                                <LinkOutlined /> Link họp
                                            </a>
                                        ) : iv.workLocationId ? (
                                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                <EnvironmentOutlined /> {workLocationMap[iv.workLocationId] ?? "—"}
                                            </span>
                                        ) : null}
                                        {iv.interviewers.length > 0 && (
                                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                <TeamOutlined /> {iv.interviewers.map((p) => p.fullName).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                    {iv.note && (
                                        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>{iv.note}</div>
                                    )}
                                </div>
                                {isHr && cancellable && (
                                    <Popconfirm
                                        title="Hủy lịch phỏng vấn này?"
                                        description="Ứng viên và người phỏng vấn sẽ nhận được thông báo hủy."
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
        </Section>

    );

    /* ── Tab: Hoạt động ──────────────────────────────── */
    const activityTab = (
        <Section title="Lịch sử hoạt động">
            {activity.length === 0 ? (
                <div style={{ color: COLORS.textMuted, fontSize: 13, padding: "8px 0" }}>
                    Chưa có hoạt động nào.
                </div>
            ) : (
                <Timeline
                    items={activity.map((item) => ({
                        dot: item.kind === "comment" ? <CommentOutlined /> : <SwapOutlined />,
                        children: item.content,
                    }))}
                />
            )}
        </Section>
    );

    /* ── Tab 2: Hồ sơ CV ──────────────────────────────── */
    const resumeTab = (
        <Row gutter={24}>
            <Col xs={24} lg={15}>
                <div style={{
                    border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, overflow: "hidden",
                    background: "#F8FAFC", minHeight: 620, display: "flex", flexDirection: "column",
                }}>
                    <div style={{
                        background: "#F1F5F9", padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
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
                            style={{ width: "100%", flex: 1, minHeight: 560, border: "none" }}
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
            </Col>

            <Col xs={24} lg={9}>
                {/* ── AI Loading state ── */}
                {aiLoading && (
                    <div style={{
                        background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: "24px 20px",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI</Tag>
                            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Đang trích xuất thông tin CV...</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: "50%",
                                background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
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
                        background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "18px 20px",
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
                        <Button icon={<ReloadOutlined />} onClick={handleReExtract} block>
                            Thử lại
                        </Button>
                    </div>
                )}

                {/* ── AI Result with scrollbar ── */}
                {!aiLoading && !aiError && aiResult && aiProvenance && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI Trích Xuất CV</Tag>
                            <Button size="small" icon={<RobotOutlined />} onClick={handleReExtract} loading={aiLoading}>Phân tích lại</Button>
                        </div>
                        <div
                            className="ai-result-scroll"
                            style={{
                                maxHeight: "calc(100vh - 280px)",
                                overflowY: "auto",
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
                        background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: "18px 20px",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI</Tag>
                            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Trích xuất thông tin CV</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: "50%", background: "#EDE9FE", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <FileUnknownOutlined style={{ fontSize: 22, color: "#8B5CF6" }} />
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
            </Col>
        </Row>
    );

    return (
        <div className="page-container animate-fade-in" style={{ maxWidth: 1280 }}>
            {/* Link quay lai dat rieng mot dong, khong chiem cho trong hang dinh danh. */}
            <Button
                type="text"
                size="small"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{ paddingLeft: 0, marginBottom: 8, color: COLORS.textSecondary }}
            >
                Quay lại
            </Button>

            {/* ── Thẻ định danh ứng viên ───────────────────── */}
            <Card
                style={{
                    border: `1px solid ${COLORS.borderLight}`, borderRadius: 12,
                    boxShadow: SHADOWS.card, marginBottom: 20,
                }}
                styles={{ body: { padding: "24px 28px" } }}
            >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
                    <Avatar
                        size={88}
                        style={{ background: COLORS.primary, color: "#fff", fontWeight: 600, fontSize: 30, flexShrink: 0 }}
                    >
                        {getInitials(candidate.fullName)}
                    </Avatar>

                    <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>
                            {candidate.fullName}
                        </h1>
                        <div style={{ fontSize: 15, color: COLORS.primary, fontWeight: 500, margin: "4px 0 12px" }}>
                            {application.jobTitle || `Tin tuyển dụng #${application.jobPostingId}`}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px" }}>
                            {metaItem(<MailOutlined />, candidate.email)}
                            {candidate.phone && metaItem(<PhoneOutlined />, candidate.phone)}
                            {candidate.address && metaItem(<EnvironmentOutlined />, candidate.address)}
                            {metaItem(<CalendarOutlined />, `Ứng tuyển: ${formatDate(application.appliedAt)}`)}
                        </div>
                    </div>

                    {/* Trang thai luon bam phai cung hang voi ten; nhom nut xuong hang rieng ben duoi
                        de khong bi day lech khi ten hoac tieu de tin tuyen dung dai. */}
                    <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                        <Tag
                            color={stageTypeTagColor(application.currentStageType)}
                            style={{ margin: 0, borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 500 }}
                        >
                            {application.currentStageName}
                        </Tag>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <div>
                        {isHired ? (
                            <Tag color="success" style={{ margin: 0, borderRadius: 8, padding: "6px 14px", fontWeight: 600 }}>
                                <CheckCircleOutlined /> Đã tuyển dụng thành công
                            </Tag>
                        ) : isRejected ? (
                            <Tag color="error" style={{ margin: 0, borderRadius: 8, padding: "6px 14px", fontWeight: 600 }}>
                                <CloseCircleOutlined /> Hồ sơ đã bị từ chối
                            </Tag>
                        ) : isHr ? (
                            <Space wrap size={8} style={{ justifyContent: "flex-end" }}>
                                <Button type="text" danger icon={<CloseCircleOutlined />} onClick={() => setRejectModalOpen(true)}>
                                    Từ chối hồ sơ
                                </Button>
                                {showInterviewBtn && (
                                    <Button icon={<CalendarOutlined />} onClick={() => setInterviewModalOpen(true)}>
                                        Lên lịch phỏng vấn
                                    </Button>
                                )}
                                {showOfferBtn && (
                                    <Button
                                        icon={<DollarOutlined />}
                                        style={{ background: "#722ED1", color: "#fff", borderColor: "#722ED1" }}
                                        onClick={() => setOfferModalOpen(true)}
                                    >
                                        Tạo đề nghị nhận việc
                                    </Button>
                                )}
                                <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={handlePass}>
                                    {nextStage ? `Chuyển sang "${nextStage.name}"` : "Chuyển vòng tiếp theo"}
                                </Button>
                            </Space>
                        ) : null}
                    </div>
                </div>
            </Card>

            {/* ── Ba tab nội dung ──────────────────────────── */}
            <Card
                style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12 }}
                styles={{ body: { padding: "8px 28px 28px" } }}
            >
                <Tabs
                    defaultActiveKey="overview"
                    size="large"
                    items={[
                        { key: "overview", label: "Tổng quan", children: overviewTab },
                        { key: "resume", label: "Hồ sơ", children: resumeTab },
                        { key: "interview", label: "Phỏng vấn", children: interviewTab },
                        {
                            key: "evaluation",
                            label: "Đánh giá",
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
                        { key: "activity", label: "Hoạt động", children: activityTab },
                    ]}
                />
            </Card>

            <InterviewQuickCreateModal
                open={interviewModalOpen}
                lockedApplicationId={application.id}
                onClose={() => setInterviewModalOpen(false)}
                onSuccess={() => { setInterviewModalOpen(false); loadAll(); }}
            />
            <OfferCreateModal
                open={offerModalOpen}
                defaultApplicationId={application.id}
                onClose={() => setOfferModalOpen(false)}
                onSuccess={() => setOfferModalOpen(false)}
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
