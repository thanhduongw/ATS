import { Card, Tabs } from "antd";
import { SolutionOutlined, FileSearchOutlined } from "@ant-design/icons";
import RequisitionListPanel from "../components/RequisitionListPanel";
import PostingListPanel from "../components/PostingListPanel";
import { listCardStyle, listCardBodyStyle } from "../../../components/ui/listStyles";

export default function RecruitmentPage() {
    return (
        <div className="page-shell animate-fade-in">
            <Card style={listCardStyle} className="table-card-fill" styles={{ body: listCardBodyStyle }}>
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
