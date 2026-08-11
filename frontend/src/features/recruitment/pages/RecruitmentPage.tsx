import { Card, Tabs } from "antd";
import PageHeader from "../../../components/ui/PageHeader";
import RequisitionListPanel from "../components/RequisitionListPanel";
import PostingListPanel from "../components/PostingListPanel";

export default function RecruitmentPage() {
    return (
        <div style={{ padding: 24 }}>
            <PageHeader
                title="Tuyển dụng"
                subtitle="Yêu cầu tuyển dụng từ phòng ban, HR duyệt và mở tin tuyển dụng"
            />
            <Card variant="borderless" style={{ boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }}>
                <Tabs
                    items={[
                        { key: "requisitions", label: "Yêu cầu tuyển dụng", children: <RequisitionListPanel /> },
                        { key: "postings", label: "Tin tuyển dụng", children: <PostingListPanel /> },
                    ]}
                />
            </Card>
        </div>
    );
}
