import { useState } from "react";
import { Drawer, Descriptions, Tag, Button, Space, List, message, Popconfirm } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { cancelInterview } from "../interviewApi";
import type { ApiMessageResponse, InterviewResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import EvaluationSummaryModal from "./EvaluationSummaryModal";

interface Props {
  open: boolean;
  interview: InterviewResponse | null;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Đã lên lịch",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "blue",
  COMPLETED: "green",
  CANCELLED: "default",
};

export default function InterviewDetailDrawer({ open, interview, onClose, onChanged }: Props) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [summaryOpen, setSummaryOpen] = useState(false);

  if (!interview) return null;

  const canManage = role === "RECRUITER" || role === "HIRING_MANAGER" || role === "COMPANY_ADMIN";

  const handleCancel = async () => {
    try {
      await cancelInterview(interview.id);
      message.success("Đã hủy lịch phỏng vấn");
      onChanged();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Hủy lịch thất bại");
    }
  };

  return (
    <Drawer title={interview.candidateName} open={open} onClose={onClose} width={480}>
      <Tag color={STATUS_COLOR[interview.status]} style={{ marginBottom: 16 }}>
        {STATUS_LABEL[interview.status]}
      </Tag>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Thời gian">{dayjs(interview.scheduledAt).format("HH:mm DD/MM/YYYY")}</Descriptions.Item>
        <Descriptions.Item label="Thời lượng">{interview.durationMinutes} phút</Descriptions.Item>
        <Descriptions.Item label="Hình thức">{interview.format === "ONLINE" ? "Online" : "Offline"}</Descriptions.Item>
        {interview.format === "ONLINE" ? (
          <Descriptions.Item label="Link họp">
            <a href={interview.meetingLink ?? "#"} target="_blank" rel="noopener noreferrer">
              {interview.meetingLink}
            </a>
          </Descriptions.Item>
        ) : (
          <Descriptions.Item label="Địa điểm">{interview.location}</Descriptions.Item>
        )}
        <Descriptions.Item label="Ghi chú">{interview.note ?? "—"}</Descriptions.Item>
      </Descriptions>

      <List
        style={{ marginTop: 16 }}
        header="Người phỏng vấn"
        bordered
        size="small"
        dataSource={interview.interviewers}
        renderItem={(item) => (
          <List.Item>
            {item.fullName}
            <Tag color={item.evaluationSubmitted ? "green" : "default"} style={{ marginLeft: 8 }}>
              {item.evaluationSubmitted ? "Đã đánh giá" : "Chưa đánh giá"}
            </Tag>
          </List.Item>
        )}
      />

      <Space style={{ marginTop: 24 }}>
        {canManage && <Button onClick={() => setSummaryOpen(true)}>Xem tổng hợp đánh giá</Button>}
        {canManage && interview.status === "SCHEDULED" && (
          <Popconfirm title="Hủy lịch phỏng vấn này?" onConfirm={handleCancel} okText="Hủy lịch" cancelText="Đóng">
            <Button danger>Hủy lịch</Button>
          </Popconfirm>
        )}
      </Space>

      <EvaluationSummaryModal open={summaryOpen} interviewId={interview.id} onClose={() => setSummaryOpen(false)} />
    </Drawer>
  );
}
