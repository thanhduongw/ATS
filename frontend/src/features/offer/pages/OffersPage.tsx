import { Card } from "antd";
import OffersList from "../components/OffersList";

export default function OffersPage() {
    return (
        <div className="page-shell animate-fade-in">
            <Card
                className="table-card-fill"
                style={{ border: "none", flex: 1, minHeight: 0 }}
                styles={{ body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } }}
            >
                <OffersList />
            </Card>
        </div>
    );
}