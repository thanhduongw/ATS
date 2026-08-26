import { useState } from "react";
import {
  Drawer,
  Descriptions,
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

export default function OfferDetailDrawer({
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
    <Drawer
      title={`Offer — ${offer.candidateName}`}
      open={open}
      onClose={onClose}
      width={520}
    >
      <Tag color={STATUS_COLOR[offer.status]} style={{ marginBottom: 16 }}>
        {STATUS_LABEL[offer.status] ?? offer.status}
      </Tag>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Application ID">
          {offer.applicationId}
        </Descriptions.Item>
        <Descriptions.Item label="Mức lương">
          <Text strong style={{ color: "#16a34a" }}>
            {Number(offer.salaryOffered).toLocaleString("vi-VN")} đ
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Loại HĐ">
          {offer.contractTypeName}
        </Descriptions.Item>
        <Descriptions.Item label="Ngày bắt đầu">
          {offer.startDate ? dayjs(offer.startDate).format("DD/MM/YYYY") : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Thử việc">
          {offer.probationMonths} tháng
        </Descriptions.Item>
        <Descriptions.Item label="Phụ cấp">
          {offer.allowance != null
            ? `${Number(offer.allowance).toLocaleString("vi-VN")} đ`
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Phúc lợi">
          {offer.benefits ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Hạn phản hồi">
          {offer.responseDeadline
            ? dayjs(offer.responseDeadline).format("HH:mm DD/MM/YYYY")
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Người tạo">
          {offer.requesterName}
        </Descriptions.Item>
        <Descriptions.Item label="Người duyệt">
          {offer.approverName}
        </Descriptions.Item>
        <Descriptions.Item label="Ghi chú">
          {offer.note ?? "—"}
        </Descriptions.Item>
        {offer.rejectReason && (
          <Descriptions.Item label="Lý do từ chối duyệt">
            {offer.rejectReason}
          </Descriptions.Item>
        )}
        {offer.declineReasonName && (
          <Descriptions.Item label="Lý do ứng viên từ chối">
            {offer.declineReasonName}
            {offer.declineNote ? ` — ${offer.declineNote}` : ""}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Space style={{ marginTop: 24 }} wrap>
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
      </Space>

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
    </Drawer>
  );
}