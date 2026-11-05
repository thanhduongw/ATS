import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Modal, type InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getApplications } from "../features/candidate/applicationApi";
import type { ApplicationResponse } from "../features/candidate/types";
import { getPostings } from "../features/recruitment/recruitmentApi";
import type { JobPostingResponse } from "../features/recruitment/types";
import { COLORS } from "../app/theme";
import { fixedStageLabel } from "../app/stages";
import { Avatar } from "./ui/designKit";

/**
 * R29 · Tìm kiếm nhanh (Ctrl K / ⌘K): ô tìm trên thanh đầu trang → bảng nổi chia nhóm "Ứng viên" và "Việc làm".
 * - Ứng viên: `GET /application/applications?keyword=` (tên hoặc email, backend lọc theo vai trò).
 * - Việc làm: lọc ở client trên danh sách việc làm tải một lần khi mở bảng.
 * Nợ kỹ thuật: chưa có API tìm kiếm chung — nên gom về một endpoint khi dữ liệu lớn.
 * ↑ ↓ chọn, Enter mở, Esc đóng.
 */
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();

type Hit = { key: string; to: string; kind: "app" | "job"; app?: ApplicationResponse; job?: JobPostingResponse };

export default function QuickSearch() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [apps, setApps] = useState<ApplicationResponse[]>([]);
    const [jobs, setJobs] = useState<JobPostingResponse[] | null>(null);
    const [active, setActive] = useState(0);
    const inputRef = useRef<InputRef>(null);

    // Ctrl K / ⌘K mở ở mọi trang.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        if (!open) return;
        setTimeout(() => inputRef.current?.focus(), 50);
        if (jobs == null) getPostings({ size: 1000 }).then((r) => setJobs(r.data.content)).catch(() => setJobs([]));
    }, [open, jobs]);

    // Ứng viên: gọi API sau khi ngừng gõ 250ms.
    useEffect(() => {
        const k = q.trim();
        if (k.length < 2) return;
        const t = setTimeout(() => {
            getApplications({ keyword: k, size: 6 }).then((r) => setApps(r.data.content)).catch(() => setApps([]));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    const k = q.trim();
    const shownApps = k.length >= 2 ? apps : [];
    const shownJobs = useMemo(() => {
        if (k.length < 2) return [];
        const n = norm(k);
        return (jobs ?? []).filter((j) => norm(`${j.title} ${j.departmentName ?? ""}`).includes(n)).slice(0, 5);
    }, [jobs, k]);
    const hits: Hit[] = [
        ...shownApps.map((a) => ({ key: `a${a.id}`, kind: "app" as const, app: a, to: `/candidates/${a.candidateId}/applications/${a.id}` })),
        ...shownJobs.map((j) => ({ key: `j${j.id}`, kind: "job" as const, job: j, to: `/recruitment/postings/${j.id}` })),
    ];

    const close = () => { setOpen(false); setQ(""); setApps([]); setActive(0); };
    const go = (h?: Hit) => { if (!h) return; close(); navigate(h.to); };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                    display: "flex", alignItems: "center", gap: 10, width: "min(420px, 40vw)", height: 38, padding: "0 12px 0 14px",
                    border: 0, borderRadius: 19, background: COLORS.cardBg, color: COLORS.textMuted, cursor: "text",
                    fontFamily: "inherit", fontSize: 14, textAlign: "left",
                }}
            >
                <SearchOutlined />
                <span style={{ flex: 1 }}>Tìm ứng viên, việc làm, email…</span>
                <kbd style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: COLORS.fill, color: COLORS.textSecondary, fontFamily: "inherit" }}>Ctrl K</kbd>
            </button>

            <Modal open={open} onCancel={close} footer={null} closable={false} width={600} style={{ top: 12 }}
                styles={{ container: { padding: 0, borderRadius: 20, overflow: "hidden" } }} destroyOnHidden>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `0.5px solid ${COLORS.border}` }}>
                    <SearchOutlined style={{ color: COLORS.primary }} />
                    <Input
                        ref={inputRef}
                        variant="borderless"
                        value={q}
                        placeholder="Tìm ứng viên (tên, email), việc làm…"
                        onChange={(e) => { setQ(e.target.value); setActive(0); }}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
                            if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                            if (e.key === "Enter") go(hits[active]);
                        }}
                        style={{ fontSize: 16 }}
                    />
                    <kbd style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: COLORS.fill, color: COLORS.textSecondary, fontFamily: "inherit" }}>Esc</kbd>
                </div>
                <div style={{ padding: "6px 8px 10px", maxHeight: "60vh", overflowY: "auto" }}>
                    {k.length < 2 ? (
                        <div style={{ padding: "14px 10px", color: COLORS.textSecondary, fontSize: 13 }}>Gõ ít nhất 2 ký tự để tìm.</div>
                    ) : (<>
                        <Group label="Ứng viên" empty={shownApps.length === 0} />
                        {hits.filter((h) => h.kind === "app").map((h) => (
                            <Row key={h.key} on={hits.indexOf(h) === active} onHover={() => setActive(hits.indexOf(h))} onClick={() => go(h)}>
                                <Avatar name={h.app!.candidateName} colorKey={h.app!.candidateId} size={30} />
                                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                    <b style={{ fontSize: 14 }}>{h.app!.candidateName}</b>
                                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                        {h.app!.jobTitle} · {fixedStageLabel(h.app!.currentStageType)}
                                    </span>
                                </div>
                            </Row>
                        ))}
                        <Group label="Việc làm" empty={shownJobs.length === 0} />
                        {hits.filter((h) => h.kind === "job").map((h) => (
                            <Row key={h.key} on={hits.indexOf(h) === active} onHover={() => setActive(hits.indexOf(h))} onClick={() => go(h)}>
                                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                    <b style={{ fontSize: 14 }}>{h.job!.title}</b>
                                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{h.job!.departmentName ?? ""}</span>
                                </div>
                            </Row>
                        ))}
                    </>)}
                </div>
            </Modal>
        </>
    );
}

function Group({ label, empty }: { label: string; empty: boolean }) {
    return (
        <div style={{ padding: "10px 10px 4px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: COLORS.textSecondary, textTransform: "uppercase" }}>{label}</div>
            {empty && <div style={{ fontSize: 13, color: COLORS.textMuted, paddingTop: 4 }}>Không có kết quả</div>}
        </div>
    );
}

function Row({ on, onHover, onClick, children }: { on: boolean; onHover: () => void; onClick: () => void; children: React.ReactNode }) {
    return (
        <div role="option" aria-selected={on} onMouseEnter={onHover} onClick={onClick}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, cursor: "pointer", background: on ? COLORS.primarySoft : "transparent" }}>
            {children}
        </div>
    );
}
