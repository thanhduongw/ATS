import {
    CalendarOutlined, CarOutlined, CoffeeOutlined, DollarOutlined, GiftOutlined, HeartOutlined, HomeOutlined,
    LaptopOutlined, MedicineBoxOutlined, ReadOutlined, TeamOutlined, TrophyOutlined,
} from "@ant-design/icons";
import type { ComponentType } from "react";
import type { BenefitIconKey } from "../careersConfig";
import { COLORS } from "../../../app/theme";

const ICONS: Record<BenefitIconKey, ComponentType<{ style?: React.CSSProperties }>> = {
    money: DollarOutlined, health: MedicineBoxOutlined, home: HomeOutlined, book: ReadOutlined, food: CoffeeOutlined,
    calendar: CalendarOutlined, laptop: LaptopOutlined, team: TeamOutlined, trophy: TrophyOutlined, car: CarOutlined,
    gift: GiftOutlined, heart: HeartOutlined,
};

/** Biểu tượng phúc lợi trong ô bo góc nền thương hiệu (A10, C01). */
export default function BenefitIcon({ icon, size = 40, onDark = false }: { icon: BenefitIconKey; size?: number; onDark?: boolean }) {
    const Icon = ICONS[icon] ?? GiftOutlined;
    return (
        <span style={{
            width: size, height: size, borderRadius: 12, flexShrink: 0, display: "inline-flex", alignItems: "center",
            justifyContent: "center",
            // Trên dải xanh đậm (C01 · Phúc lợi): nền trắng mờ, icon trắng.
            background: onDark ? "rgba(255,255,255,0.12)" : COLORS.primarySoft, color: onDark ? "#fff" : COLORS.primary,
        }}>
            <Icon style={{ fontSize: Math.round(size * 0.45) }} />
        </span>
    );
}
