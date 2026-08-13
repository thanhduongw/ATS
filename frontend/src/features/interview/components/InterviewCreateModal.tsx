import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, DatePicker, InputNumber, Select, Input, message } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { interviewCreateSchema, type InterviewCreateFormValues } from "../schemas/interviewCreateSchema";
import { createInterview } from "../interviewApi";
import { getUsers } from "../../auth/authApi";
import type { UserSummaryResponse } from "../../auth/types";
import type { ApiMessageResponse } from "../types";

interface Props {
  open: boolean;
  applicationId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InterviewCreateModal({ open, applicationId, onClose, onSuccess }: Props) {
  const [interviewers, setInterviewers] = useState<UserSummaryResponse[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InterviewCreateFormValues>({ resolver: zodResolver(interviewCreateSchema) });

  const format = watch("format");

  useEffect(() => {
    if (!open) return;
    getUsers("HIRING_MANAGER").then((res) => setInterviewers(res.data));
    reset({
      scheduledAt: "",
      durationMinutes: 60,
      format: "ONLINE",
      location: "",
      meetingLink: "",
      note: "",
      interviewerIds: [],
    });
  }, [open, reset]);

  const onSubmit = async (data: InterviewCreateFormValues) => {
    if (!applicationId) return;
    try {
      await createInterview({ ...data, applicationId });
      message.success("Lên lịch phỏng vấn thành công");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Lên lịch thất bại");
    }
  };

  return (
    <Modal
      title="Lên lịch phỏng vấn"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Lên lịch"
      cancelText="Hủy"
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item
          label="Thời gian phỏng vấn"
          validateStatus={errors.scheduledAt ? "error" : ""}
          help={errors.scheduledAt?.message}
        >
          <Controller
            name="scheduledAt"
            control={control}
            render={({ field }) => (
              <DatePicker
                showTime
                style={{ width: "100%" }}
                format="DD/MM/YYYY HH:mm"
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) => field.onChange(date ? date.toISOString() : "")}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Thời lượng (phút)"
          validateStatus={errors.durationMinutes ? "error" : ""}
          help={errors.durationMinutes?.message}
        >
          <Controller
            name="durationMinutes"
            control={control}
            render={({ field }) => <InputNumber {...field} style={{ width: "100%" }} min={15} step={15} />}
          />
        </Form.Item>

        <Form.Item label="Hình thức" validateStatus={errors.format ? "error" : ""} help={errors.format?.message}>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={[
                  { value: "ONLINE", label: "Online" },
                  { value: "OFFLINE", label: "Offline" },
                ]}
              />
            )}
          />
        </Form.Item>

        {format === "ONLINE" ? (
          <Form.Item
            label="Link họp"
            validateStatus={errors.meetingLink ? "error" : ""}
            help={errors.meetingLink?.message}
          >
            <Controller
              name="meetingLink"
              control={control}
              render={({ field }) => (
                <Input {...field} value={field.value ?? ""} placeholder="https://meet.google.com/..." />
              )}
            />
          </Form.Item>
        ) : (
          <Form.Item label="Địa điểm" validateStatus={errors.location ? "error" : ""} help={errors.location?.message}>
            <Controller
              name="location"
              control={control}
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </Form.Item>
        )}

        <Form.Item
          label="Người phỏng vấn"
          validateStatus={errors.interviewerIds ? "error" : ""}
          help={errors.interviewerIds?.message}
        >
          <Controller
            name="interviewerIds"
            control={control}
            render={({ field }) => (
              <Select {...field} mode="multiple" options={interviewers.map((u) => ({ value: u.id, label: u.fullName }))} />
            )}
          />
        </Form.Item>

        <Form.Item label="Ghi chú (không bắt buộc)">
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
