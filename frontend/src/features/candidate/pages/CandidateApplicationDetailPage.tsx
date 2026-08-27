import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    App, Card, Row, Col, Tag, Button, Space, Spin, Avatar, Timeline, Empty, Popconfirm, Tabs,
} from "antd";
import {
    ArrowLeftOutlined, CalendarOutlined, DollarOutlined, CommentOutlined, SwapOutlined,
    DownloadOutlined, ExpandOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined,
    FileUnknownOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, IdcardOutlined,
    VideoCameraOutlined, LinkOutlined, TeamOutlined, ClockCircleOutlined, StopOutlined,
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
import { COLORS, SHADOWS } from "../../../app/theme";
import { stageTypeTagColor, INTERVIEW_STATUS, statusMeta } from "../../../app/statusLabels";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import EmptyState from "../../../components/ui/EmptyState";

interface ActivityItem {
    kind: "history" | "comment";
    timestamp: string;
    content: ReactNode;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                {icon} {label}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: 500 }}>{value ?? "—"}</div>
        </div>
    );
}

function SectionCard({ title, extra, children }: { title: ReactNode; extra?: ReactNode; children: ReactNode }) {
    return (
        <Card
            style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, marginBottom: 20 }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>}
            extra={extra}
        >
            {children}
        </Card>
    );
}

