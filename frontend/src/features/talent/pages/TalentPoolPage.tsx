import { useEffect, useState } from "react";
import { App, Button, Checkbox, Input, InputNumber, Select, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { COLORS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { Avatar } from "../../../components/ui/designKit";
import ApplicationCreateModal from "../../candidate/components/ApplicationCreateModal";
import type { ApiMessageResponse } from "../../candidate/types";
import { searchTalentPool } from "../talentApi";
import { listDuplicates } from "../duplicateApi";
import DuplicatePairsTable from "../components/DuplicatePairsTable";
import { CHUNK_LABEL, matchLabel } from "../match";
import { MatchEvidence, YearsWithJobs } from "../components/MatchEvidence";
import type { RecruitStatus, TalentPoolFilter, TalentSearchResponse, TalentSearchResult } from "../types";

/**
 * Kho ứng viên (Talent Pool): HR tìm ứng viên ĐÃ ĐỒNG Ý lưu hồ sơ bằng ngôn ngữ tự nhiên.
 *
 * - AI tách câu hỏi thành bộ lọc cứng (số năm, kỹ năng) + phần ngữ nghĩa; bộ lọc hiện thành thẻ để HR gỡ được.
 * - Mỗi kết quả kèm đoạn CV khớp nhất để thấy VÌ SAO khớp.
 * - "Thêm vào việc làm" dùng lại luồng thêm hồ sơ thủ công.
 */

const EXAMPLES = [
    "Backend dev biết Kafka, 3 năm kinh nghiệm",
    "Lập trình viên React, có làm dự án thực tế",
    "Nhân viên kế toán tổng hợp",
];

const POOL_OPTIONS: { value: TalentPoolFilter; label: string }[] = [
    { value: "ALL", label: "Mọi ứng viên đã đồng ý" },
    { value: "IN_POOL", label: "Đã bị từ chối ở vị trí khác" },
];

const STATUS_OPTIONS: { value: RecruitStatus; label: string }[] = [
    { value: "NONE", label: "Chưa ứng tuyển" },
    { value: "IN_PROGRESS", label: "Đang tuyển dụng" },
    { value: "REJECTED", label: "Đã bị loại" },
    { value: "HIRED", label: "Đã được tuyển" },
];
const DEFAULT_STATUSES: RecruitStatus[] = ["NONE", "IN_PROGRESS", "REJECTED"]; // mặc định không hiện người đã được tuyển
const STATUS_TONE: Record<RecruitStatus, string> = { NONE: "default", IN_PROGRESS: "blue", REJECTED: "red", HIRED: "green" };

type Tab = "SEARCH" | "DUPLICATES";

export default function TalentPoolPage() {
    const { message } = App.useApp();
    const [tab, setTab] = useState<Tab>("SEARCH");
    const [dupCount, setDupCount] = useState<number | undefined>(undefined);
    const [query, setQuery] = useState("");
    const [pool, setPool] = useState<TalentPoolFilter>("ALL");
    const [statuses, setStatuses] = useState<RecruitStatus[]>(DEFAULT_STATUSES);
    const [minYearsInput, setMinYearsInput] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<TalentSearchResponse | null>(null);
    const [addFor, setAddFor] = useState<number | null>(null);

    /** Chạy tìm. `override` = bộ lọc người dùng vừa chỉnh (gỡ thẻ, đổi số năm); không có thì để AI tự tách. */
    const run = async (q: string, override?: { minYears?: number | null; maxYears?: number | null; skills?: string[] }, poolStatus = pool, statusList = statuses) => {
        const text = q.trim();
        if (text.length < 2) { message.warning("Nhập ít nhất 2 ký tự"); return; }
        setLoading(true);
        try {
            const r = await searchTalentPool({
                query: text, poolStatus, statuses: statusList, limit: 30,
                ...(override?.minYears !== undefined ? { minYears: override.minYears ?? 0 } : {}),
                ...(override?.maxYears !== undefined ? { maxYears: override.maxYears ?? 0 } : {}),
                ...(override?.skills !== undefined ? { skills: override.skills } : {}),
            });
            setData(r.data);
            setMinYearsInput(r.data.applied.minYears);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tìm được, vui lòng thử lại");
        } finally { setLoading(false); }
    };

    const submit = (q = query) => { setQuery(q); void run(q); };

    // Số cặp nghi trùng chờ xử lý hiện trên tab; lỗi thì không hiện số (không chặn trang).
    useEffect(() => {
        listDuplicates().then((r) => setDupCount(r.data.items.length)).catch(() => undefined);
    }, []);

    const columns: ColumnsType<TalentSearchResult> = [
        {
            title: "Ứng viên", key: "name", width: 260,
            render: (_, r) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar name={r.fullName} colorKey={r.candidateId} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{r.fullName ?? "(Chưa có tên)"}</div>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.titles[0] ?? r.currentPosition ?? r.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Khớp", key: "score", width: 130,
            render: (_, r) => {
                const m = matchLabel(r.score, r.coverage);
                return <Tag color={m.color} style={{ marginInlineEnd: 0 }}>{m.text}</Tag>;
            },
        },
        {
            title: "Trạng thái tuyển dụng", key: "recruitment", width: 190,
            render: (_, r) => {
                const rc = r.recruitment;
                const label = STATUS_OPTIONS.find((o) => o.value === rc.status)?.label ?? rc.status;
                return (
                    <div style={{ minWidth: 0 }}>
                        <Tag color={STATUS_TONE[rc.status]} style={{ marginInlineEnd: 0 }}>{label}</Tag>
                        {rc.status !== "NONE" && (rc.jobTitle || rc.stageName) && (
                            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 1.4 }}>
                                {rc.stageName && <div style={{ fontWeight: 500 }}>{rc.stageName}</div>}
                                {rc.jobTitle && <div>{rc.jobTitle}</div>}
                                {rc.applications > 1 && <div style={{ color: COLORS.textMuted }}>{rc.applications} hồ sơ ứng tuyển</div>}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Kinh nghiệm", key: "years", width: 120,
            render: (_, r) => <YearsWithJobs years={r.totalYears} jobs={r.jobs ?? []} />,
        },
        {
            title: "Vì sao khớp", key: "why", width: 440,
            render: (_, r) => (
                <div style={{ fontSize: 13 }}>
                    {r.evidence?.length ? (
                        <MatchEvidence evidence={r.evidence} semantic={r.matched} score={r.score} />
                    ) : r.matched.text ? (
                        <Tooltip title={r.matched.text} placement="topLeft" styles={{ root: { maxWidth: 480 } }}>
                            <div style={{ color: COLORS.textSecondary, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                <b style={{ color: "inherit" }}>{CHUNK_LABEL[r.matched.type ?? ""] ?? "CV"}:</b> {r.matched.text}
                            </div>
                        </Tooltip>
                    ) : <span style={{ color: COLORS.textMuted }}>—</span>}
                    {r.skills.length > 0 && (
                        <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {r.skills.slice(0, 5).map((s) => <Tag key={s} style={{ marginInlineEnd: 0 }}>{s}</Tag>)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Ghi chú", key: "tags", width: 190,
            render: (_, r) => (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {r.poolStatus === "IN_POOL" && <Tag color="orange" style={{ marginInlineEnd: 0 }}>Từ chối ở vị trí khác</Tag>}
                    {r.tags.slice(0, 2).map((t) => <Tag key={t} style={{ marginInlineEnd: 0 }}>{t}</Tag>)}
                </div>
            ),
        },
        {
            title: "", key: "action", width: 170, align: "right",
            render: (_, r) => (
                <Button size="small" icon={<UserAddOutlined />} onClick={() => setAddFor(r.candidateId)}>Thêm vào việc làm</Button>
            ),
        },
    ];

    const applied = data?.applied;
    const hasChips = !!applied && (applied.minYears != null || applied.maxYears != null || applied.skills.length > 0);

    return (
        <ListPage
            title="Kho ứng viên"
            subtitle="Tìm trong số ứng viên đã đồng ý để doanh nghiệp lưu hồ sơ và xét cho vị trí khác"
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={setTab}
                    items={[
                        { key: "SEARCH", label: "Tìm kiếm" },
                        { key: "DUPLICATES", label: "Nghi trùng", count: dupCount },
                    ]}
                />
            }
            filters={tab !== "SEARCH" ? undefined : (
                <ListFilters>
                    <Input.Search
                        allowClear
                        size="large"
                        style={{ flex: 1, minWidth: 320 }}
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Mô tả ứng viên cần tìm, ví dụ: backend dev biết Kafka, 3 năm kinh nghiệm"
                        enterButton="Tìm"
                        maxLength={500}
                        value={query}
                        loading={loading}
                        onChange={(e) => setQuery(e.target.value)}
                        onSearch={(v) => submit(v)}
                    />
                    <Checkbox.Group
                        value={statuses}
                        onChange={(v) => { const next = v as RecruitStatus[]; setStatuses(next); if (data) void run(data.query, undefined, pool, next); }}
                        options={STATUS_OPTIONS.map((o) => ({
                            value: o.value,
                            label: `${o.label}${data ? ` (${data.statusCounts?.[o.value] ?? 0})` : ""}`,
                        }))}
                    />
                    <Select<TalentPoolFilter>
                        value={pool}
                        options={POOL_OPTIONS}
                        style={{ width: 240 }}
                        onChange={(v) => { setPool(v); if (data) void run(data.query, undefined, v); }}
                    />
                </ListFilters>
            )}
            footnote={tab === "SEARCH" && data && (
                <span>
                    {data.results.length} kết quả trong {data.eligibleTotal} ứng viên đã đồng ý
                    {data.eligibleTotal === 0 && " — chưa có ứng viên nào bật \"Lưu hồ sơ cho vị trí khác\""}
                </span>
            )}
        >
            {tab === "DUPLICATES" && <DuplicatePairsTable onCount={setDupCount} />}

            {tab === "SEARCH" && hasChips && applied && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "12px 16px", borderBottom: `1px solid ${COLORS.fill}` }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>AI đã áp dụng bộ lọc:</span>
                    {applied.minYears != null && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Tag color="blue" style={{ marginInlineEnd: 0 }}>Từ</Tag>
                            <InputNumber
                                size="small" min={0.5} max={50} step={0.5} style={{ width: 70 }}
                                value={minYearsInput ?? undefined}
                                onChange={(v) => setMinYearsInput(v)}
                                onPressEnter={() => data && void run(data.query, { minYears: minYearsInput, maxYears: applied.maxYears, skills: applied.skills })}
                                onBlur={() => { if (data && minYearsInput !== applied.minYears) void run(data.query, { minYears: minYearsInput, maxYears: applied.maxYears, skills: applied.skills }); }}
                            />
                            <span style={{ fontSize: 13 }}>năm</span>
                            <Button size="small" type="text" aria-label="Gỡ bộ lọc số năm"
                                onClick={() => void run(data!.query, { minYears: null, maxYears: applied.maxYears, skills: applied.skills })}>✕</Button>
                        </span>
                    )}
                    {applied.maxYears != null && (
                        <Tag color="blue" closable style={{ marginInlineEnd: 0 }}
                            onClose={(e) => { e.preventDefault(); void run(data!.query, { minYears: applied.minYears, maxYears: null, skills: applied.skills }); }}>
                            Dưới {applied.maxYears.toLocaleString("vi-VN")} năm kinh nghiệm
                        </Tag>
                    )}
                    {applied.skills.map((s) => (
                        <Tag key={s} color="blue" closable style={{ marginInlineEnd: 0 }}
                            onClose={(e) => { e.preventDefault(); void run(data!.query, { minYears: applied.minYears, maxYears: applied.maxYears, skills: applied.skills.filter((x) => x !== s) }); }}>
                            Có {s}
                        </Tag>
                    ))}
                </div>
            )}

            {tab === "SEARCH" && <Table<TalentSearchResult>
                rowKey="candidateId"
                loading={loading}
                columns={columns}
                dataSource={data?.results ?? []}
                pagination={false}
                locale={{
                    emptyText: loading ? <span /> : !data ? (
                        <EmptyState
                            title="Bắt đầu bằng một câu mô tả"
                            description="Gõ vai trò, kỹ năng hoặc số năm kinh nghiệm bằng ngôn ngữ thường ngày."
                            action={
                                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                                    {EXAMPLES.map((ex) => <Button key={ex} size="small" onClick={() => submit(ex)}>{ex}</Button>)}
                                </div>
                            }
                        />
                    ) : (
                        <EmptyState
                            title="Không có ứng viên phù hợp"
                            description={hasChips ? "Thử gỡ bớt bộ lọc phía trên, hoặc mô tả rộng hơn." : "Thử mô tả theo cách khác, hoặc chọn \"Mọi ứng viên đã đồng ý\"."}
                        />
                    ),
                }}
            />}

            <ApplicationCreateModal
                open={addFor != null}
                presetCandidateId={addFor ?? undefined}
                onClose={() => setAddFor(null)}
                onSuccess={() => { setAddFor(null); message.success("Đã thêm ứng viên vào việc làm"); }}
            />
        </ListPage>
    );
}
