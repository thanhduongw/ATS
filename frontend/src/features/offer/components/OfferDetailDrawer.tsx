import { useState } from "react";
import { Drawer, Descriptions, Tag, Button, Space, message, Popconfirm } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { submitOffer, approveOffer, acceptOffer, deleteOffer } from "../offerApi";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import OfferCreateModal from "./OfferCreateModal";
import OfferRejectModal from "./OfferRejectModal";
import OfferDeclineModal from "./OfferDeclineModal";

interface Props {
  open: boolean;
  offer: OfferResponse | null;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối duyệt",
  ACCEPTED: "Đã chấp nhận",
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

export default function OfferDetailDrawer({ open, offer, onClose, onChanged }: Props) {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);

  if (!offer) return null;

  const isRequester = String(offer.requesterId) === currentUser?.userId;
  const isApprover = String(offer.approverId) === currentUser?.userId;
  const canRecruiterAct = currentUser?.role === "RECRUITER" || currentUser?.role === "COMPANY_ADMIN";

  const handleSubmit = async () => {
    try {
      await submitOffer(offer.id);
      message.success("Đã gửi Offer để phê duyệt");
      onChanged();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Gửi duyệt thất bại");
    }
  };

  const handleApprove = async () => {
    try {
      await approveOffer(offer.id);
      message.success("Phê duyệt Offer thành công");
      onChanged();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Phê duyệt thất bại");
    }
  };

  const handleAccept = async () => {
    try {
      await acceptOffer(offer.id);
      message.success("Đã ghi nhận Ứng viên Chấp nhận Offer & Chuyển sang Nhận việc");
      onChanged();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Thao tác thất bại");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOffer(offer.id);
      message.success("Đã xóa Offer");
      onChanged();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Xóa thất bại");
    }
  };

  return (
    <Drawer title={`Offer: ${offer.candidateName}`} open={open} onClose={onClose} width={520}>
      <Tag color={STATUS_COLOR[offer.status]} style={{ marginBottom: 16 }}>
        {STATUS_LABEL[offer.status]}
      </Tag>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Ứng viên">{offer.candidateName}</Descriptions.Item>
        <Descriptions.Item label="Mức lương">{offer.salaryOffered.toLocaleString("vi-VN")} VND</Descriptions.Item>
        <Descriptions.Item label="Loại hợp đồng">{offer.contractTypeName}</Descriptions.Item>
        <Descriptions.Item label="Ngày bắt đầu">{dayjs(offer.startDate).format("DD/MM/YYYY")}</Descriptions.Item>
        <Descriptions.Item label="Thử việc">{offer.probationMonths} tháng</Descriptions.Item>
        <Descriptions.Item label="Phụ cấp">{offer.allowance ? `${offer.allowance.toLocaleString("vi-VN")} VND` : "0 VND"}</Descriptions.Item>
        <Descriptions.Item label="Phúc lợi">{offer.benefits ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Người tạo">{offer.requesterName}</Descriptions.Item>
        <Descriptions.Item label="Người duyệt">{offer.approverName}</Descriptions.Item>

        {offer.status === "REJECTED" && (
          <Descriptions.Item label="Lý do từ chối duyệt">
            <span style={{ color: "red" }}>{offer.rejectReason}</span>
          </Descriptions.Item>
        )}

        {offer.status === "DECLINED" && (
          <Descriptions.Item label="Ứng viên từ chối">
            <span style={{ color: "red" }}>{offer.declineReasonName} {offer.declineNote && `(${offer.declineNote})`}</span>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Ngày tạo">{dayjs(offer.createdAt).format("HH:mm DD/MM/YYYY")}</Descriptions.Item>
      </Descriptions>

      <Space wrap style={{ marginTop: 24 }}>
        {/* Nút Chỉnh sửa & Gửi duyệt dành cho Người tạo khi DRAFT */}
        {offer.status === "DRAFT" && isRequester && (
          <>
            <Button onClick={() => setEditModalOpen(true)}>Chỉnh sửa</Button>
            <Button type="primary" onClick={handleSubmit}>Gửi duyệt</Button>
          </>
        )}

        {/* Nút Phê duyệt & Từ chối duyệt dành cho Approver khi PENDING_APPROVAL */}
        {offer.status === "PENDING_APPROVAL" && (isApprover || currentUser?.role === "COMPANY_ADMIN") && (
          <>
            <Button type="primary" onClick={handleApprove}>Phê duyệt Offer</Button>
            <Button danger onClick={() => setRejectModalOpen(true)}>Từ chối duyệt</Button>
          </>
        )}

        {/* Nút Chấp nhận / Từ chối dành cho Recruiter khi APPROVED */}
        {offer.status === "APPROVED" && canRecruiterAct && (
          <>
            <Button type="primary" style={{ background: "#52c41a" }} onClick={handleAccept}>
              Ứng viên Chấp nhận
            </Button>
            <Button danger onClick={() => setDeclineModalOpen(true)}>
              Ứng viên Từ chối
            </Button>
          </>
        )}

        {/* Nút Xóa Offer nếu chưa ACCEPTED */}
        {offer.status !== "ACCEPTED" && canRecruiterAct && (
          <Popconfirm title="Xóa Offer này?" onConfirm={handleDelete} okText="Xóa" cancelText="Hủy">
            <Button danger type="text">Xóa Offer</Button>
          </Popconfirm>
        )}
      </Space>

      <OfferCreateModal
        open={editModalOpen}
        applicationId={offer.applicationId}
        initialData={offer}
        onClose={() => setEditModalOpen(false)}
        onSuccess={onChanged}
      />

      <OfferRejectModal
        open={rejectModalOpen}
        offerId={offer.id}
        onClose={() => setRejectModalOpen(false)}
        onSuccess={onChanged}
      />

      <OfferDeclineModal
        open={declineModalOpen}
        offerId={offer.id}
        onClose={() => setDeclineModalOpen(false)}
        onSuccess={onChanged}
      />
    </Drawer>
  );
}