/** Thanh tiến trình quy trình tuyển dụng — bước đã qua (xanh nhạt), bước hiện tại (xanh đậm, nổi bật), bước sau (xám). */
function PipelineStepper({ stages, currentStageId, rejected }: {
    stages: PipelineStageResponse[]; currentStageId: number; rejected: boolean;
}) {
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    return (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            {stages.map((stage, index) => {
                const isPast = !rejected && currentIndex >= 0 && index < currentIndex;
                const isActive = !rejected && index === currentIndex;
                return (
                    <div key={stage.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, border: "2px solid #fff",
                            background: rejected ? "#FEE2E2" : isActive ? COLORS.primaryLight : isPast ? "#DCFCE7" : "#E5E7EB",
                            color: rejected ? COLORS.error : isActive ? "#fff" : isPast ? COLORS.primaryDark : COLORS.textMuted,
                            boxShadow: isActive ? `0 0 0 4px rgba(16, 185, 129, 0.15)` : undefined,
                        }}>
                            {rejected ? <CloseCircleOutlined /> : isPast ? <CheckCircleOutlined /> : index + 1}
                        </div>
                        <div style={{
                            fontSize: 12, textAlign: "center", lineHeight: 1.3,
                            fontWeight: isActive ? 700 : isPast ? 600 : 500,
                            color: rejected ? COLORS.error : isActive ? COLORS.primaryLight : isPast ? COLORS.primaryDark : COLORS.textMuted,
                        }}>
                            {stage.name}
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

    const applicationId = Number(applicationIdParam);

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
    const isTerminal = isHired || isRejected;

    const mainStages = stages.filter((s) => s.stageType !== "REJECTED");
    const currentStageIndex = mainStages.findIndex((s) => s.id === application.currentStageId);
    const nextStage = currentStageIndex >= 0 && currentStageIndex < mainStages.length - 1
        ? mainStages[currentStageIndex + 1] : null;

    // Nút hành động chỉ hiện đúng theo trạng thái hồ sơ: PV khi chưa tới vòng Offer, Offer chỉ khi đang ở vòng Offer.
    const showInterviewBtn = !isTerminal && application.currentStageType !== "OFFER";
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

    return (
        <div className="page-shell animate-fade-in">
            {/* Header — cố định trên cùng, trang không cuộn toàn bộ. Trái: định danh ứng viên. Phải: thanh hành động xếp 2 hàng theo mức ưu tiên. */}
            <div className="page-shell-fixed" style={{
                background: "#fff", border: `1px solid ${COLORS.borderLight}`, borderRadius: 16,
                boxShadow: SHADOWS.card,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 16, flexWrap: "wrap", padding: "16px 20px", marginBottom: 14,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
                    <Avatar size={48} style={{ background: COLORS.primary, color: "#fff", fontWeight: 600, fontSize: 16, flexShrink: 0 }}>
                        {getInitials(candidate.fullName)}
                    </Avatar>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{candidate.fullName}</h2>
                            <Tag color={stageTypeTagColor(application.currentStageType)} style={{ borderRadius: 6 }}>
                                {application.currentStageName}
                            </Tag>
                        </div>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            Ứng tuyển: {application.jobTitle || `Job #${application.jobPostingId}`}
                            {application.departmentName ? ` · ${application.departmentName}` : ""}
                        </div>
                    </div>
                </div>

                {isHired ? (
                    <Tag color="success" style={{ borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                        <CheckCircleOutlined /> Đã tuyển dụng thành công
                    </Tag>
                ) : isRejected ? (
                    <Tag color="error" style={{ borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                        <CloseCircleOutlined /> Hồ sơ đã bị từ chối
                    </Tag>
                ) : isHr ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <Space wrap size={8}>
                            <Button type="text" danger icon={<CloseCircleOutlined />} onClick={() => setRejectModalOpen(true)}>
                                Từ chối hồ sơ
                            </Button>
                            <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={handlePass}>
                                {nextStage ? `Chuyển sang "${nextStage.name}"` : "Chuyển vòng tiếp theo"}
                            </Button>
                        </Space>
                        {(showInterviewBtn || showOfferBtn) && (
                            <Space wrap size={8}>
                                {showInterviewBtn && (
                                    <Button icon={<CalendarOutlined />} onClick={() => setInterviewModalOpen(true)}>
                                        Lên lịch phỏng vấn
                                    </Button>
                                )}
                                {showOfferBtn && (
                                    <Button icon={<DollarOutlined />} style={{ background: "#722ed1", color: "#fff", borderColor: "#722ed1" }}
                                        onClick={() => setOfferModalOpen(true)}>
                                        Tạo Offer
                                    </Button>
                                )}
                            </Space>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Pipeline stepper */}
            {mainStages.length > 0 && (
                <Card size="small" className="page-shell-fixed" style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        Quy trình tuyển dụng
                    </div>
                    <PipelineStepper stages={mainStages} currentStageId={application.currentStageId} rejected={isRejected} />
                </Card>
            )}

            {/* Nội dung chính — 2 cột, mỗi cột tự cuộn riêng trong phần còn lại của màn hình. */}
            <Row gutter={12} style={{ flex: 1, minHeight: 0 }}>
                <Col xs={24} lg={13} style={{ height: "100%", overflowY: "auto", paddingBottom: 4 }}>

                    {/* Lịch phỏng vấn — hiện lại ngay sau khi tạo, không còn "biến mất" sau khi đóng modal */}
                    <SectionCard title="Lịch phỏng vấn">
                        {interviews.length === 0 ? (
                            <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
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
                                                        <VideoCameraOutlined /> {iv.format === "ONLINE" ? "Online" : "Offline"}
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
                    </SectionCard>

                    <SectionCard title="Thông tin ứng viên">
                        <Row gutter={12}>
                            <Col span={12}>
                                <InfoRow icon={<IdcardOutlined />} label="Họ và tên" value={candidate.fullName} />
                                <InfoRow icon={<PhoneOutlined />} label="Điện thoại" value={candidate.phone} />
                                <InfoRow icon={<MailOutlined />} label="Email" value={candidate.email} />
                            </Col>
                            <Col span={12}>
                                <InfoRow icon={<EnvironmentOutlined />} label="Địa chỉ" value={candidate.address} />
                                <InfoRow icon={<IdcardOutlined />} label="Vị trí hiện tại" value={candidate.currentPosition} />
                                <InfoRow icon={<IdcardOutlined />} label="Học vấn" value={candidate.educationLevelName} />
                            </Col>
                        </Row>
                        {candidate.skillNames?.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>Kỹ năng</div>
                                <Space wrap size={4}>
                                    {candidate.skillNames.map((s) => (
                                        <Tag key={s} color="blue" style={{ borderRadius: 6 }}>{s}</Tag>
                                    ))}
                                </Space>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Đơn ứng tuyển">
                        <Row gutter={12}>
                            <Col span={12}>
                                <InfoRow icon={<IdcardOutlined />} label="Phòng ban" value={application.departmentName} />
                                <InfoRow icon={<IdcardOutlined />} label="Vị trí" value={application.jobTitle} />
                                <InfoRow icon={<IdcardOutlined />} label="Người phụ trách" value={application.assignedRecruiterName} />
                            </Col>
                            <Col span={12}>
                                <InfoRow icon={<IdcardOutlined />} label="Nguồn ứng tuyển" value={application.recruitmentSourceName} />
                                <InfoRow icon={<CalendarOutlined />} label="Ngày ứng tuyển" value={new Date(application.appliedAt).toLocaleDateString("vi-VN")} />
                                {application.rejectionReasonName && (
                                    <InfoRow icon={<CloseCircleOutlined />} label="Lý do từ chối" value={application.rejectionReasonName} />
                                )}
                            </Col>
                        </Row>
                        {application.note && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>Ghi chú ứng tuyển</div>
                                <div style={{ fontSize: 13 }}>{application.note}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* AI CV Screening — placeholder, chưa có dữ liệu thật */}
                    <SectionCard
                        title={<span><RobotOutlined style={{ marginRight: 8, color: "#8B5CF6" }} />AI CV Screening</span>}
                        extra={<Tag color="purple" style={{ borderRadius: 6 }}>AI</Tag>}
                    >
                        <div style={{
                            display: "flex", alignItems: "center", gap: 16, padding: "16px 4px",
                            color: COLORS.textSecondary,
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: "50%", background: "#F5F3FF",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                                <RobotOutlined style={{ fontSize: 24, color: "#8B5CF6" }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: COLORS.textPrimary, marginBottom: 2 }}>
                                    Tính năng đang được phát triển
                                </div>
                                <div style={{ fontSize: 13 }}>
                                    Chấm điểm và phân tích CV tự động bằng AI sẽ sớm ra mắt trong giai đoạn tiếp theo.
                                </div>
                            </div>
                            <Button disabled icon={<RobotOutlined />}>Chạy phân tích AI</Button>
                        </div>
                    </SectionCard>
                </Col>

                {/* Cột phải — CV & lịch sử hoạt động, mỗi tab tự cuộn trong phần còn lại. */}
                <Col xs={24} lg={11} style={{ height: "100%" }}>
                    <Card
                        className="table-card-fill"
                        style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, height: "100%" }}
                        styles={{ body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 } }}
                    >
                        <Tabs
                            className="tabs-fill"
                            style={{ padding: "0 16px" }}
                            items={[
                                {
                                    key: "cv",
                                    label: "Hồ sơ / CV",
                                    children: (
                                        <div style={{ height: "100%", display: "flex", flexDirection: "column", paddingBottom: 12 }}>
                                            {application.resumeUrl && (
                                                <Space style={{ marginBottom: 10, flexShrink: 0 }}>
                                                    <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                                                        <Button size="small" icon={<DownloadOutlined />}>Tải xuống</Button>
                                                    </a>
                                                    <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                                                        <Button size="small" icon={<ExpandOutlined />}>Toàn màn hình</Button>
                                                    </a>
                                                </Space>
                                            )}
                                            {application.resumeUrl ? (
                                                <iframe
                                                    src={application.resumeUrl}
                                                    title="CV"
                                                    style={{ width: "100%", flex: 1, minHeight: 0, border: `1px solid ${COLORS.borderLight}`, borderRadius: 8, background: "#F8FAFC" }}
                                                />
                                            ) : (
                                                <Empty image={<FileUnknownOutlined style={{ fontSize: 40, color: COLORS.textMuted }} />} description="Ứng viên chưa có CV" />
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    key: "activity",
                                    label: "Lịch sử hoạt động",
                                    children: (
                                        <div style={{ height: "100%", overflowY: "auto", paddingBottom: 12 }}>
                                            {activity.length === 0 ? (
                                                <EmptyState title="Chưa có hoạt động nào" description="Lịch sử thay đổi và bình luận sẽ hiển thị tại đây." />
                                            ) : (
                                                <Timeline
                                                    items={activity.map((item) => ({
                                                        dot: item.kind === "comment" ? <CommentOutlined /> : <SwapOutlined />,
                                                        children: item.content,
                                                    }))}
                                                />
                                            )}
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>

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
