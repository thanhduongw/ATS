import { useState } from "react";
import {
  Modal,
  Tag,
  Button,
  Space,
  message,
  Popconfirm,
  Alert,
} from "antd";
import {
  DownloadOutlined,
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { submitOffer, approveOffer, deleteOffer, getOfferPdf } from "../offerApi";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import OfferRejectModal from "./OfferRejectModal";
import { COLORS, RADIUS } from "../../../app/theme";
import { formatMoney } from "../../../app/money";
import { OFFER_STATUS, statusMeta } from "../../../app/statusLabels";
import {
  SectionHeader,
  SectionContainer,
  InfoField,
  TextBlock,
} from "../../../components/ui/sectionKit";

interface Props {
  open: boolean;
  offer: OfferResponse | null;
  onClose: () => void;
  onChanged: () => void;
}

const initialsOf = (name: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

export default function OfferDetailModal({
  open,
  offer,
  onClose,
  onChanged,
}: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role as UserRole | undefined;
  // AuthUser.userId là string (JWT sub) — convert sang number để so với requesterId/approverId
  const userId = user?.userId != null ? Number(user.userId) : undefined;

  const isHr = !!role && HR_ROLES.includes(role);
  const isDept = !!role && DEPARTMENT_ROLES.includes(role);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!offer) return null;

  const isOwner = userId != null && offer.requesterId === userId;
  const isApprover = userId != null && offer.approverId === userId;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitOffer(offer.id);
      message.success("Đã gửi duyệt Offer");
      onChanged();
      onClose();
    } catch (err) {
      const e = err as AxiosError<ApiMessageResponse>;
      message.error(e.response?.data?.message ?? "Gửi duyệt thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveOffer(offer.id);
      message.success("Đã phê duyệt Offer — ứng viên có thể Accept/Decline");
      onChanged();
      onClose();
    } catch (err) {
      const e = err as AxiosError<ApiMessageResponse>;
      message.error(e.response?.data?.message ?? "Phê duyệt thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await getOfferPdf(offer.id);
      saveAs(res.data, `offer-letter-${offer.id}.pdf`);
    } catch (err) {
      const e = err as AxiosError<ApiMessageResponse>;
      message.error(e.response?.data?.message ?? "Không tải được file PDF");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOffer(offer.id);
      message.success("Đã xóa Offer");
      onChanged();
      onClose();
    } catch (err) {
      const e = err as AxiosError<ApiMessageResponse>;
      message.error(e.response?.data?.message ?? "Xóa thất bại");
    }
  };

  const meta = statusMeta(OFFER_STATUS, offer.status);
  const canDelete = isHr && (offer.status === "DRAFT" || offer.status === "REJECTED");

  const textBlocks = [
    { label: "Phúc lợi", value: offer.benefits },
    { label: "Ghi chú", value: offer.note },
  ].filter((b) => b.value);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={760}
      destroyOnHidden
      centered
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: `${COLORS.primary}14`,
              color: COLORS.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initialsOf(offer.candidateName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
                {offer.candidateName}
              </span>
              <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              Thư mời nhận việc · {formatMoney(offer.salaryOffered)}
            </div>
          </div>
        </div>
      }
      styles={{
        body: { maxHeight: "68vh", overflowY: "auto", padding: 12, background: "#FAFBFC" },
        footer: { padding: 12, borderTop: `1px solid ${COLORS.borderLight}` },
      }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            {canDelete && (
              <Popconfirm
                title="Xóa Offer này?"
                description="Hành động này không thể hoàn tác."
                onConfirm={handleDelete}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button danger type="text">Xóa Offer</Button>
              </Popconfirm>
            )}
          </div>

          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadPdf}>
              Tải PDF
            </Button>

            {(isDept || isHr) && isApprover && offer.status === "PENDING_APPROVAL" && (
              <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectOpen(true)}>
                Từ chối duyệt
              </Button>
            )}

            {isHr && isOwner && offer.status === "DRAFT" && (
              <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSubmit}>
                Gửi duyệt
              </Button>
            )}

            {(isDept || isHr) && isApprover && offer.status === "PENDING_APPROVAL" && (
              <Button type="primary" icon={<CheckCircleOutlined />} loading={loading} onClick={handleApprove}>
                Phê duyệt
              </Button>
            )}

            <Button onClick={onClose}>Đóng</Button>
          </Space>
        </div>
      }
    >
      {offer.rejectReason && (
        <Alert
          type="error"
          showIcon
          title="Offer bị từ chối phê duyệt"
          description={offer.rejectReason}
          style={{ marginBottom: 12, borderRadius: RADIUS.md }}
        />
      )}
      {offer.declineReasonName && (
        <Alert
          type="warning"
          showIcon
          title="Ứng viên từ chối offer"
          description={offer.declineReasonName + (offer.declineNote ? ` — ${offer.declineNote}` : "")}
          style={{ marginBottom: 12, borderRadius: RADIUS.md }}
        />
      )}

      <SectionContainer>
        <SectionHeader
          icon={<DollarOutlined />}
          title="Điều khoản offer"
          subtitle="Mức lương, hợp đồng và thời gian bắt đầu"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <InfoField
            icon={<DollarOutlined />}
            label="Mức lương"
            value={
              <span style={{ color: COLORS.success }}>{formatMoney(offer.salaryOffered)}</span>
            }
          />
          <InfoField label="Phụ cấp" value={offer.allowance != null ? formatMoney(offer.allowance) : null} />
          <InfoField label="Loại hợp đồng" value={offer.contractTypeName} />
          <InfoField
            icon={<CalendarOutlined />}
            label="Ngày bắt đầu"
            value={offer.startDate ? dayjs(offer.startDate).format("DD/MM/YYYY") : null}
          />
          <InfoField label="Thử việc" value={`${offer.probationMonths} tháng`} />
          <InfoField
            label="Hạn phản hồi"
            value={offer.responseDeadline ? dayjs(offer.responseDeadline).format("HH:mm DD/MM/YYYY") : null}
          />
        </div>
      </SectionContainer>

      <SectionContainer>
        <SectionHeader
          icon={<UserOutlined />}
          title="Nhân sự liên quan"
          subtitle="Người tạo và người phụ trách phê duyệt offer"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <InfoField icon={<UserOutlined />} label="Người tạo" value={offer.requesterName} />
          <InfoField
            icon={<CheckCircleOutlined />}
            label="Người duyệt"
            value={offer.approverName || "Chưa được phân công"}
          />
        </div>
      </SectionContainer>

      {textBlocks.length > 0 && (
        <SectionContainer style={{ marginBottom: 4 }}>
          <SectionHeader icon={<FileTextOutlined />} title="Phúc lợi & ghi chú" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
            {textBlocks.map((b) => (
              <TextBlock key={b.label} label={b.label} value={b.value} />
            ))}
          </div>
        </SectionContainer>
      )}

      <OfferRejectModal
        open={rejectOpen}
        offerId={offer.id}
        onClose={() => setRejectOpen(false)}
        onSuccess={() => {
          setRejectOpen(false);
          onChanged();
          onClose();
        }}
      />
    </Modal>
  );
}
