import { useCallback, useEffect, useState } from "react";
import { Card, Table, Button, Tag, message } from "antd";
import { PlusOutlined, UploadOutlined, SendOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getCandidates } from "../candidateApi";
import type { ApiMessageResponse, CandidateResponse } from "../types";
import CandidateFormModal from "../components/CandidateFormModal";
import CvUploadModal from "../components/CvUploadModal";
import ApplicationCreateModal from "../components/ApplicationCreateModal";
import AiScoreBadge from "../../../components/AiScoreBadge";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CandidateResponse | null>(null);

  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [cvCandidateId, setCvCandidateId] = useState<number | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyCandidateId, setApplyCandidateId] = useState<number | undefined>(undefined);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCandidates();
      setCandidates(res.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const columns = [
    { title: "Họ tên", dataIndex: "fullName", key: "fullName" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Điện thoại", dataIndex: "phone", key: "phone" },
    { title: "Học vấn", dataIndex: "educationLevelName", key: "educationLevelName" },
    {
      title: "Kỹ năng",
      dataIndex: "skillNames",
      key: "skillNames",
      render: (names: string[]) => names.map((n) => <Tag key={n}>{n}</Tag>),
    },
    {
      title: "CV",
      dataIndex: "cvFileUrl",
      key: "cvFileUrl",
      render: (url: string | null) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            Xem CV
          </a>
        ) : (
          <Tag color="default">Chưa có</Tag>
        ),
    },
    { title: "AI Score", render: (_: any, r: any) => <AiScoreBadge score={r.aiScore} /> },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: CandidateResponse) => (
        <>
          <Button
            type="link"
            onClick={() => {
              setEditingItem(record);
              setFormModalOpen(true);
            }}
          >
            Sửa
          </Button>
          <Button
            type="link"
            icon={<UploadOutlined />}
            onClick={() => {
              setCvCandidateId(record.id);
              setCvModalOpen(true);
            }}
          >
            CV
          </Button>
          <Button
            type="link"
            icon={<SendOutlined />}
            onClick={() => {
              setApplyCandidateId(record.id);
              setApplyModalOpen(true);
            }}
          >
            Ứng tuyển
          </Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Ứng viên (Talent Pool)</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingItem(null);
              setFormModalOpen(true);
            }}
          >
            Thêm ứng viên
          </Button>
        </div>

        <Table rowKey="id" loading={loading} columns={columns} dataSource={candidates} pagination={{ pageSize: 10 }} />
      </Card>

      <CandidateFormModal
        open={formModalOpen}
        editingItem={editingItem}
        onClose={() => setFormModalOpen(false)}
        onSuccess={loadCandidates}
      />

      <CvUploadModal
        open={cvModalOpen}
        candidateId={cvCandidateId}
        onClose={() => setCvModalOpen(false)}
        onSuccess={loadCandidates}
      />

      <ApplicationCreateModal
        open={applyModalOpen}
        presetCandidateId={applyCandidateId}
        onClose={() => setApplyModalOpen(false)}
        onSuccess={loadCandidates}
      />
    </div>
  );
}
