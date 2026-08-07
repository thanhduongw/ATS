import { useEffect, useState } from "react";
import { Drawer, Descriptions, Timeline, Typography, Spin, Tag } from "antd";
import { getApplicationHistory } from "../candidateApi";
import type { ApplicationHistoryResponse, ApplicationResponse } from "../types";

const { Title } = Typography;

interface Props {
  open: boolean;
  application: ApplicationResponse | null;
  onClose: () => void;
}

export default function ApplicationDetailDrawer({ open, application, onClose }: Props) {
  const [history, setHistory] = useState<ApplicationHistoryResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !application) return;
    setLoading(true);
    getApplicationHistory(application.id)
      .then((res) => setHistory(res.data))
      .finally(() => setLoading(false));
  }, [open, application]);

  if (!application) return null;

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

      <Title level={5} style={{ marginTop: 24 }}>
        Lịch sử xử lý
      </Title>
      {loading ? (
        <Spin />
      ) : (
        <Timeline
          items={history.map((h) => ({
            children: (
              <>
                <div>{h.fromStageName ? `${h.fromStageName} → ${h.toStageName}` : `Bắt đầu: ${h.toStageName}`}</div>
                {h.note && <div style={{ color: "#999", fontSize: 12 }}>{h.note}</div>}
                <div style={{ color: "#999", fontSize: 12 }}>
                  {h.changedByUserName} · {h.changedAt}
                </div>
              </>
            ),
          }))}
        />
      )}
    </Drawer>
  );
}
