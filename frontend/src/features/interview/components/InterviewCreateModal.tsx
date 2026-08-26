import { useEffect, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, DatePicker, InputNumber, Select, Input, Row, Col, message } from "antd";
import {
  CalendarOutlined, ClockCircleOutlined, VideoCameraOutlined, LinkOutlined,
  EnvironmentOutlined, TeamOutlined, FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { interviewCreateSchema, type InterviewCreateFormValues } from "../schemas/interviewCreateSchema";
import { createInterview } from "../interviewApi";
import { getUsers } from "../../auth/authApi";
import type { UserSummaryResponse } from "../../auth/types";
import type { ApiMessageResponse } from "../types";
import { COLORS } from "../../../app/theme";

interface Props {
  open: boolean;
  applicationId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

function FieldLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{icon}</span>
      {text}
    </span>
  );
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
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: "50%", background: COLORS.primaryLight + "1A",
            display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.primaryLight, fontSize: 15,
          }}>
            <CalendarOutlined />
          </span>
          Lên lịch phỏng vấn
        </span>
      }
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Lên lịch"
      cancelText="Hủy"
      width={580}
      destroyOnHidden
    >
      <Form layout="vertical" style={{ marginTop: 20 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              label={<FieldLabel icon={<CalendarOutlined />} text="Thời gian phỏng vấn" />}
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
                    placeholder="Chọn thời điểm"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => field.onChange(date ? date.toISOString() : "")}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={<FieldLabel icon={<ClockCircleOutlined />} text="Thời lượng" />}
              validateStatus={errors.durationMinutes ? "error" : ""}
              help={errors.durationMinutes?.message}
            >
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} style={{ width: "100%" }} min={15} step={15} addonAfter="phút" />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label={<FieldLabel icon={<VideoCameraOutlined />} text="Hình thức" />} validateStatus={errors.format ? "error" : ""} help={errors.format?.message}>
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
          </Col>
          <Col span={16}>
            {format === "ONLINE" ? (
              <Form.Item
                label={<FieldLabel icon={<LinkOutlined />} text="Link họp" />}
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
              <Form.Item label={<FieldLabel icon={<EnvironmentOutlined />} text="Địa điểm" />} validateStatus={errors.location ? "error" : ""} help={errors.location?.message}>
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => <Input {...field} value={field.value ?? ""} placeholder="Địa chỉ văn phòng / phòng họp..." />}
                />
              </Form.Item>
            )}
          </Col>
        </Row>

        <Form.Item
          label={<FieldLabel icon={<TeamOutlined />} text="Người phỏng vấn" />}
          validateStatus={errors.interviewerIds ? "error" : ""}
          help={errors.interviewerIds?.message}
        >
          <Controller
            name="interviewerIds"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                mode="multiple"
                placeholder="Chọn người phỏng vấn..."
                options={interviewers.map((u) => ({ value: u.id, label: u.fullName }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label={<FieldLabel icon={<FileTextOutlined />} text="Ghi chú" />}>
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} value={field.value ?? ""} rows={3} placeholder="Ghi chú thêm cho buổi phỏng vấn (không bắt buộc)..." />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
