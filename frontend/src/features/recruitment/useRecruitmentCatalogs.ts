import { useEffect, useState } from "react";
import { getCatalogItems } from "../masterdata/masterdataApi";
import type { CatalogItem } from "../masterdata/types";

export interface RecruitmentCatalogs {
    departments: CatalogItem[];
    departmentMap: Record<number, string>;
    jobTitleMap: Record<number, string>;
    jobLevelMap: Record<number, string>;
    skillMap: Record<number, string>;
    employmentTypeMap: Record<number, string>;
    workLocationMap: Record<number, string>;
}

const EMPTY: RecruitmentCatalogs = {
    departments: [], departmentMap: {}, jobTitleMap: {}, jobLevelMap: {},
    skillMap: {}, employmentTypeMap: {}, workLocationMap: {},
};

const toMap = (items: CatalogItem[]): Record<number, string> =>
    Object.fromEntries(items.map((i) => [i.id, String(i.name)]));

/** Danh mục dùng để đổi mã thành tên ở màn yêu cầu tuyển dụng. Lỗi danh mục không chặn màn. */
export function useRecruitmentCatalogs(): RecruitmentCatalogs {
    const [cat, setCat] = useState<RecruitmentCatalogs>(EMPTY);
    useEffect(() => {
        const get = (e: string) => getCatalogItems(e).then((r) => r.data).catch(() => [] as CatalogItem[]);
        Promise.all([
            get("/masterdata/departments"), get("/masterdata/job-titles"), get("/masterdata/job-levels"),
            get("/masterdata/skills"), get("/masterdata/employment-types"), get("/masterdata/work-locations"),
        ]).then(([d, t, l, s, e, w]) => setCat({
            departments: d, departmentMap: toMap(d), jobTitleMap: toMap(t), jobLevelMap: toMap(l),
            skillMap: toMap(s), employmentTypeMap: toMap(e), workLocationMap: toMap(w),
        }));
    }, []);
    return cat;
}

/** Mã yêu cầu hiển thị như HTML: "REQ-031". */
export const requisitionCode = (id: number) => `REQ-${String(id).padStart(3, "0")}`;
