import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Select, Spin } from "antd";
import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { getPublicCompany, getPublicJobs } from "../publicApi";
import type { PublicCompanyResponse, PublicJobPosting } from "../types";
import { arrangementLabel } from "../jobFormat";
import { JobCard } from "../components/JobCard";
import { COLORS, GRADIENTS } from "../../../app/theme";
import { InlineNotice } from "../../../components/ui/designKit";

/**
 * C02 · Danh sách việc làm (công khai): ô tìm kiếm, bộ lọc bên trái có số đếm (Phòng ban · Địa điểm ·
 * Hình thức làm việc · Loại hình), "Sắp xếp", chip bộ lọc đang chọn.
 * C31 · Không có kết quả: gợi ý bỏ bớt bộ lọc + "Việc làm mới nhất".
 * Từ khoá lưu trên URL (?q=) để chia sẻ được đường dẫn tìm kiếm.
 */
type GroupKey = "dept" | "loc" | "arr" | "type";
type Sort = "NEWEST" | "SALARY";

const GROUPS: { key: GroupKey; title: string; value: (j: PublicJobPosting) => string | null | undefined }[] = [
    { key: "dept", title: "Phòng ban", value: (j) => j.departmentName },
    { key: "loc", title: "Địa điểm", value: (j) => j.workLocationName },
    { key: "arr", title: "Hình thức làm việc", value: arrangementLabel },
    { key: "type", title: "Loại hình", value: (j) => j.employmentTypeName },
];
const EMPTY: Record<GroupKey, string[]> = { dept: [], loc: [], arr: [], type: [] };

