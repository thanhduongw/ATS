import { useEffect, useState } from "react";
import { Card, Select, Button, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import ApplicationKanbanBoard from "../components/ApplicationKanbanBoard";
import ApplicationCreateModal from "../components/ApplicationCreateModal";

export default function ApplicationsPage() {
  const [postings, setPostings] = useState<JobPostingResponse[]>([]);
  const [selectedPostingId, setSelectedPostingId] = useState<number | undefined>(undefined);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getPostings().then((res) => setPostings(res.data));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 16 }}>
          <Select
            style={{ width: 360 }}
            placeholder="Chọn tin tuyển dụng để xem bảng ứng tuyển"
            value={selectedPostingId}
            onChange={setSelectedPostingId}
            options={postings.map((p) => ({ value: p.id, label: p.title }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!selectedPostingId}
            onClick={() => setApplyModalOpen(true)}
          >
            Thêm ứng viên vào tin
          </Button>
        </div>

        {selectedPostingId ? (
          <ApplicationKanbanBoard key={`${selectedPostingId}-${refreshKey}`} jobPostingId={selectedPostingId} />
        ) : (
          <Empty description="Chọn 1 tin tuyển dụng để xem bảng Kanban ứng tuyển" />
        )}
      </Card>

      <ApplicationCreateModal
        open={applyModalOpen}
        presetJobPostingId={selectedPostingId}
        onClose={() => setApplyModalOpen(false)}
        onSuccess={() => {
          setApplyModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
