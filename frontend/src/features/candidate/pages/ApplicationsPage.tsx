import { useEffect, useState } from "react";
import { Card, Select, Button, Empty, Tag } from "antd";
import { PlusOutlined, AppstoreOutlined } from "@ant-design/icons";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import ApplicationKanbanBoard from "../components/ApplicationKanbanBoard";
import ApplicationCreateModal from "../components/ApplicationCreateModal";
import { COLORS, GRADIENTS } from "../../../app/theme";

export default function ApplicationsPage() {
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [selectedPostingId, setSelectedPostingId] = useState<number | undefined>(undefined);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        getPostings().then((res) => setPostings(res.data));
    }, []);

    const selectedPosting = postings.find(p => p.id === selectedPostingId);

    return (
        <div className="page-container animate-fade-in">
            {/* ── Page Header ──────────────────── */}
            <div className="page-header">
                <div className="page-header-title">
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: GRADIENTS.stat1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 20,
                    }}>
                        <AppstoreOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Hồ sơ ứng tuyển</h2>
                        <div className="page-header-subtitle">Quản lý ứng viên theo từng tin tuyển dụng (Kanban)</div>
                    </div>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    disabled={!selectedPostingId}
                    onClick={() => setApplyModalOpen(true)}
                >
                    Thêm ứng viên vào tin
                </Button>
            </div>

            {/* ── Posting Selector ─────────────── */}
            <Card style={{ marginBottom: 16, border: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: COLORS.textSecondary }}>
                            Chọn tin tuyển dụng
                        </div>
                        <Select
                            style={{ width: "100%", maxWidth: 480 }}
                            placeholder="Chọn tin để xem Kanban..."
                            size="large"
                            value={selectedPostingId}
                            onChange={setSelectedPostingId}
                            showSearch
                            filterOption={(input, option) =>
                                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                            }
                            options={postings.map((p) => ({
                                value: p.id,
                                label: p.title,
                            }))}
                        />
                    </div>

                    {selectedPosting && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <Tag color={selectedPosting.status === "OPEN" ? "success" : selectedPosting.status === "PAUSED" ? "warning" : "default"} style={{ fontSize: 12 }}>
                                {selectedPosting.status === "OPEN" ? "Đang mở" : selectedPosting.status === "PAUSED" ? "Tạm dừng" : "Đã đóng"}
                            </Tag>
                        </div>
                    )}
                </div>
            </Card>

            {/* ── Kanban Board ─────────────────── */}
            <Card style={{ border: "none" }}>
                {selectedPostingId ? (
                    <ApplicationKanbanBoard
                        key={`${selectedPostingId}-${refreshKey}`}
                        jobPostingId={selectedPostingId}
                    />
                ) : (
                    <div style={{ padding: "60px 0" }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <span style={{ color: COLORS.textSecondary }}>
                                    Chọn 1 tin tuyển dụng ở trên để xem bảng Kanban
                                </span>
                            }
                        />
                    </div>
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
