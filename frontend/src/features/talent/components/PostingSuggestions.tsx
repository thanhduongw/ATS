import { useEffect, useState } from "react";
import { App, Button, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, UserAddOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { COLORS } from "../../../app/theme";
import { Avatar } from "../../../components/ui/designKit";
import ApplicationCreateModal from "../../candidate/components/ApplicationCreateModal";
import type { ApiMessageResponse } from "../../candidate/types";
import { suggestForPosting } from "../talentApi";
import { CHUNK_LABEL, matchLabel } from "../match";
import type { TalentSearchResult, TalentSuggestResponse } from "../types";

interface Props {
    jobPostingId: number;
    /** Chỉ HR được thêm ứng viên vào tin; Hiring Manager chỉ xem gợi ý. */
    canAdd: boolean;
    /** Chỉ tải khi tab được mở. */
    active: boolean;
    onAdded: () => void;
}

/** Tab "Gợi ý từ kho" của trang tin tuyển dụng: ứng viên đã đồng ý lưu hồ sơ, gần nội dung tin nhất, chưa ứng tuyển tin này. */
export default function PostingSuggestions({ jobPostingId, canAdd, active, onAdded }: Props) {
    const { message } = App.useApp();
    const [data, setData] = useState<TalentSuggestResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addFor, setAddFor] = useState<number | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- trạng thái tải bắt đầu cùng lúc với lời gọi API
        setLoading(true);
        setError(null);
        suggestForPosting(jobPostingId)
            .then((r) => { if (!cancelled) setData(r.data); })
            .catch((err: AxiosError<ApiMessageResponse & { detail?: string }>) => {
                if (!cancelled) setError(err.response?.data?.detail ?? err.response?.data?.message ?? "Không tải được gợi ý");
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [active, jobPostingId, reloadKey]);

    const columns: ColumnsType<TalentSearchResult> = [
        {
            title: "Ứng viên", key: "name", width: 260,
            render: (_, r) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={r.fullName ?? "?"} size={32} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{r.fullName ?? `Ứng viên #${r.candidateId}`}</div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{r.titles[0] ?? r.currentPosition ?? r.email ?? ""}</div>
                    </div>
                </div>
            ),
        },
        {
            title: "Khớp tin", key: "score", width: 130,
            render: (_, r) => {
                const m = matchLabel(r.score);
                return <Tag color={m.color} style={{ marginInlineEnd: 0 }}>{m.text}</Tag>;
            },
        },
        {
            title: "Kinh nghiệm", key: "years", width: 120,
            render: (_, r) => (r.totalYears != null ? `${r.totalYears.toLocaleString("vi-VN")} năm` : <span style={{ color: COLORS.textMuted }}>Chưa rõ</span>),
        },
        {
            title: "Đoạn CV gần tin nhất", key: "why",
            render: (_, r) => r.matched.text ? (
                <Tooltip title={r.matched.text} placement="topLeft" styles={{ root: { maxWidth: 480 } }}>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        <b style={{ color: "inherit" }}>{CHUNK_LABEL[r.matched.type ?? ""] ?? "CV"}:</b> {r.matched.text}
                    </div>
                </Tooltip>
            ) : "—",
        },
        ...(canAdd ? [{
            title: "", key: "add", width: 150,
            render: (_: unknown, r: TalentSearchResult) => (
                <Button size="small" icon={<UserAddOutlined />} onClick={() => setAddFor(r.candidateId)}>Thêm vào tin</Button>
            ),
        }] : []),
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                    Ứng viên đã đồng ý lưu hồ sơ cho vị trí khác, có hồ sơ gần nội dung tin này nhất
                    {data ? ` (${data.eligibleTotal} người trong kho${data.alreadyApplied ? `, ${data.alreadyApplied} đã ứng tuyển tin này` : ""})` : ""}.
                </span>
                <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => setReloadKey((k) => k + 1)}>Tải lại</Button>
            </div>
            <Table<TalentSearchResult>
                rowKey="candidateId"
                columns={columns}
                dataSource={data?.results ?? []}
                loading={loading}
                pagination={false}
                locale={{ emptyText: error ?? "Chưa có ứng viên nào trong kho phù hợp với tin này" }}
            />
            <ApplicationCreateModal
                open={addFor !== null}
                presetCandidateId={addFor ?? undefined}
                presetJobPostingId={jobPostingId}
                onClose={() => setAddFor(null)}
                onSuccess={() => { setAddFor(null); message.success("Đã thêm ứng viên vào tin"); setReloadKey((k) => k + 1); onAdded(); }}
            />
        </div>
    );
}
