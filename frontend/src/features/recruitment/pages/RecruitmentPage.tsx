import { Card } from "antd";
import { useLocation } from "react-router-dom";
import RequisitionListPanel from "../components/RequisitionListPanel";
import PostingListPanel from "../components/PostingListPanel";
import { listCardStyle, listCardBodyStyle } from "../../../components/ui/listStyles";

/**
 * Yeu cau va tin tuyen dung da tach thanh hai muc con tren navbar, nen trang nay khong
 * lap lai mot hang tab nua — navbar la cho duy nhat noi nguoi dung dang o dau.
 */
export default function RecruitmentPage() {
    const location = useLocation();
    const showPostings = location.pathname.startsWith("/recruitment/postings");

    // R02/H04 dùng khung ListPage riêng; danh sách việc làm (R06) chưa chuyển nên vẫn bọc thẻ cũ.
    if (!showPostings) return <RequisitionListPanel />;
    return (
        <div className="page-shell animate-fade-in">
            <Card style={listCardStyle} className="table-card-fill" styles={{ body: listCardBodyStyle }}>
                <PostingListPanel />
            </Card>
        </div>
    );
}
