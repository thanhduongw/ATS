import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    App, Card, Row, Col, Tag, Button, Space, Input, Spin, Avatar, Timeline, Empty,
} from "antd";
import {
    ArrowLeftOutlined, CalendarOutlined, DollarOutlined, CommentOutlined, SwapOutlined, SendOutlined,
    DownloadOutlined, ExpandOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined,
    FileUnknownOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, IdcardOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
    getApplicationById, advanceApplicationStage, getApplicationHistory, getApplicationComments, addApplicationComment,
} from "../applicationApi";
import { getCandidateById, updateCandidate } from "../candidateApi";
import type {
    ApiMessageResponse, ApplicationResponse, CandidateResponse,
    ApplicationHistoryResponse, ApplicationCommentResponse,
} from "../types";
import RejectApplicationModal from "../components/RejectApplicationModal";
import InterviewCreateModal from "../../interview/components/InterviewCreateModal";
import OfferCreateModal from "../../offer/components/OfferCreateModal";
import { COLORS } from "../../../app/theme";
import { stageTypeTagColor } from "../../../app/statusLabels";

const { TextArea } = Input;

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
            style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 20 }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>}
            extra={extra}
        >
            {children}
        </Card>
    );
}

export default function CandidateApplicationDetailPage() {
    const { applicationId: applicationIdParam } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    const [candidate, setCandidate] = useState<CandidateResponse | null>(null);
    const [history, setHistory] = useState<ApplicationHistoryResponse[]>([]);
    const [comments, setComments] = useState<ApplicationCommentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [interviewModalOpen, setInterviewModalOpen] = useState(false);
    const [offerModalOpen, setOfferModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);

    const [noteDraft, setNoteDraft] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    const applicationId = Number(applicationIdParam);

    const loadAll = useCallback(async () => {
        if (!applicationId) return;
        setLoading(true);
        try {
            const appRes = await getApplicationById(applicationId);
            setApplication(appRes.data);
            const candRes = await getCandidateById(appRes.data.candidateId);
            setCandidate(candRes.data);
            setNoteDraft(candRes.data.internalNote ?? "");
            const [historyRes, commentsRes] = await Promise.all([
                getApplicationHistory(applicationId),
                getApplicationComments(applicationId),
            ]);
            setHistory(historyRes.data);
            setComments(commentsRes.data);
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

    const handleSaveNote = async () => {
        if (!candidate) return;
        setSavingNote(true);
        try {
            await updateCandidate(candidate.id, {
                fullName: candidate.fullName,
                email: candidate.email,
                phone: candidate.phone,
                dateOfBirth: candidate.dateOfBirth,
                gender: candidate.gender,
                address: candidate.address,
                currentPosition: candidate.currentPosition,
                educationLevelId: candidate.educationLevelId,
                skillIds: candidate.skillIds,
                internalNote: noteDraft,
                customFields: candidate.customFields,
            });
            message.success("Đã lưu ghi chú");
            loadAll();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không lưu được ghi chú");
        } finally {
            setSavingNote(false);
        }
    };

    const handlePostComment = async () => {
        if (!application || !newComment.trim()) return;
        setPostingComment(true);
        try {
            await addApplicationComment(application.id, newComment.trim());
            setNewComment("");
            loadAll();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không gửi được bình luận");
        } finally {
            setPostingComment(false);
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
                <Empty description="Không tìm thấy hồ sơ ứng tuyển" />
            </div>
        );
    }

    const isTerminal = application.currentStageType === "HIRED" || application.currentStageType === "REJECTED";

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
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
                    <Avatar size={48} style={{ background: COLORS.primary, color: "#fff", fontWeight: 600, fontSize: 16 }}>
                        {getInitials(candidate.fullName)}
                    </Avatar>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                <Space wrap>
                    <Button type="primary" icon={<CalendarOutlined />} onClick={() => setInterviewModalOpen(true)}>
                        Lên lịch phỏng vấn
                    </Button>
                    <Button icon={<DollarOutlined />} style={{ background: "#722ed1", color: "#fff", borderColor: "#722ed1" }}
                        onClick={() => setOfferModalOpen(true)}>
                        Tạo Offer
                    </Button>
                </Space>
            </div>

            <Row gutter={20}>
                <Col xs={24} lg={12}>
                    <SectionCard title="Thông tin ứng viên">
                        <Row gutter={16}>
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
                </Col>
                <Col xs={24} lg={12}>
                    <SectionCard title="Đơn ứng tuyển">
                        <Row gutter={16}>
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
                </Col>
            </Row>

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

            {/* CV viewer */}
            <SectionCard
                title="Hồ sơ / CV"
                extra={application.resumeUrl && (
                    <Space>
                        <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="small" icon={<DownloadOutlined />}>Tải xuống</Button>
                        </a>
                        <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="small" icon={<ExpandOutlined />}>Toàn màn hình</Button>
                        </a>
                    </Space>
                )}
            >
                {application.resumeUrl ? (
                    <iframe
                        src={application.resumeUrl}
                        title="CV"
                        style={{ width: "100%", height: 560, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: "#F8FAFC" }}
                    />
                ) : (
                    <Empty image={<FileUnknownOutlined style={{ fontSize: 40, color: COLORS.textMuted }} />} description="Ứng viên chưa có CV" />
                )}
            </SectionCard>

            <Row gutter={20}>
                <Col xs={24} lg={12}>
                    <SectionCard title="Ghi chú của Recruiter">
                        <TextArea
                            rows={4}
                            placeholder="Ghi chú nội bộ về ứng viên..."
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                        />
                        <Button
                            type="primary"
                            style={{ marginTop: 12 }}
                            loading={savingNote}
                            onClick={handleSaveNote}
                        >
                            Lưu ghi chú
                        </Button>
                    </SectionCard>
                </Col>
                <Col xs={24} lg={12}>
                    <SectionCard title="Cập nhật đơn ứng tuyển">
                        {isTerminal ? (
                            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>
                                Hồ sơ đã kết thúc quy trình tuyển dụng ({application.currentStageName}).
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>
                                    Thay đổi trạng thái sẽ tự động gửi email thông báo cho ứng viên.
                                </div>
                                <Space wrap>
                                    <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={handlePass}>
                                        Chuyển vòng & thông báo
                                    </Button>
                                    <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectModalOpen(true)}>
                                        Từ chối hồ sơ
                                    </Button>
                                </Space>
                            </>
                        )}
                    </SectionCard>
                </Col>
            </Row>

            <SectionCard title="Lịch sử hoạt động">
                <Space.Compact style={{ width: "100%", marginBottom: 20 }}>
                    <TextArea
                        rows={2}
                        placeholder="Viết bình luận... (dùng @Họ Tên để nhắc đồng nghiệp)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={postingComment}
                        disabled={!newComment.trim()}
                        onClick={handlePostComment}
                    >
                        Gửi
                    </Button>
                </Space.Compact>

                {activity.length === 0 ? (
                    <Empty description="Chưa có hoạt động nào" />
                ) : (
                    <Timeline
                        items={activity.map((item) => ({
                            dot: item.kind === "comment" ? <CommentOutlined /> : <SwapOutlined />,
                            children: item.content,
                        }))}
                    />
                )}
            </SectionCard>

            <InterviewCreateModal
                open={interviewModalOpen}
                applicationId={application.id}
                onClose={() => setInterviewModalOpen(false)}
                onSuccess={() => setInterviewModalOpen(false)}
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
