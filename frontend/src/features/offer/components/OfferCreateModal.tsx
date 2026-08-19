import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  DatePicker,
  message,
  Alert,
} from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { useSearchParams } from "react-router-dom";
import {
  offerCreateSchema,
  type OfferCreateFormValues,
} from "../schemas/offerCreateSchema";
import { createOffer } from "../offerApi";
import { getUsers } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getApplications } from "../../candidate/applicationApi";
import type { ApiMessageResponse } from "../types";
import type { UserSummaryResponse } from "../../auth/types";
import type { CatalogItem } from "../../masterdata/types";
import type { ApplicationResponse } from "../../candidate/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Prefill application khi mở từ Kanban / chi tiết hồ sơ */
  defaultApplicationId?: number | null;
}

export default function OfferCreateModal({
  open,
  onClose,
  onSuccess,
  defaultApplicationId,
}: Props) {
  const [searchParams] = useSearchParams();
  const prefillSalary = searchParams.get("salary");
  const prefillAppId = searchParams.get("applicationId");

  const [approvers, setApprovers] = useState<UserSummaryResponse[]>([]);
  const [contractTypes, setContractTypes] = useState<CatalogItem[]>([]);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfferCreateFormValues>({
    resolver: zodResolver(offerCreateSchema),
  });

  useEffect(() => {
    if (!open) return;

    Promise.all([
      getCatalogItems("/masterdata/contract-types"),
      getUsers("HIRING_MANAGER"),
      getUsers("COMPANY_ADMIN"),
    ]).then(([ctRes, hmRes, adminRes]) => {
      setContractTypes(ctRes.data.filter((c) => c.active !== false));
      const combined = [...hmRes.data, ...adminRes.data];
      setApprovers(Array.from(new Map(combined.map((u) => [u.id, u])).values()));
    });

    getApplications()
      .then((r) =>
        setApplications(r.data.content.filter((a) => a.currentStageType === "OFFER"))
      )
      .catch(() => setApplications([]));

    const salaryNum = prefillSalary ? Number(prefillSalary) : undefined;
    const appId =
      defaultApplicationId ??
      (prefillAppId ? Number(prefillAppId) : undefined);

    reset({
      applicationId: appId as number, // zod sẽ báo nếu undefined khi submit
      salaryOffered: salaryNum && !Number.isNaN(salaryNum) ? salaryNum : 15000000,
      contractTypeId: undefined as unknown as number,
      startDate: "",
      probationMonths: 2,
      benefits: "",
      allowance: 0,
      note: "",
      approverId: undefined as unknown as number,
      responseDeadline: null,
    });
  }, [open, prefillSalary, prefillAppId, defaultApplicationId, reset]);

  const onSubmit = async (data: OfferCreateFormValues) => {
    try {
      await createOffer({
        applicationId: data.applicationId,
        salaryOffered: data.salaryOffered,
        contractTypeId: data.contractTypeId,
        startDate: data.startDate,
        probationMonths: data.probationMonths,
        benefits: data.benefits || null,
        allowance: data.allowance ?? null,
        note: data.note || null,
        approverId: data.approverId,
        responseDeadline: data.responseDeadline || null,
      });
      message.success("Tạo Offer thành công (bản nháp)");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Tạo Offer thất bại");
    }
  };

  return (
    <Modal
      title="Tạo Offer"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Tạo bản nháp"
      cancelText="Hủy"
      width={640}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Chỉ tạo Offer khi hồ sơ đã ở giai đoạn Offer. Sau khi tạo, gửi duyệt cho Phòng ban."
      />

      <Form layout="vertical">
        <Form.Item
          label="Hồ sơ ứng tuyển (stage Offer)"
          validateStatus={errors.applicationId ? "error" : ""}
          help={errors.applicationId?.message}
        >
          <Controller
            name="applicationId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                showSearch
                optionFilterProp="label"
                placeholder="Chọn application"
                options={applications.map((a) => ({
                  value: a.id,
                  label: `#${a.id} — ${a.candidateName}`,
                }))}
              />
            )}
          />
        </Form.Item>

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
                value={field.value}
                onChange={(v) => field.onChange(v ?? undefined)}
                style={{ width: "100%" }}
                min={0}
                step={1000000}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => Number(v?.replace(/,/g, "") || 0)}
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
                value={field.value}
                onChange={field.onChange}
                options={contractTypes.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Ngày bắt đầu"
          validateStatus={errors.startDate ? "error" : ""}
          help={errors.startDate?.message}
        >
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                style={{ width: "100%" }}
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Thử việc (tháng)"
          validateStatus={errors.probationMonths ? "error" : ""}
          help={errors.probationMonths?.message}
        >
          <Controller
            name="probationMonths"
            control={control}
            render={({ field }) => (
              <InputNumber
                value={field.value}
                onChange={(v) => field.onChange(v ?? 0)}
                min={0}
                max={12}
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Phụ cấp">
          <Controller
            name="allowance"
            control={control}
            render={({ field }) => (
              <InputNumber
                value={field.value ?? undefined}
                onChange={(v) => field.onChange(v)}
                min={0}
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Phúc lợi">
          <Controller
            name="benefits"
            control={control}
            render={({ field }) => (
              <Input.TextArea
                value={field.value ?? ""}
                onChange={field.onChange}
                rows={2}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Người duyệt (Phòng ban)"
          validateStatus={errors.approverId ? "error" : ""}
          help={errors.approverId?.message}
        >
          <Controller
            name="approverId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={approvers.map((u) => ({
                  value: u.id,
                  label: u.fullName,
                }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Hạn phản hồi">
          <Controller
            name="responseDeadline"
            control={control}
            render={({ field }) => (
              <DatePicker
                showTime
                style={{ width: "100%" }}
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.toISOString() : null)}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Ghi chú">
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <Input.TextArea
                value={field.value ?? ""}
                onChange={field.onChange}
                rows={2}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}