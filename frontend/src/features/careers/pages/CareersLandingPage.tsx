import { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPublicCompany, getPublicJobs } from "../../public/publicApi";
import type { PublicCompanyResponse, PublicJobPosting } from "../../public/types";
import { getCareersPage, getPublicCareersPage } from "../careersApi";
import { defaultConfig, parseConfig, type CareersConfig } from "../careersConfig";
import CareersBlocks from "../components/CareersBlocks";
import { InlineNotice } from "../../../components/ui/designKit";
import { useAppSelector } from "../../../app/hooks";

/**
 * C01 · Trang tuyển dụng (công khai) — vẽ bản ĐÃ XUẤT BẢN của A09/A10. Chưa xuất bản lần nào thì dùng cấu hình
 * mặc định lấy từ Thông tin doanh nghiệp (A08). `?preview=draft` (chỉ Quản trị) xem bản nháp trước khi xuất bản.
 */
export default function CareersLandingPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const role = useAppSelector((s) => s.auth.user?.role);
    const preview = params.get("preview") === "draft" && role === "COMPANY_ADMIN";
    const [company, setCompany] = useState<PublicCompanyResponse | null>(null);
    const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
    const [config, setConfig] = useState<CareersConfig | null>(null);

    useEffect(() => {
        Promise.all([
            getPublicCompany().then((r) => r.data).catch(() => null),
            getPublicJobs().then((r) => r.data).catch(() => [] as PublicJobPosting[]),
            (preview ? getCareersPage() : getPublicCareersPage()).then((r) => r.data).catch(() => null),
        ]).then(([c, j, page]) => {
            setCompany(c);
            setJobs(j);
            setConfig(parseConfig(preview ? page?.draftConfig : page?.publishedConfig, defaultConfig(c)));
        });
    }, [preview]);

    if (!config) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {preview && (
                <InlineNotice tone="warning" action={<Button onClick={() => navigate("/admin/careers")}>Quay lại chỉnh sửa</Button>}>
                    Bản xem trước — các thay đổi chưa xuất bản, ứng viên chưa thấy.
                </InlineNotice>
            )}
            <CareersBlocks config={config} company={company} jobs={jobs} />
        </div>
    );
}
