import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Empty, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import { DownloadOutlined, ReloadOutlined, RobotOutlined } from "@ant-design/icons";
import StatTile from "../../../components/ui/StatTile";
import { StatRow } from "../../../components/ui/pageKit";
import { COLORS } from "../../../app/theme";
import { exportToExcel } from "../../../app/exportExcel";
import { stageTypeTagColor } from "../../../app/statusLabels";
import type { ApplicationResponse } from "../../candidate/types";
import { getApplicationScore, rescorePosting } from "../aiApi";
import { AI_TIER_META, aiTierMeta, isAiScoring } from "../aiScore";
import type { AiTier, RequirementResult, RequirementStatus } from "../types";
import AiScoreBadge from "./AiScoreBadge";

interface Props {
    jobPostingId: number;
    applications: ApplicationResponse[];
    canManage: boolean;
    /** Tải lại danh sách hồ sơ (không hiện vòng xoay toàn trang). */
    onReload: () => Promise<void> | void;
    onOpen: (a: ApplicationResponse) => void;
}

// Bộ lọc: một trong 3 xếp loại, hoặc "UNSCORED" = chưa có xếp loại (chưa chấm / đang chấm / lỗi).
type Filter = AiTier | "UNSCORED";

const TIER_ORDER: AiTier[] = ["FIT", "UNCLASSIFIED", "NOT_FIT"];
const REQ_STATUS_LABEL: Record<RequirementStatus, string> = { MET: "Đạt", UNMET: "Không đạt", UNKNOWN: "Không xác định" };
const POLL_MS = 6000;
const FETCH_CONCURRENCY = 4;

// Chi tiết yêu cầu bắt buộc của một hồ sơ, lấy từ ai-service (ApplicationResponse không mang sẵn).
type ReqDetail = RequirementResult[] | "ERROR";

const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");

const countReqs = (reqs: RequirementResult[]) => ({
    met: reqs.filter((r) => r.status === "MET").length,
    unmet: reqs.filter((r) => r.status === "UNMET").length,
    unknown: reqs.filter((r) => r.status === "UNKNOWN").length,
    total: reqs.length,
});

/**
 * Tab "Đánh giá AI" của trang chi tiết tin tuyển dụng: thống kê hồ sơ theo xếp loại AI (số lượng + %),
 * bảng điểm / xếp loại / yêu cầu bắt buộc, và xuất Excel để đối chiếu với nhãn do người đánh giá gán.
 * Hồ sơ mới được chấm nền tự động; tab tự làm mới khi còn hồ sơ đang chờ chấm.
 */
