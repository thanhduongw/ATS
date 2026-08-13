import { Card } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import OffersList from "../components/OffersList";
import { GRADIENTS } from "../../../app/theme";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";

export default function OffersPage() {
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);
    const isDept = !!role && DEPARTMENT_ROLES.includes(role);

    const subtitle = isHr
        ? "Tạo, gửi duyệt và theo dõi thư đề nghị tuyển dụng"
        : isDept
            ? "Duyệt / từ chối Offer được HR gửi lên"
            : "Quản lý Offer";

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-title">
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: GRADIENTS.stat3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 20,
                        }}
                    >
                        <FileTextOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                            Quản lý Offer
                        </h2>
                        <div className="page-header-subtitle">{subtitle}</div>
                    </div>
                </div>
            </div>

            <Card style={{ border: "none" }}>
                <OffersList />
            </Card>
        </div>
    );
}