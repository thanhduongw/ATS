import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    App, Alert, Button, Card, Popconfirm, Spin, Tag,
} from "antd";
import {
    CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined,
    EditOutlined, SendOutlined,
} from "@ant-design/icons";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import {
    approveOffer, deleteOffer, getOfferById, getOfferPdf, submitOffer,
} from "../offerApi";
import OfferRejectModal from "../components/OfferRejectModal";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS, RADIUS } from "../../../app/theme";
import PageHeader from "../../../components/ui/PageHeader";
import { formatMoney } from "../../../app/money";
import { OFFER_STATUS, statusMeta } from "../../../app/statusLabels";

const initialsOf = (name: string) =>
    (name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0] ?? "").join("").toUpperCase();

const fmtDate = (v?: string | null) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");
const fmtDateTime = (v?: string | null) => (v ? dayjs(v).format("HH:mm DD/MM/YYYY") : "—");

export default function OfferDetailPage() {
    const { id } = useParams();
    const offerId = Number(id);
    const navigate = useNavigate();
    const { message } = App.useApp();

    const user = useAppSelector((s) => s.auth.user);
    const role = user?.role as UserRole | undefined;
    // AuthUser.userId là string (JWT sub) — convert để so với requesterId/approverId.
    const userId = user?.userId != null ? Number(user.userId) : undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    const [offer, setOffer] = useState<OfferResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getOfferById(offerId);
            setOffer(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được đề nghị nhận việc");
            navigate("/offers");
        } finally {
            setLoading(false);
        }
    }, [offerId, message, navigate]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading || !offer) {
        return (
            <div className="page-shell" style={{ display: "flex", justifyContent: "center", padding: 64 }}>
                <Spin />
            </div>
        );
    }

    const isOwner = userId != null && offer.requesterId === userId;
    const isApprover = userId != null && offer.approverId === userId;
    const meta = statusMeta(OFFER_STATUS, offer.status);

    const canEdit = isHr && isOwner && offer.status === "DRAFT";
    const canSubmit = isHr && isOwner && offer.status === "DRAFT";
    // Duyet dong thoi la gui: tu APPROVED ung vien moi doc duoc offer.
    const canApprove = isHr && isApprover && offer.status === "PENDING_APPROVAL";
    const canDelete = isHr && (offer.status === "DRAFT" || offer.status === "REJECTED");
    // Quy tac da chot cho phep tu duyet, nhung van phai noi ro de nguoi duyet y thuc duoc.
    const selfApproving = canApprove && isOwner;

    const run = async (fn: () => Promise<unknown>, okMsg: string, failMsg: string) => {
        setActing(true);
        try {
            await fn();
            message.success(okMsg);
            await load();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? failMsg);
        } finally {
            setActing(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            const res = await getOfferPdf(offer.id);
            saveAs(res.data, `offer-letter-${offer.id}.pdf`);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được file PDF");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteOffer(offer.id);
            message.success("Đã xóa đề nghị nhận việc");
            navigate("/offers");
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Xóa thất bại");
        }
    };

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                className="page-shell-fixed"
                crumb={offer.candidateName}
                title={`Đề nghị nhận việc – ${offer.candidateName}`}
                tags={<Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>}
                actions={<>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadPdf}>Tải PDF</Button>
                    {canEdit && (
                        <Button icon={<EditOutlined />} onClick={() => navigate(`/offers/${offer.id}/edit`)}>
                            Chỉnh sửa
                        </Button>
                    )}
                    {canSubmit && (
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            loading={acting}
                            onClick={() => run(() => submitOffer(offer.id), "Đã gửi đề nghị vào luồng duyệt", "Gửi duyệt thất bại")}
                        >
                            Gửi duyệt
                        </Button>
                    )}
                    {canApprove && (
                        <>
                            <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectOpen(true)}>
                                Từ chối
                            </Button>
                            <Popconfirm
                                title="Duyệt và gửi đề nghị tới ứng viên?"
                                description={
                                    <div style={{ maxWidth: 340 }}>
                                        <div style={{ marginBottom: 6 }}>
                                            Ứng viên sẽ đọc được đề nghị ngay sau khi bạn duyệt.
                                        </div>
                                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                            <div>{offer.candidateName} · {offer.jobTitle ?? "—"}</div>
                                            <div>Lương {formatMoney(offer.salaryOffered)} · vào làm {fmtDate(offer.startDate)}</div>
                                            <div>Hạn phản hồi {fmtDateTime(offer.responseDeadline)}</div>
                                        </div>
                                    </div>
                                }
                                okText="Duyệt và gửi"
                                cancelText="Xem lại"
                                onConfirm={() => run(
                                    () => approveOffer(offer.id),
                                    "Đã duyệt và gửi đề nghị tới ứng viên",
                                    "Phê duyệt thất bại",
                                )}
                            >
                                <Button type="primary" icon={<CheckCircleOutlined />} loading={acting}>
                                    Duyệt và gửi ứng viên
                                </Button>
                            </Popconfirm>
                        </>
                    )}
                    {canDelete && (
                        <Popconfirm
                            title="Xóa đề nghị nhận việc này?"
                            description="Hành động này không thể hoàn tác."
                            onConfirm={handleDelete}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger>Xóa</Button>
                        </Popconfirm>
                    )}
                </>}
            />

            <div className="page-shell-scroll">
            {selfApproving && (
                <Alert
                    type="info"
                    showIcon
                    message="Bạn đang duyệt đề nghị do chính mình tạo"
                    description="Quy tắc hiện tại cho phép việc này. Thao tác duyệt được ghi vào nhật ký hệ thống kèm danh tính người duyệt."
                    style={{ marginBottom: 12, borderRadius: RADIUS.md }}
                />
            )}

            {offer.rejectReason && (
                <Alert
                    type="error"
                    showIcon
                    message="Đề nghị bị từ chối phê duyệt"
                    description={offer.rejectReason}
                    style={{ marginBottom: 12, borderRadius: RADIUS.md }}
                />
            )}
            {offer.declineReasonName && (
                <Alert
                    type="warning"
                    showIcon
                    message="Ứng viên từ chối đề nghị"
                    description={offer.declineReasonName + (offer.declineNote ? ` — ${offer.declineNote}` : "")}
                    style={{ marginBottom: 12, borderRadius: RADIUS.md }}
                />
            )}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16, alignItems: "start" }}
                className="offer-detail-grid">
                <div>
                    <Card size="small" title="Thông tin ứng viên" style={{ marginBottom: 16, borderRadius: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${COLORS.borderLight}` }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: "50%",
                                background: `${COLORS.primary}1A`, color: COLORS.primary,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 700, fontSize: 16, flexShrink: 0,
                            }}>
                                {initialsOf(offer.candidateName)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>{offer.candidateName}</div>
                                <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                    {offer.jobTitle ?? "—"}
                                </div>
                            </div>
                        </div>
                        <FieldGrid columns={2}>
                            <Field label="Email" value={offer.candidateEmail ?? "—"} />
                            <Field label="Số điện thoại" value={offer.candidatePhone ?? "—"} />
                        </FieldGrid>
                    </Card>

                    <Card size="small" title="Điều khoản đề nghị" style={{ borderRadius: 12 }}>
                        <FieldGrid columns={2}>
                            <Field
                                label="Mức lương"
                                value={<span style={{ color: COLORS.primary, fontWeight: 600, fontSize: 16 }}>
                                    {formatMoney(offer.salaryOffered)}
                                </span>}
                            />
                            <Field label="Phụ cấp" value={offer.allowance != null ? formatMoney(offer.allowance) : "—"} />
                            <Field label="Loại hợp đồng" value={offer.contractTypeName ?? "—"} />
                            <Field label="Thử việc" value={`${offer.probationMonths ?? 0} tháng`} />
                            <Field label="Ngày bắt đầu" value={fmtDate(offer.startDate)} />
                            <Field label="Hạn phản hồi" value={fmtDateTime(offer.responseDeadline)} />
                        </FieldGrid>

                        {offer.benefits && <NoteBlock label="Phúc lợi" value={offer.benefits} />}
                        {offer.candidateVisibleNote && (
                            <NoteBlock label="Ghi chú hiển thị cho ứng viên" value={offer.candidateVisibleNote} />
                        )}
                    </Card>
                </div>

                <div>
                    <Card size="small" title="Thông tin phê duyệt" style={{ marginBottom: 16, borderRadius: 12 }}>
                        <FieldGrid columns={1}>
                            <Field label="Người tạo" value={offer.requesterName ?? "—"} />
                            <Field label="Ngày tạo" value={fmtDateTime(offer.createdAt)} />
                            <Field label="Người duyệt" value={offer.approverName ?? "Chưa phân công"} />
                            <Field label="Ngày gửi duyệt" value={fmtDateTime(offer.submittedAt)} />
                            <Field label="Ngày duyệt" value={fmtDateTime(offer.approvedAt)} />
                        </FieldGrid>
                    </Card>

                    {/* Ghi chu noi bo: chi HR va admin doc duoc, khong hien voi quan ly phong ban. */}
                    {isHr && offer.note && (
                        <Card size="small" title="Ghi chú nội bộ" style={{ borderRadius: 12 }}>
                            <div style={{
                                background: "#F9FAFB", borderRadius: 8, padding: "12px 14px",
                                fontSize: 14, color: "#374151", whiteSpace: "pre-wrap",
                            }}>
                                {offer.note}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            </div>

            <OfferRejectModal
                open={rejectOpen}
                offerId={offer.id}
                onClose={() => setRejectOpen(false)}
                onSuccess={() => { setRejectOpen(false); load(); }}
            />
        </div>
    );
}

function FieldGrid({ columns, children }: { columns: number; children: React.ReactNode }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: "14px 24px",
        }}>
            {children}
        </div>
    );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
        </div>
    );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>{label}</div>
            <div style={{
                background: "#F9FAFB", borderRadius: 8, padding: "12px 14px",
                fontSize: 14, color: "#374151", whiteSpace: "pre-wrap",
            }}>
                {value}
            </div>
        </div>
    );
}
