import { Card } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import OffersList from "../components/OffersList";
import { GRADIENTS } from "../../../app/theme";
export default function OffersPage() {
    return (
        <div className="page-container animate-fade-in">
            {/* ── Page Header ──────────────────── */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-title">
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: GRADIENTS.stat3,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 20,
                    }}>
                        <FileTextOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Quản lý Offer</h2>
                        <div className="page-header-subtitle">Tạo và duyệt thư đề nghị tuyển dụng cho ứng viên</div>
                    </div>
                </div>
            </div>

            <Card style={{ border: "none" }}>
                <OffersList />
            </Card>
        </div>
    );
}
