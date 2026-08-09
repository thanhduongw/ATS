import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Select, Input, message } from "antd";
import type { AxiosError } from "axios";
import { offerDeclineSchema, type OfferDeclineFormValues } from "../schemas/offerDeclineSchema";
import { declineOffer } from "../offerApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse } from "../types";

interface Props {
  open: boolean;
  offerId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OfferDeclineModal({ open, offerId, onClose, onSuccess }: Props) {
  const [rejectionReasons, setRejectionReasons] = useState<CatalogItem[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfferDeclineFormValues>({ resolver: zodResolver(offerDeclineSchema) });

  useEffect(() => {
    if (!open) return;
    getCatalogItems("/masterdata/rejection-reasons").then((res) => {
      setRejectionReasons(res.data.filter((r) => r.active));
    });
    reset({ declineReasonId: undefined, note: "" });
  }, [open, reset]);

  const onSubmit = async (data: OfferDeclineFormValues) => {
    if (!offerId) return;
    try {
      await declineOffer(offerId, data);
      message.success("Đã ghi nhận Ứng viên Từ chối Offer");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Ghi nhận thất bại");
    }
  };

  return (
    <Modal
      title="Ghi nhận Ứng viên từ chối Offer"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Xác nhận từ chối"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item
          label="Lý do ứng viên từ chối"
          validateStatus={errors.declineReasonId ? "error" : ""}
          help={errors.declineReasonId?.message}
        >
          <Controller
            name="declineReasonId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Chọn lý do"
                options={rejectionReasons.map((r) => ({ value: r.id, label: r.name }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Ghi chú chi tiết">
          <Controller
            name="note"
            control={control}
            render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} placeholder="Ứng viên nhận được offer tốt hơn từ cty khác..." />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