export default function CompanyJobsPage() {
    const [params, setParams] = useSearchParams();
    const [company, setCompany] = useState<PublicCompanyResponse | null>(null);
    const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [draft, setDraft] = useState(params.get("q") ?? "");
    const [selected, setSelected] = useState<Record<GroupKey, string[]>>(EMPTY);
    const [sort, setSort] = useState<Sort>("NEWEST");
    const keyword = (params.get("q") ?? "").trim().toLowerCase();

    useEffect(() => {
        Promise.all([getPublicCompany().catch(() => null), getPublicJobs()])
            .then(([c, j]) => { setCompany(c?.data ?? null); setJobs(j.data); })
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, []);

    const matchesKeyword = (j: PublicJobPosting) => !keyword
        || [j.title, j.departmentName, j.description, j.requirements].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    const matchesGroups = (j: PublicJobPosting, except?: GroupKey) => GROUPS.every((g) =>
        g.key === except || selected[g.key].length === 0 || selected[g.key].includes(g.value(j) ?? ""));

    const results = useMemo(() => {
        const list = jobs.filter((j) => matchesKeyword(j) && matchesGroups(j));
        return list.sort((a, b) => sort === "SALARY"
            ? (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0)
            : dayjs(b.publishedAt ?? 0).valueOf() - dayjs(a.publishedAt ?? 0).valueOf());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobs, keyword, selected, sort]);

    /** Số đếm của từng lựa chọn tính trên các bộ lọc khác (để biết chọn thêm thì còn bao nhiêu). */
    const optionsOf = (g: (typeof GROUPS)[number]) => {
        const counts = new Map<string, number>();
        jobs.filter((j) => matchesKeyword(j) && matchesGroups(j, g.key)).forEach((j) => {
            const v = g.value(j);
            if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
        });
        jobs.forEach((j) => { const v = g.value(j); if (v && !counts.has(v)) counts.set(v, 0); });
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    };

    const toggle = (g: GroupKey, v: string) => setSelected((s) => ({
        ...s, [g]: s[g].includes(v) ? s[g].filter((x) => x !== v) : [...s[g], v],
    }));
    const activeChips = GROUPS.flatMap((g) => selected[g.key].map((v) => ({ g: g.key, v })));
    const hasFilter = activeChips.length > 0 || !!keyword;
    const clearAll = () => { setSelected(EMPTY); setDraft(""); setParams({}); };
    const search = () => setParams(draft.trim() ? { q: draft.trim() } : {});

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    if (failed) return <InlineNotice tone="danger" action={<Button onClick={() => window.location.reload()}>Thử lại</Button>}>Không tải được danh sách việc làm.</InlineNotice>;

    const newest = [...jobs].sort((a, b) => dayjs(b.publishedAt ?? 0).valueOf() - dayjs(a.publishedAt ?? 0).valueOf()).slice(0, 2);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Dải đầu C02: nền xanh đậm tràn hết chiều ngang, tiêu đề trắng, ô tìm kiếm dạng viên nhộng. */}
            <div style={{
                width: "100vw", marginLeft: "calc(50% - 50vw)", marginTop: -28, padding: "36px 24px 40px",
                background: GRADIENTS.hero,
            }}>
                <div style={{ maxWidth: 1152, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.01em", color: COLORS.textOnDark }}>
                        Việc làm tại {company?.name ?? "chúng tôi"}
                    </span>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, maxWidth: 820, padding: 6, paddingLeft: 18,
                        borderRadius: 28, background: COLORS.cardBg,
                    }}>
                        <SearchOutlined style={{ color: COLORS.textMuted }} />
                        <Input variant="borderless" allowClear placeholder="Tên vị trí, kỹ năng…" value={draft}
                            style={{ flex: 1, fontSize: 15 }}
                            onChange={(e) => { setDraft(e.target.value); if (!e.target.value) setParams({}); }}
                            onPressEnter={search} />
                        <Button size="large" type="primary" shape="round" onClick={search}>Tìm kiếm</Button>
                    </div>
                </div>
            </div>

            <div className="cand-2col" style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
                <aside style={{ background: COLORS.cardBg, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <b>Bộ lọc</b>
                        {activeChips.length > 0 && <a onClick={() => setSelected(EMPTY)}>Xoá lọc</a>}
                    </div>
                    {GROUPS.map((g) => {
                        const opts = optionsOf(g);
                        if (opts.length === 0) return null;
                        return (
                            <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary }}>{g.title}</span>
                                {opts.map(([v, n]) => (
                                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                                        <Checkbox checked={selected[g.key].includes(v)} onChange={() => toggle(g.key, v)} />
                                        <span style={{ flex: 1 }}>{v}</span>
                                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{n}</span>
                                    </label>
                                ))}
                            </div>
                        );
                    })}
                </aside>

                <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ fontSize: 15 }}>
                            {results.length} việc làm{keyword ? ` “${params.get("q")}”` : hasFilter ? " phù hợp" : " đang tuyển"}
                        </b>
                        {activeChips.map(({ g, v }) => (
                            <button key={`${g}-${v}`} type="button" onClick={() => toggle(g, v)} style={{
                                display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px", border: 0,
                                borderRadius: 13, background: COLORS.primarySoft, color: COLORS.primary, fontSize: 12, cursor: "pointer",
                            }}>
                                {v} <CloseOutlined style={{ fontSize: 10 }} />
                            </button>
                        ))}
                        <span style={{ flex: 1 }} />
                        <Select<Sort> value={sort} onChange={setSort} style={{ width: 190 }}
                            options={[{ value: "NEWEST", label: "Sắp xếp: Mới nhất" }, { value: "SALARY", label: "Sắp xếp: Lương cao nhất" }]} />
                    </div>

                    {results.length === 0 ? (
                        <>
                            <div style={{ background: COLORS.cardBg, borderRadius: 20, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                                <b style={{ fontSize: 16 }}>{jobs.length === 0 ? "Hiện chưa có vị trí đang tuyển" : "Không tìm thấy việc làm phù hợp"}</b>
                                {jobs.length > 0 && <span style={{ color: COLORS.textSecondary }}>Thử từ khoá khác hoặc bỏ bớt bộ lọc.</span>}
                                {hasFilter && <Button onClick={clearAll}>Xoá bộ lọc</Button>}
                            </div>
                            {hasFilter && newest.length > 0 && (<>
                                <b style={{ marginTop: 8 }}>Việc làm mới nhất</b>
                                {newest.map((j) => <JobCard key={j.id} job={j} />)}
                            </>)}
                        </>
                    ) : results.map((j) => <JobCard key={j.id} job={j} />)}
                </section>
            </div>
        </div>
    );
}
