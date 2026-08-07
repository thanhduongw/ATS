import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, message } from "antd";
import type { AxiosError } from "axios";
import { offerRejectSchema, type OfferRejectFormValues } from "../schemas/offerRejectSchema";
import { rejectOffer } from "../offerApi";
import type { ApiMessageResponse } from "../types";

interface Props {
  open: boolean;
  offerId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OfferRejectModal({ open, offerId, onClose, onSuccess }: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfferRejectFormValues>({ resolver: zodResolver(offerRejectSchema) });

  useEffect(() => {
    if (!open) return;
    reset({ reason: "" });
  }, [open, reset]);

  const onSubmit = async (data: OfferRejectFormValues) => {
    if (!offerId) return;
    try {
      await rejectOffer(offerId, data);
      message.success("Đã từ chối phê duyệt Offer");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Từ chối thất bại");
    }
  };

  return (
    <Modal
      title="Từ chối phê duyệt Offer"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Từ chối duyệt"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item
          label="Lý do từ chối phê duyệt"
          validateStatus={errors.reason ? "error" : ""}
          help={errors.reason?.message}
        >
          <Controller
            name="reason"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={3} placeholder="Mức lương đề xuất chưa phù hợp ngân sách..." />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
