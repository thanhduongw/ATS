import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyBrandVars, cacheBrand, cachedBrand, derivePalette, isHexColor, type BrandPalette } from "./brand";
import { publicClient } from "../features/public/publicApi";

interface BrandContextValue {
    palette: BrandPalette;
    /** Màu đã lưu của doanh nghiệp (null = mặc định của thiết kế). */
    saved: string | null;
    /** Xem trước trực tiếp khi Quản trị đang chọn màu; truyền null để bỏ xem trước. */
    preview: (hex: string | null) => void;
    /** Tải lại màu đã lưu từ máy chủ (gọi sau khi lưu thông tin doanh nghiệp). */
    reload: () => void;
}

const BrandContext = createContext<BrandContextValue>({
    palette: derivePalette(null), saved: null, preview: () => undefined, reload: () => undefined,
});

export const useBrand = () => useContext(BrandContext);

interface PublicTheme { brandColor?: string | null }

/** Lấy màu thương hiệu từ API công khai, ghi biến CSS lên :root và cấp bảng màu cho Ant Design. */
export function BrandProvider({ children }: { children: ReactNode }) {
    const [saved, setSaved] = useState<string | null>(() => cachedBrand());
    const [previewHex, setPreviewHex] = useState<string | null>(null);

    const reload = useCallback(() => {
        publicClient.get<PublicTheme>("/auth/public/theme")
            .then((r) => {
                const hex = isHexColor(r.data?.brandColor) ? r.data.brandColor : null;
                setSaved(hex);
                cacheBrand(hex);
            })
            .catch(() => { /* máy chủ chưa sẵn sàng: giữ màu đang có */ });
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const palette = useMemo(() => derivePalette(previewHex ?? saved), [previewHex, saved]);
    useEffect(() => { applyBrandVars(palette); }, [palette]);

    const value = useMemo(() => ({ palette, saved, preview: setPreviewHex, reload }), [palette, saved, reload]);
    return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}
