import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Drawer, Descriptions, Timeline, Typography, Spin, Tag, Button, Space, Input, App } from "antd";
import { CommentOutlined, SendOutlined, SwapOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getApplicationHistory, getApplicationComments, addApplicationComment } from "../candidateApi";
import type { ApplicationHistoryResponse, ApplicationCommentResponse, ApplicationResponse, ApiMessageResponse } from "../types";
import InterviewCreateModal from "../../interview/components/InterviewCreateModal";
import OfferCreateModal from "../../offer/components/OfferCreateModal";

const { Title } = Typography;

interface Props {
  open: boolean;
  application: ApplicationResponse | null;
  onClose: () => void;
}

interface ActivityItem {
  kind: "history" | "comment";
  timestamp: string;
  content: ReactNode;
}

export default function ApplicationDetailDrawer({ open, application, onClose }: Props) {
  const { message } = App.useApp();
  const [history, setHistory] = useState<ApplicationHistoryResponse[]>([]);
  const [comments, setComments] = useState<ApplicationCommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const loadActivity = useCallback(() => {
    if (!application) return;
    setLoading(true);
    Promise.all([
      getApplicationHistory(application.id),
      getApplicationComments(application.id),
    ])
      .then(([historyRes, commentsRes]) => {
        setHistory(historyRes.data);
        setComments(commentsRes.data);
      })
      .finally(() => setLoading(false));
  }, [application]);

  useEffect(() => {
    if (!open || !application) return;
    loadActivity();
  }, [open, application, loadActivity]);

  const handlePostComment = async () => {
    if (!application || !newComment.trim()) return;
    setPostingComment(true);
    try {
      await addApplicationComment(application.id, newComment.trim());
      setNewComment("");
      loadActivity();
    } catch (err) {
      const e = err as AxiosError<ApiMessageResponse>;
      message.error(e.response?.data?.message ?? "Không gửi được bình luận");
    } finally {
      setPostingComment(false);
    }
  };

  if (!application) return null;

  const activity: ActivityItem[] = [
    ...history.map((h) => ({
      kind: "history" as const,
      timestamp: h.changedAt,
      content: (
        <>
          <div>{h.fromStageName ? `${h.fromStageName} → ${h.toStageName}` : `Bắt đầu: ${h.toStageName}`}</div>
          {h.note && <div style={{ color: "#999", fontSize: 12 }}>{h.note}</div>}
          <div style={{ color: "#999", fontSize: 12 }}>
            {h.changedByUserName} · {new Date(h.changedAt).toLocaleString("vi-VN")}
          </div>
        </>
      ),
    })),
    ...comments.map((c) => ({
      kind: "comment" as const,
      timestamp: c.createdAt,
      content: (
        <>
          <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
          <div style={{ color: "#999", fontSize: 12 }}>
            {c.authorUserName} · {new Date(c.createdAt).toLocaleString("vi-VN")}
          </div>
        </>
      ),
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <Drawer title={application.candidateName} open={open} onClose={onClose} width={480}>
      <Tag color="blue" style={{ marginBottom: 16 }}>
        {application.currentStageName}
      </Tag>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Nguồn tuyển dụng">{application.recruitmentSourceName}</Descriptions.Item>
        <Descriptions.Item label="Người phụ trách">{application.assignedRecruiterName ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="CV">
          <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
            Xem CV
          </a>
        </Descriptions.Item>
        <Descriptions.Item label="Ghi chú">{application.note ?? "—"}</Descriptions.Item>
        {application.rejectionReasonName && (
          <Descriptions.Item label="Lý do từ chối">{application.rejectionReasonName}</Descriptions.Item>
        )}
        <Descriptions.Item label="Ngày ứng tuyển">{application.appliedAt}</Descriptions.Item>
      </Descriptions>

      <Space wrap style={{ marginTop: 16 }}>
        <Button type="primary" onClick={() => setInterviewModalOpen(true)}>
          Lên lịch phỏng vấn
        </Button>
        <Button type="primary" style={{ background: "#722ed1" }} onClick={() => setOfferModalOpen(true)}>
          Tạo Offer
        </Button>
      </Space>

      <Title level={5} style={{ marginTop: 24 }}>
        Hoạt động
      </Title>

      <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
        <Input.TextArea
          rows={2}
          placeholder="Viết bình luận... (dùng @Họ Tên để nhắc đồng nghiệp)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={postingComment}
          disabled={!newComment.trim()}
          onClick={handlePostComment}
        >
          Gửi
        </Button>
      </Space.Compact>

      {loading ? (
        <Spin />
      ) : (
        <Timeline
          items={activity.map((item) => ({
            dot: item.kind === "comment" ? <CommentOutlined /> : <SwapOutlined />,
            children: item.content,
          }))}
        />
      )}

      <InterviewCreateModal
        open={interviewModalOpen}
        applicationId={application.id}
        onClose={() => setInterviewModalOpen(false)}
        onSuccess={() => setInterviewModalOpen(false)}
      />

      <OfferCreateModal
        open={offerModalOpen}
        defaultApplicationId={application.id}
        onClose={() => setOfferModalOpen(false)}
        onSuccess={() => setOfferModalOpen(false)}
      />
    </Drawer>
  );
}
