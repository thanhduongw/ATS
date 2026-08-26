import { useState } from "react";
import {
  Modal,
  Tag,
  Button,
  Space,
  message,
  Popconfirm,
  Typography,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { submitOffer, approveOffer, deleteOffer, getOfferPdf } from "../offerApi";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import OfferRejectModal from "./OfferRejectModal";
import { COLORS } from "../../../app/theme";

const { Text } = Typography;

interface Props {
  open: boolean;
  offer: OfferResponse | null;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt (gửi ứng viên)",
  REJECTED: "Từ chối duyệt",
  ACCEPTED: "Ứng viên đã nhận",
  DECLINED: "Ứng viên từ chối",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING_APPROVAL: "warning",
  APPROVED: "processing",
  REJECTED: "error",
  ACCEPTED: "success",
  DECLINED: "magenta",
};

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>{value ?? "—"}</div>
    </div>
  );
}

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

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>{`Offer — ${offer.candidateName}`}</span>
          <Tag color={STATUS_COLOR[offer.status]} style={{ margin: 0 }}>
            {STATUS_LABEL[offer.status] ?? offer.status}
          </Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={700}
      destroyOnHidden
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      footer={
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadPdf}>
            Tải PDF
          </Button>

          {isHr && isOwner && offer.status === "DRAFT" && (
            <Button type="primary" loading={loading} onClick={handleSubmit}>
              Gửi duyệt
            </Button>
          )}

          {(isDept || isHr) && isApprover && offer.status === "PENDING_APPROVAL" && (
            <>
              <Button type="primary" loading={loading} onClick={handleApprove}>
                Phê duyệt
              </Button>
              <Button danger onClick={() => setRejectOpen(true)}>
                Từ chối duyệt
              </Button>
            </>
          )}

          {isHr && (offer.status === "DRAFT" || offer.status === "REJECTED") && (
            <Popconfirm
              title="Xóa Offer này?"
              onConfirm={handleDelete}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger>Xóa</Button>
            </Popconfirm>
          )}
          <Button onClick={onClose}>Đóng</Button>
        </Space>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          rowGap: 14,
          columnGap: 16,
          padding: "14px 16px",
          background: "#FAFBFC",
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <InfoField label="Application ID" value={offer.applicationId} />
        <InfoField
          label="Mức lương"
          value={<Text strong style={{ color: "#16a34a" }}>{Number(offer.salaryOffered).toLocaleString("vi-VN")} đ</Text>}
        />
        <InfoField label="Loại HĐ" value={offer.contractTypeName} />
        <InfoField label="Ngày bắt đầu" value={offer.startDate ? dayjs(offer.startDate).format("DD/MM/YYYY") : null} />
        <InfoField label="Thử việc" value={`${offer.probationMonths} tháng`} />
        <InfoField
          label="Phụ cấp"
          value={offer.allowance != null ? `${Number(offer.allowance).toLocaleString("vi-VN")} đ` : null}
        />
        <InfoField
          label="Hạn phản hồi"
          value={offer.responseDeadline ? dayjs(offer.responseDeadline).format("HH:mm DD/MM/YYYY") : null}
        />
        <InfoField label="Người tạo" value={offer.requesterName} />
        <InfoField label="Người duyệt" value={offer.approverName} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <InfoField label="Phúc lợi" value={offer.benefits} />
        <InfoField label="Ghi chú" value={offer.note} />
      </div>

      {offer.rejectReason && (
        <div style={{ marginTop: 12 }}>
          <InfoField label="Lý do từ chối duyệt" value={offer.rejectReason} />
        </div>
      )}
      {offer.declineReasonName && (
        <div style={{ marginTop: 12 }}>
          <InfoField
            label="Lý do ứng viên từ chối"
            value={offer.declineReasonName + (offer.declineNote ? ` — ${offer.declineNote}` : "")}
          />
        </div>
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