export default function PostingAiTab({ jobPostingId, applications, canManage, onReload, onOpen }: Props) {
    const { message, modal } = App.useApp();
    const [filter, setFilter] = useState<Filter | undefined>();
    const [rescoring, setRescoring] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [details, setDetails] = useState<Record<number, ReqDetail>>({});
    // Khóa "id:điểm:xếp loại" đã tải chi tiết — điểm đổi (chấm lại) thì tải lại.
    const fetchedKey = useRef<Record<number, string>>({});
    // Chỉ dừng cập nhật khi rời tab; không hủy giữa chừng khi danh sách làm mới (sẽ làm mất chi tiết đã đánh dấu là đang tải).
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

    const tierOf = (a: ApplicationResponse): Filter => (aiTierMeta(a.aiTier) ? (a.aiTier as AiTier) : "UNSCORED");

    const stats = useMemo(() => {
        const s = { FIT: 0, UNCLASSIFIED: 0, NOT_FIT: 0, UNSCORED: 0, scoring: 0, failed: 0 };
        applications.forEach((a) => {
            s[tierOf(a)] += 1;
            if (isAiScoring(a.aiStatus)) s.scoring += 1;
            if (a.aiStatus === "FAILED") s.failed += 1;
        });
        return s;
    }, [applications]);
    const total = applications.length;

    // Tự làm mới khi còn hồ sơ đang chờ chấm.
    useEffect(() => {
        if (stats.scoring === 0) return;
        const t = setInterval(() => { void onReload(); }, POLL_MS);
        return () => clearInterval(t);
    }, [stats.scoring, onReload]);

    // Tải chi tiết yêu cầu bắt buộc cho hồ sơ đã chấm xong, tối đa FETCH_CONCURRENCY yêu cầu song song.
    useEffect(() => {
        const todo = applications.filter((a) =>
            a.aiStatus === "COMPLETED" && a.aiTier && fetchedKey.current[a.id] !== `${a.id}:${a.aiScore}:${a.aiTier}`);
        if (todo.length === 0) return;
        todo.forEach((a) => { fetchedKey.current[a.id] = `${a.id}:${a.aiScore}:${a.aiTier}`; });
        const queue = [...todo];
        const worker = async () => {
            for (let a = queue.shift(); a && mounted.current; a = queue.shift()) {
                let value: ReqDetail;
                try {
                    const res = await getApplicationScore(a.id);
                    value = res.data.result?.requirements ?? [];
                } catch {
                    value = "ERROR";
                    delete fetchedKey.current[a.id]; // lần sau thử lại
                }
                if (mounted.current) setDetails((prev) => ({ ...prev, [a.id]: value }));
            }
        };
        void Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, queue.length) }, worker));
    }, [applications]);

    const visible = useMemo(
        () => (filter ? applications.filter((a) => tierOf(a) === filter) : applications),
        [applications, filter],
    );

    const handleRescore = useCallback(() => {
        modal.confirm({
            title: "AI chấm các hồ sơ của tin này?",
            content: "Chỉ chấm hồ sơ chưa có điểm hoặc chấm lỗi; hồ sơ đã có điểm được giữ nguyên. "
                + "AI chạy nền, mỗi hồ sơ mất khoảng 10–40 giây.",
            okText: "Chấm",
            onOk: async () => {
                setRescoring(true);
                try {
                    const { queued, skipped } = (await rescorePosting(jobPostingId)).data;
                    message.success(queued > 0
                        ? `Đã đưa ${queued} hồ sơ vào hàng chờ chấm${skipped ? ` (bỏ qua ${skipped} hồ sơ đã có điểm hoặc đang chấm)` : ""}`
                        : "Mọi hồ sơ của tin này đã có điểm hoặc đang được chấm");
                    if (queued > 0) setTimeout(() => { void onReload(); }, 1500);
                } catch (err) {
                    const e = err as AxiosError<{ detail?: string }>;
                    message.error(e.response?.data?.detail ?? "Không gửi được yêu cầu chấm");
                } finally {
                    setRescoring(false);
                }
            },
        });
    }, [jobPostingId, message, modal, onReload]);

    // Xuất Excel cho toàn bộ hồ sơ của tin (không theo bộ lọc) để đối chiếu nhãn; đợi tải xong chi tiết yêu cầu.
    const handleExport = async () => {
        setExporting(true);
        try {
            const full: Record<number, ReqDetail> = { ...details };
            await Promise.all(applications
                .filter((a) => a.aiStatus === "COMPLETED" && a.aiTier && full[a.id] === undefined)
                .map(async (a) => {
                    try {
                        full[a.id] = (await getApplicationScore(a.id)).data.result?.requirements ?? [];
                    } catch { full[a.id] = "ERROR"; }
                }));
            const reqsOf = (a: ApplicationResponse) => (Array.isArray(full[a.id]) ? (full[a.id] as RequirementResult[]) : null);
            exportToExcel(`danh-gia-ai-tin-${jobPostingId}`, [
                { header: "Mã hồ sơ", value: (a: ApplicationResponse) => a.id },
                { header: "Ứng viên", value: (a) => a.candidateName },
                { header: "Điểm AI", value: (a) => a.aiScore },
                { header: "Xếp loại AI", value: (a) => aiTierMeta(a.aiTier)?.label ?? "" },
                { header: "Trạng thái chấm", value: (a) => a.aiStatus ?? "Chưa chấm" },
                { header: "Yêu cầu đạt", value: (a) => { const r = reqsOf(a); return r ? countReqs(r).met : ""; } },
                { header: "Yêu cầu không đạt", value: (a) => { const r = reqsOf(a); return r ? countReqs(r).unmet : ""; } },
                { header: "Yêu cầu không xác định", value: (a) => { const r = reqsOf(a); return r ? countReqs(r).unknown : ""; } },
                {
                    header: "Chi tiết yêu cầu bắt buộc",
                    value: (a) => reqsOf(a)?.map((r) => `${r.requirement}: ${REQ_STATUS_LABEL[r.status]}`).join("; ") ?? "",
                },
                { header: "Giai đoạn", value: (a) => a.currentStageName },
                { header: "Ngày ứng tuyển", value: (a) => new Date(a.appliedAt).toLocaleDateString("vi-VN") },
                { header: "Nhãn người đánh giá", value: () => "" },
            ], applications);
        } finally {
            setExporting(false);
        }
    };

    const toggle = (f: Filter) => setFilter(filter === f ? undefined : f);

    const columns: ColumnsType<ApplicationResponse> = [
        { title: "Ứng viên", dataIndex: "candidateName", key: "candidateName", ellipsis: true },
        {
            title: "Điểm / xếp loại AI",
            key: "ai",
            width: 190,
            sorter: (a, b) => (a.aiScore ?? -1) - (b.aiScore ?? -1),
            render: (_, r) => <AiScoreBadge score={r.aiScore} tier={r.aiTier} status={r.aiStatus} />,
        },
        {
            title: "Yêu cầu bắt buộc",
            key: "reqs",
            width: 190,
            render: (_, r) => {
                if (r.aiStatus !== "COMPLETED" || !r.aiTier) return <span style={{ color: COLORS.textMuted }}>—</span>;
                const d = details[r.id];
                if (d === undefined) return <span style={{ color: COLORS.textMuted }}>Đang tải…</span>;
                if (d === "ERROR") return <span style={{ color: COLORS.textMuted }}>Không tải được</span>;
                if (d.length === 0) return <span style={{ color: COLORS.textMuted }}>JD không có yêu cầu bắt buộc</span>;
                const c = countReqs(d);
                const color = c.unmet > 0 ? "red" : c.unknown > 0 ? "gold" : "green";
                return (
                    <Tooltip
                        title={<div>{d.map((x) => (
                            <div key={x.requirement}>{REQ_STATUS_LABEL[x.status]}: {x.requirement}</div>
                        ))}</div>}
                    >
                        <Tag color={color} style={{ margin: 0 }}>
                            Đạt {c.met}/{c.total}
                            {c.unmet > 0 ? ` · ${c.unmet} không đạt` : ""}
                            {c.unknown > 0 ? ` · ${c.unknown} chưa rõ` : ""}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: "Giai đoạn hiện tại",
            key: "stage",
            width: 180,
            render: (_, r) => <Tag color={stageTypeTagColor(r.currentStageType)}>{r.currentStageName}</Tag>,
        },
        {
            title: "Ngày ứng tuyển",
            responsive: ["lg"],
            dataIndex: "appliedAt",
            key: "appliedAt",
            width: 140,
            render: (v: string) => new Date(v).toLocaleDateString("vi-VN"),
        },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0, overflow: "auto" }}>
            <StatRow>
                {TIER_ORDER.map((t) => (
                    <StatTile
                        key={t}
                        icon={<RobotOutlined />}
                        label={AI_TIER_META[t].label}
                        hint={pct(stats[t], total)}
                        value={stats[t]}
                        accent={AI_TIER_META[t].stroke}
                        active={filter === t}
                        onClick={() => toggle(t)}
                    />
                ))}
                <StatTile
                    icon={<RobotOutlined />}
                    label="Chưa có xếp loại"
                    hint={`${pct(stats.UNSCORED, total)}${stats.scoring ? ` · ${stats.scoring} đang chờ chấm` : ""}${stats.failed ? ` · ${stats.failed} lỗi` : ""}`}
                    value={stats.UNSCORED}
                    accent="#94A3B8"
                    active={filter === "UNSCORED"}
                    onClick={() => toggle("UNSCORED")}
                />
            </StatRow>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>
                    {filter
                        ? `Đang lọc: ${filter === "UNSCORED" ? "Chưa có xếp loại" : AI_TIER_META[filter].label} (${visible.length}/${total})`
                        : `Tất cả ${total} hồ sơ · hồ sơ mới được AI chấm tự động`}
                    {filter && <Button type="link" size="small" onClick={() => setFilter(undefined)}>Bỏ lọc</Button>}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button icon={<ReloadOutlined />} onClick={() => { void onReload(); }}>Làm mới</Button>
                    <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>Xuất Excel</Button>
                    {canManage && (
                        <Tooltip title="Chấm các hồ sơ chưa có điểm hoặc chấm lỗi của tin này">
                            <Button icon={<RobotOutlined />} loading={rescoring} onClick={handleRescore}>AI chấm hồ sơ của tin</Button>
                        </Tooltip>
                    )}
                </div>
            </div>

            <Table
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={visible}
                onRow={(record) => ({ onClick: () => onOpen(record), style: { cursor: "pointer" } })}
                pagination={{ pageSize: 10, size: "small", showTotal: (t) => `Tổng ${t} hồ sơ` }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hồ sơ nào" /> }}
            />
        </div>
    );
}
