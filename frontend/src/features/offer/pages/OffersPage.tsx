import { Card } from "antd";
import OffersList from "../components/OffersList";
import { listCardStyle, listCardBodyStyle } from "../../../components/ui/listStyles";

export default function OffersPage() {
    return (
        <div className="page-shell animate-fade-in">
            <Card
                className="table-card-fill"
                style={listCardStyle}
                styles={{ body: listCardBodyStyle }}
            >
                <OffersList />
            </Card>
        </div>
    );
}
