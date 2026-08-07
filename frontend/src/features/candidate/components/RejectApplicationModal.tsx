import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Select, Input, message } from "antd";
import type { AxiosError } from "axios";
import { rejectApplicationSchema, type RejectApplicationFormValues } from "../schemas/rejectApplicationSchema";
import { rejectApplication } from "../candidateApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse } from "../types";

interface Props {
  open: boolean;
  applicationId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RejectApplicationModal({ open, applicationId, onClose, onSuccess }: Props) {
  const [reasons, setReasons] = useState<CatalogItem[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectApplicationFormValues>({ resolver: zodResolver(rejectApplicationSchema) });

  useEffect(() => {
    if (!open) return;
    reset({ rejectionReasonId: undefined, note: "" });
    getCatalogItems("/masterdata/rejection-reasons").then((res) => setReasons(res.data));
  }, [open, reset]);

  const onSubmit = async (data: RejectApplicationFormValues) => {
    if (!applicationId) return;
    try {
      await rejectApplication(applicationId, data);
      message.success("Đã từ chối hồ sơ");
      onSuccess();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Từ chối thất bại");
    }
  };

  return (
    <Modal
      title="Từ chối hồ sơ ứng tuyển"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Từ chối"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item
          label="Lý do từ chối"
          validateStatus={errors.rejectionReasonId ? "error" : ""}
          help={errors.rejectionReasonId?.message}
        >
          <Controller
            name="rejectionReasonId"
            control={control}
            render={({ field }) => (
              <Select {...field} options={reasons.map((r) => ({ value: r.id, label: r.name as string }))} />
            )}
          />
        </Form.Item>
        <Form.Item label="Ghi chú thêm (không bắt buộc)">
          <Controller
            name="note"
            control={control}
            render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
