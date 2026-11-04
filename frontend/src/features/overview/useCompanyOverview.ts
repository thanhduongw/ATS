import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { getPostings, getRequisitions } from "../recruitment/recruitmentApi";
import type { JobPostingResponse, JobRequisitionResponse } from "../recruitment/types";
import { getApplications } from "../candidate/applicationApi";
import type { ApplicationResponse } from "../candidate/types";
import { getOffers } from "../offer/offerApi";
import type { OfferResponse } from "../offer/types";
import { getCatalogItems } from "../masterdata/masterdataApi";
import type { CatalogItem } from "../masterdata/types";
import { getUsers } from "../auth/authApi";
import type { UserSummaryResponse } from "../auth/types";
import { FIXED_STAGES, type FixedStage } from "../../app/theme";
import { toFixedStage } from "../../app/stages";

/**
 * Dữ liệu cho A01/A02 · Tổng quan của Quản trị doanh nghiệp.
 * Chỉ dùng để tính SỐ LIỆU TỔNG HỢP — giao diện không hiện tên hay hồ sơ ứng viên (A07, DS06).
 * Tính ở trình duyệt từ các API danh sách (dashboard-service chưa có số theo phòng ban / theo quý — Q4).
 */
export interface CompanyOverviewData {
    loading: boolean;
    failed: boolean;
    postings: JobPostingResponse[];
    requisitions: JobRequisitionResponse[];
    applications: ApplicationResponse[];
    offers: OfferResponse[];
    departments: CatalogItem[];
    users: UserSummaryResponse[];
}

export function useCompanyOverview(): CompanyOverviewData {
    const [state, setState] = useState<CompanyOverviewData>({
        loading: true, failed: false, postings: [], requisitions: [], applications: [], offers: [], departments: [], users: [],
    });

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getPostings({ size: 1000 }),
            getRequisitions({ size: 1000 }),
            getApplications({ size: 5000 }),
            getOffers({ size: 2000 }).catch(() => null),
            getCatalogItems("/masterdata/departments"),
            getUsers().catch(() => null),
        ]).then(([p, r, a, o, d, u]) => {
            if (cancelled) return;
            setState({
                loading: false, failed: false,
                postings: p.data.content,
                requisitions: r.data.content,
                applications: a.data.content,
                offers: o?.data.content ?? [],
                departments: d.data,
                users: (u?.data ?? []).filter((x) => x.role !== "CANDIDATE"),
            });
        }).catch(() => { if (!cancelled) setState((s) => ({ ...s, loading: false, failed: true })); });
        return () => { cancelled = true; };
    }, []);

    return state;
}

/* ── Kỳ thời gian (bộ chọn "Thời gian: Quý 4/2026") ───────────────── */

export interface Period { key: string; label: string; from: Dayjs | null; to: Dayjs | null }

const quarterOf = (d: Dayjs) => Math.floor(d.month() / 3);

function quarter(year: number, q: number): Period {
    const from = dayjs(new Date(year, q * 3, 1));
    return { key: `${year}-Q${q + 1}`, label: `Quý ${q + 1}/${year}`, from, to: from.add(3, "month") };
}

/** Quý hiện tại, 3 quý trước đó và "Tất cả". */
export function periodOptions(now: Dayjs = dayjs()): Period[] {
    const list: Period[] = [];
    let y = now.year(), q = quarterOf(now);
    for (let i = 0; i < 4; i++) {
        list.push(quarter(y, q));
        q -= 1;
        if (q < 0) { q = 3; y -= 1; }
    }
    list.push({ key: "ALL", label: "Tất cả", from: null, to: null });
    return list;
}

/** Kỳ liền trước (để so sánh); null nếu đang xem "Tất cả". */
export function previousPeriod(p: Period): Period | null {
    if (!p.from) return null;
    const prev = p.from.subtract(3, "month");
    return quarter(prev.year(), quarterOf(prev));
}

export const inPeriod = (value: string | null | undefined, p: Period) => {
    if (!value) return false;
    if (!p.from || !p.to) return true;
    const d = dayjs(value);
    return !d.isBefore(p.from) && d.isBefore(p.to);
};

/* ── Các phép tính dùng chung cho A01 và A02 ─────────────────────── */

export const MAIN_STAGES: FixedStage[] = FIXED_STAGES.filter((s) => s !== "REJECTED");
export const stageRank = (a: ApplicationResponse) => MAIN_STAGES.indexOf(toFixedStage(a.currentStageType));

/** Phòng ban của một việc làm (lấy từ việc làm, không có thì từ yêu cầu tuyển dụng). */
export function departmentOfPosting(p: JobPostingResponse, reqById: Map<number, JobRequisitionResponse>): number | null {
    return p.departmentId ?? reqById.get(p.requisitionId)?.departmentId ?? null;
}

/** Việc làm còn hiệu lực (đã đăng, chưa đóng). */
export const isActivePosting = (p: JobPostingResponse) => p.status === "OPEN" || p.status === "PAUSED";

export const hiredOf = (apps: ApplicationResponse[]) => apps.filter((a) => toFixedStage(a.currentStageType) === "HIRED");

/** Số ngày trung bình từ mở tin đến nhận việc của các hồ sơ đã tuyển trong kỳ. */
export function avgDaysToHire(apps: ApplicationResponse[], postingById: Map<number, JobPostingResponse>, p: Period): number | null {
    const days = hiredOf(apps).filter((a) => inPeriod(a.hiredAt, p)).map((a) => {
        const opened = postingById.get(a.jobPostingId)?.publishedAt ?? a.appliedAt;
        return dayjs(a.hiredAt).diff(dayjs(opened), "day");
    });
    return days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null;
}

/** Phễu: số hồ sơ ứng tuyển trong kỳ đã đi tới từng giai đoạn (hồ sơ bị từ chối chỉ tính ở "Ứng tuyển"). */
export function funnelOf(apps: ApplicationResponse[], p: Period) {
    const inP = apps.filter((a) => inPeriod(a.appliedAt, p));
    return MAIN_STAGES.map((s, i) => ({ stage: s, count: i === 0 ? inP.length : inP.filter((a) => stageRank(a) >= i).length }));
}

/** "+1" / "−3" / undefined khi không so sánh được. */
export function deltaText(cur: number | null, prev: number | null): string | undefined {
    if (cur == null || prev == null || cur === prev) return undefined;
    const d = cur - prev;
    return d > 0 ? `+${d}` : `−${Math.abs(d)}`;
}

/** "Phòng Kỹ thuật" — không thêm chữ "Phòng" khi tên danh mục đã có sẵn ("Phòng Kinh doanh", "Ban Giám đốc"). */
export function departmentLabel(name: string | null | undefined): string {
    const n = (name ?? "").trim();
    return /^(phòng|ban|khối|bộ phận|trung tâm)\b/i.test(n) ? n : `Phòng ${n}`;
}
