import { Card, Tabs } from "antd";
import { SolutionOutlined, FileSearchOutlined } from "@ant-design/icons";
import RequisitionListPanel from "../components/RequisitionListPanel";
import PostingListPanel from "../components/PostingListPanel";
import { GRADIENTS } from "../../../app/theme";

export default function RecruitmentPage() {
    return (
        <div className="page-shell animate-fade-in">
            {/* ── Page Header ──────────────────── */}
            <div className="page-header page-shell-fixed" style={{ marginBottom: 16 }}>
                <div className="page-header-title">
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: GRADIENTS.primary,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 20,
                    }}>
                        <SolutionOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Tuyển dụng</h2>
                        <div className="page-header-subtitle">Quản lý yêu cầu tuyển dụng và tin đăng tuyển</div>
                    </div>
                </div>
            </div>

            <Card style={{ border: "none", flex: 1, minHeight: 0 }} className="table-card-fill" styles={{ body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } }}>
                <Tabs
                    size="large"
                    className="tabs-fill"
                    items={[
                        {
                            key: "requisitions",
                            label: (
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <SolutionOutlined />Yêu cầu tuyển dụng
                                </span>
                            ),
                            children: <RequisitionListPanel />,
                        },
                        {
                            key: "postings",
                            label: (
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <FileSearchOutlined />Tin tuyển dụng
                                </span>
                            ),
                            children: <PostingListPanel />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
