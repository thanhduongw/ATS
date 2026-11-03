import { useEffect, useState } from "react";
import { Input } from "antd";
import { RightOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getCatalogItems } from "../masterdataApi";
import { getCustomFieldDefinitions } from "../../candidate/customFieldApi";
import { CATALOG_GROUPS, SPECIAL_CATALOGS, catalogConfigs } from "../catalogConfigs";
import type { CatalogGroup, CatalogItem } from "../types";
import { COLORS, RADIUS } from "../../../app/theme";
import { ScreenTitle } from "../../../components/ui/designKit";

/**
 * R41 · MÀN CHÍNH · Danh mục — tổng quan.
 * Chia nhóm: Tổ chức · Điều kiện làm việc · Hồ sơ ứng viên · Đánh giá & từ chối (+ Thông báo & tuỳ chỉnh).
 * Không có mục quy trình tuyển dụng (6 giai đoạn cố định).
 */
interface Tile {
    key: string;
    title: string;
    group: CatalogGroup;
    count: number | null;
    hint: string;
}

export default function MasterDataPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<Record<string, CatalogItem[]>>({});
    const [customFieldCount, setCustomFieldCount] = useState<number | null>(null);
    const [keyword, setKeyword] = useState("");

    useEffect(() => {
        catalogConfigs.forEach((c) => {
            getCatalogItems(c.endpoint)
                .then((r) => setItems((m) => ({ ...m, [c.key]: r.data })))
                .catch(() => undefined);
        });
        getCustomFieldDefinitions()
            .then((r) => setCustomFieldCount(r.data.filter((f) => f.active).length))
            .catch(() => undefined);
    }, []);

    const tiles: Tile[] = [
        ...catalogConfigs.map((c) => {
            const list = items[c.key];
            const active = list?.filter((x) => x.active);
            const sample = active?.slice(0, 6).map((x) => String(x[c.primaryField])).join(", ");
            return {
                key: c.key, title: c.title, group: c.group,
                count: active ? active.length : null,
                hint: c.hint ?? (sample || "Chưa có mục nào"),
            };
        }),
        {
            key: SPECIAL_CATALOGS.customFields, title: "Trường tuỳ chỉnh", group: "OTHER" as const,
            count: customFieldCount, hint: "Thông tin riêng của công ty trên hồ sơ ứng viên",
        },
    ];

    const k = keyword.trim().toLowerCase();
    const visible = tiles.filter((t) => !k || t.title.toLowerCase().includes(k) || t.hint.toLowerCase().includes(k));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <ScreenTitle title="Danh mục" />
            <Input
                allowClear
                prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                placeholder="Tìm danh mục"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 320 }}
            />
            {CATALOG_GROUPS.map((g) => {
                const groupTiles = visible.filter((t) => t.group === g.key);
                if (groupTiles.length === 0) return null;
                return (
                    <section key={g.key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>{g.label}</span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                            {groupTiles.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => navigate(`/masterdata/${t.key}`)}
                                    style={{
                                        all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                                        background: COLORS.cardBg, borderRadius: RADIUS.lg, padding: "16px 18px",
                                    }}
                                >
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                                        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                            <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>{t.title}</span>
                                            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                                {t.count == null ? "…" : `${t.count} mục`}
                                            </span>
                                        </span>
                                        <span style={{
                                            fontSize: 12, color: COLORS.textSecondary,
                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        }}>
                                            {t.hint}
                                        </span>
                                    </div>
                                    <RightOutlined style={{ color: COLORS.textMuted, fontSize: 12 }} />
                                </button>
                            ))}
                        </div>
                    </section>
                );
            })}
            {visible.length === 0 && <span style={{ color: COLORS.textSecondary }}>Không có danh mục nào khớp "{keyword}"</span>}
        </div>
    );
}
