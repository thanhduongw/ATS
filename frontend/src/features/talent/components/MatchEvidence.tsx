import { CheckCircleFilled, MinusCircleOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Tag, Tooltip } from "antd";
import { COLORS } from "../../../app/theme";
import { CHUNK_LABEL } from "../match";
import type { TalentEvidence, TalentJob, TalentMatchedChunk } from "../types";

/** Câu trích với phần khớp được tô đậm (`highlights` là các cặp [bắt đầu, kết thúc) tính trong `text`). */
function Highlighted({ text, highlights }: { text: string; highlights: number[][] }) {
    const parts: React.ReactNode[] = [];
    let at = 0;
    [...highlights].sort((a, b) => a[0] - b[0]).forEach(([s, e], i) => {
        if (s < at || e > text.length) return;
        if (s > at) parts.push(text.slice(at, s));
        parts.push(<mark key={i} style={{ background: COLORS.warningBg, color: "inherit", padding: "0 2px", borderRadius: 3, fontWeight: 600 }}>{text.slice(s, e)}</mark>);
        at = e;
    });
    parts.push(text.slice(at));
    return <>{parts}</>;
}

const SHOWN_BY_DEFAULT = 2;

/** Một điều kiện có bằng chứng: câu trích đầu tiên, bấm "Xem thêm bằng chứng" để xem các chỗ khác trong CV. */
function FoundEvidence({ ev }: { ev: TalentEvidence }) {
    const [more, setMore] = useState(false);
    const others = ev.others ?? [];
    return (
        <div style={{ color: COLORS.textSecondary, lineHeight: 1.45 }}>
            <div><b style={{ color: "inherit" }}>{CHUNK_LABEL[ev.section ?? ""] ?? "CV"}:</b> <Highlighted text={ev.text ?? ""} highlights={ev.highlights} /></div>
            {more && others.map((o, i) => (
                <div key={i} style={{ marginTop: 4, paddingLeft: 8, borderLeft: `2px solid ${COLORS.fill}` }}>
                    <b style={{ color: "inherit" }}>{CHUNK_LABEL[o.section] ?? "CV"}:</b> <Highlighted text={o.text} highlights={o.highlights} />
                </div>
            ))}
            {others.length > 0 && (
                <Button type="link" size="small" style={{ padding: 0, height: "auto" }} onClick={() => setMore(!more)}>
                    {more ? "Ẩn bớt" : `Xem thêm bằng chứng (${others.length})`}
                </Button>
            )}
        </div>
    );
}

/** Giải thích CỤ THỂ vì sao một điều kiện không có trong CV mà ứng viên vẫn được xếp: nêu cách viết đã thử và đoạn gần nghĩa nhất. */
function SemanticOnly({ ev, semantic }: { ev: TalentEvidence; semantic?: TalentMatchedChunk }) {
    const tried = ev.tried.map((t) => `“${t}”`).join(", ");
    const near = semantic?.text ? (semantic.text.length > 150 ? `${semantic.text.slice(0, 150).trim()}…` : semantic.text) : null;
    return (
        <div style={{ color: COLORS.textMuted, lineHeight: 1.45 }}>
            <i>
                {ev.inSkillList
                    ? "Có trong danh sách kỹ năng nhưng CV không có câu nào mô tả cụ thể. "
                    : `CV không có từ nào trùng với điều kiện này (đã tìm ${tried}, không phân biệt dấu/hoa thường). `}
                Ứng viên vẫn được xếp vì AI thấy nội dung CV gần nghĩa với câu hỏi
                {near ? <>, gần nhất là đoạn {CHUNK_LABEL[semantic?.type ?? ""] ?? "CV"}: “{near}”</> : ""}.
                Đây là suy luận theo ngữ nghĩa, chưa phải bằng chứng — hãy đọc CV để xác nhận.
            </i>
        </div>
    );
}

/**
 * "Vì sao khớp": bằng chứng THẬT trong CV cho từng điều kiện của câu hỏi. Tìm kiếm ngữ nghĩa chỉ cho biết hồ sơ gần nghĩa;
 * ở đây HR thấy đúng câu trong CV chứa điều kiện đó. Chỉ hiện sẵn vài bằng chứng mạnh nhất; phần còn lại (kể cả điều kiện
 * chỉ khớp ngữ nghĩa, kèm giải thích) nằm sau "Xem thêm".
 */
export function MatchEvidence({ evidence, semantic }: { evidence: TalentEvidence[]; semantic?: TalentMatchedChunk; score?: number }) {
    const [open, setOpen] = useState(false);
    const visible = open ? evidence : evidence.slice(0, SHOWN_BY_DEFAULT);
    const hidden = evidence.length - SHOWN_BY_DEFAULT;
    const hiddenWeak = evidence.slice(SHOWN_BY_DEFAULT).filter((e) => !e.found).length;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visible.map((ev) => (
                <div key={ev.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Tag color={ev.found ? "green" : "default"} style={{ marginInlineEnd: 0, flexShrink: 0 }}
                        icon={ev.found ? <CheckCircleFilled /> : <MinusCircleOutlined />}>{ev.label}</Tag>
                    {ev.found && ev.text ? (
                        <FoundEvidence ev={ev} />
                    ) : <SemanticOnly ev={ev} semantic={semantic} />}
                </div>
            ))}
            {hidden > 0 && (
                <Button type="link" size="small" style={{ padding: 0, height: "auto", alignSelf: "flex-start" }} onClick={() => setOpen(!open)}>
                    {open ? "Thu gọn" : `Xem thêm ${hidden} điều kiện${hiddenWeak ? ` (${hiddenWeak} chỉ khớp ngữ nghĩa)` : ""}`}
                </Button>
            )}
        </div>
    );
}

/** Số năm kinh nghiệm kèm các công việc làm cơ sở (rê chuột để xem). */
export function YearsWithJobs({ years, jobs }: { years: number | null; jobs: TalentJob[] }) {
    if (years == null) return <span style={{ color: COLORS.textMuted }}>Chưa rõ</span>;
    const label = `${years.toLocaleString("vi-VN")} năm`;
    if (jobs.length === 0) return <>{label}</>;
    return (
        <Tooltip placement="topLeft" styles={{ root: { maxWidth: 420 } }} title={(
            <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Tính từ các công việc trong CV</div>
                {jobs.map((j, i) => (
                    <div key={i}>{[j.title, j.company].filter(Boolean).join(" · ")} ({j.start ?? "?"} → {j.end ?? "?"})</div>
                ))}
                <div style={{ opacity: 0.7, marginTop: 4 }}>Công việc làm song song chỉ tính một lần.</div>
            </div>
        )}>
            <span style={{ borderBottom: `1px dotted ${COLORS.textMuted}`, cursor: "help" }}>{label}</span>
        </Tooltip>
    );
}
