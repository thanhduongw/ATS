import { Card, Tabs } from "antd";
import RequisitionListPanel from "../components/RequisitionListPanel";
import PostingListPanel from "../components/PostingListPanel";

export default function RecruitmentPage() {
    return (
        <div style={{ padding: 24 }}>
            <Card>
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