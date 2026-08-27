import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

export interface BreadcrumbContext {
    setBreadcrumbLabel: (label: string | null) => void;
}

/** Ghi đè đoạn cuối breadcrumb (ID trên URL) bằng tên thật, vd: tiêu đề tin tuyển dụng. */
export function useBreadcrumbLabel(label: string | null | undefined) {
    const ctx = useOutletContext<BreadcrumbContext>();

    useEffect(() => {
        ctx?.setBreadcrumbLabel(label ?? null);
        return () => ctx?.setBreadcrumbLabel(null);
    }, [label, ctx]);
}
