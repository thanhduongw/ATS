import { useEffect, useState } from "react";
import { getPublicCompany } from "../features/public/publicApi";

/** Chiều cao header website (C01, C02, C20) — CandidateLayout dùng để dính thẻ menu ngay dưới. */
export const SITE_HEADER_HEIGHT = 76;

/** Tên + logo công ty cho header và chân trang (lấy từ API, không viết cứng). */
export function useCompanyBrand() {
    const [brand, setBrand] = useState<{ name: string | null; logoUrl: string | null }>({ name: null, logoUrl: null });
    useEffect(() => {
        getPublicCompany()
            .then((res) => setBrand({ name: res.data?.name ?? null, logoUrl: res.data?.logoUrl ?? null }))
            .catch(() => undefined);
    }, []);
    return brand;
}
