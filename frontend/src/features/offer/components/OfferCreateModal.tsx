import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, InputNumber, Select, Input, DatePicker, message } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { offerCreateSchema, type OfferCreateFormValues } from "../schemas/offerCreateSchema";
import { createOffer, updateOffer } from "../offerApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getUsers } from "../../auth/authApi";
import type { CatalogItem } from "../../masterdata/types";
import type { UserSummaryResponse } from "../../auth/types";
import type { ApiMessageResponse, OfferResponse } from "../types";

interface Props {
  open: boolean;
  applicationId: number | null;
  initialData?: OfferResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OfferCreateModal({ open, applicationId, initialData, onClose, onSuccess }: Props) {
  const [contractTypes, setContractTypes] = useState<CatalogItem[]>([]);
  const [approvers, setApprovers] = useState<UserSummaryResponse[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfferCreateFormValues>({ resolver: zodResolver(offerCreateSchema) });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      getCatalogItems("/masterdata/contract-types"),
      getUsers("HIRING_MANAGER"),
      getUsers("COMPANY_ADMIN"),
    ]).then(([ctRes, hmRes, adminRes]) => {
      setContractTypes(ctRes.data.filter((c) => c.active));
      const combinedApprovers = [...hmRes.data, ...adminRes.data];
      const uniqueApprovers = Array.from(new Map(combinedApprovers.map((u) => [u.id, u])).values());
      setApprovers(uniqueApprovers);
    });

    if (initialData) {
      reset({
        salaryOffered: initialData.salaryOffered,
        contractTypeId: initialData.contractTypeId,
        startDate: initialData.startDate,
        probationMonths: initialData.probationMonths,
        benefits: initialData.benefits ?? "",
        allowance: initialData.allowance ?? 0,
        note: initialData.note ?? "",
        approverId: initialData.approverId,
      });
    } else {
      reset({
        salaryOffered: 15000000,
        contractTypeId: undefined,
        startDate: "",
        probationMonths: 2,
        benefits: "",
        allowance: 0,
        note: "",
        approverId: undefined,
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: OfferCreateFormValues) => {
    try {
      if (initialData) {
        await updateOffer(initialData.id, data);
        message.success("Cập nhật Offer thành công");
      } else {
        if (!applicationId) return;
        await createOffer({ ...data, applicationId });
        message.success("Tạo Offer thành công (Bản nháp)");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Thao tác thất bại");
    }
  };

  return (
    <Modal
      title={initialData ? "Chỉnh sửa Offer" : "Tạo Offer mới"}
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText={initialData ? "Cập nhật" : "Tạo bản nháp"}
      cancelText="Hủy"
      width={600}
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item
          label="Mức lương đề nghị (VND)"
          validateStatus={errors.salaryOffered ? "error" : ""}
          help={errors.salaryOffered?.message}
        >
          <Controller
            name="salaryOffered"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                style={{ width: "100%" }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(val) => Number(val?.replace(/\,/g, "") ?? 0)}
                step={1000000}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Loại hợp đồng"
          validateStatus={errors.contractTypeId ? "error" : ""}
          help={errors.contractTypeId?.message}
        >
          <Controller
            name="contractTypeId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Chọn loại hợp đồng"
                options={contractTypes.map((c) => ({ value: c.id, label: c.name }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Ngày bắt đầu làm việc"
          validateStatus={errors.startDate ? "error" : ""}
          help={errors.startDate?.message}
        >
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) => field.onChange(date ? date.format("YYYY-MM-DD") : "")}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Số tháng thử việc"
          validateStatus={errors.probationMonths ? "error" : ""}
          help={errors.probationMonths?.message}
        >
          <Controller
            name="probationMonths"
            control={control}
            render={({ field }) => <InputNumber {...field} style={{ width: "100%" }} min={0} max={12} />}
          />
        </Form.Item>

        <Form.Item label="Phụ cấp (VND)">
          <Controller
            name="allowance"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                value={field.value ?? 0}
                style={{ width: "100%" }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(val) => Number(val?.replace(/\,/g, "") ?? 0)}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Phúc lợi bổ sung">
          <Controller
            name="benefits"
            control={control}
            render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={2} placeholder="BHXH, Thưởng quý..." />}
          />
        </Form.Item>

        <Form.Item
          label="Người phê duyệt (Hiring Manager / Admin)"
          validateStatus={errors.approverId ? "error" : ""}
          help={errors.approverId?.message}
        >
          <Controller
            name="approverId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Chọn người duyệt Offer"
                options={approvers.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Ghi chú">
          <Controller
            name="note"
            control={control}
            render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={2} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
