import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

export default function ApplySuccessPage() {
    const navigate = useNavigate();
    return <Result status="success" title="Nộp hồ sơ thành công" extra={<Button type="primary" onClick={() => navigate("/careers")}>Xem việc làm khác</Button>} />;
}
