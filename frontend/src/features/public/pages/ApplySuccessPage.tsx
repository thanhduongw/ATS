import { Result, Button } from "antd";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { PublicApplyResponse } from "../types";

export default function ApplySuccessPage() {
    const navigate = useNavigate();
    const { tenantCode } = useParams<{ tenantCode: string }>();
    const location = useLocation();
    const data = location.state as PublicApplyResponse | null;

    return (
        <Result
            status="success"
            title="Nộp hồ sơ thành công!"
            subTitle={
                data
                    ? `${data.message} — Mã hồ sơ #${data.applicationId}`
                    : "Hồ sơ của bạn đã được ghi nhận."
            }
            extra={
                <Button type="primary" onClick={() => navigate(`/c/${tenantCode}`)}>
                    Xem thêm việc làm
                </Button>
            }
        />
    );
}