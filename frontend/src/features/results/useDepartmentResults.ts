import { useEffect, useState } from "react";
import { getPostings, getRequisitions } from "../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../recruitment/types";
import { getApplications } from "../candidate/applicationApi";
import type { ApplicationResponse } from "../candidate/types";
import { getOffers } from "../offer/offerApi";
import type { OfferResponse } from "../offer/types";
import { getCatalogItems } from "../masterdata/masterdataApi";
import { useAppSelector } from "../../app/hooks";

/**
 * Dữ liệu cho H16/H17 · Kết quả tuyển dụng của Đại diện phòng ban:
 * việc làm của phòng mình + hồ sơ + thư mời (chỉ trạng thái — không dùng tới số tiền).
 */
export interface DepartmentResults {
    loading: boolean;
    departmentName: string | null;
    postings: JobPostingResponse[];
    appsByPosting: Map<number, ApplicationResponse[]>;
    /** applicationId → thư mời mới nhất. */
    offerByApp: Map<number, OfferResponse>;
}

export function useDepartmentResults(): DepartmentResults {
    const deptId = useAppSelector((s) => s.auth.user?.departmentId ?? null);
    const [state, setState] = useState<DepartmentResults>({
        loading: true, departmentName: null, postings: [], appsByPosting: new Map(), offerByApp: new Map(),
    });

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getPostings({ size: 1000 }),
            getRequisitions({ size: 1000 }),
            getApplications({ size: 5000 }),
            getOffers({ size: 2000 }).catch(() => null),
            getCatalogItems("/masterdata/departments").catch(() => null),
        ]).then(([p, r, a, o, d]) => {
            if (cancelled) return;
            const reqDept = new Map(r.data.content.map((x) => [x.id, x.departmentId]));
            const postings = p.data.content.filter((x) =>
                deptId == null || (x.departmentId ?? reqDept.get(x.requisitionId)) === deptId);
            const ids = new Set(postings.map((x) => x.id));
            const appsByPosting = new Map<number, ApplicationResponse[]>();
            a.data.content.filter((x) => ids.has(x.jobPostingId)).forEach((x) => {
                appsByPosting.set(x.jobPostingId, [...(appsByPosting.get(x.jobPostingId) ?? []), x]);
            });
            const offerByApp = new Map<number, OfferResponse>();
            o?.data.content.forEach((x) => {
                const cur = offerByApp.get(x.applicationId);
                if (!cur || x.id > cur.id) offerByApp.set(x.applicationId, x);
            });
            setState({
                loading: false,
                departmentName: d ? String(d.data.find((x) => x.id === deptId)?.name ?? "") || null : null,
                postings, appsByPosting, offerByApp,
            });
        }).catch(() => { if (!cancelled) setState((s) => ({ ...s, loading: false })); });
        return () => { cancelled = true; };
    }, [deptId]);

    return state;
}

/** Chữ trạng thái thư mời gọn cho bảng kết quả (không có số tiền). */
export function offerStatusText(o: OfferResponse | undefined): string | null {
    if (!o) return null;
    switch (o.status) {
        case "DRAFT":
        case "PENDING_APPROVAL": return "Đang soạn thư mời";
        case "APPROVED": return "Đã gửi thư mời";
        case "ACCEPTED": return "Đã nhận việc";
        case "DECLINED": return "Ứng viên từ chối";
        case "EXPIRED": return "Thư mời quá hạn";
        default: return null;
    }
}
