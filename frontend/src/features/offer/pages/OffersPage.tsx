import { Card, Typography } from "antd";
import OffersList from "../components/OffersList";

const { Title } = Typography;

export default function OffersPage() {
  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={4} style={{ marginBottom: 16 }}>
          Quản Lý Mức Lương & Đề Nghị Tuyển Dụng (Offer)
        </Title>
        <OffersList />
      </Card>
    </div>
  );
}
