import { useMemo } from "react";
import { Button, Card, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, ThunderboltOutlined, VideoCameraOutlined, EnvironmentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import type { InterviewResponse } from "../types";
import { sessionDescription, type SessionDisplay } from "../session";
import { isOverdue, sortInterviewsForList, statusRank } from "../ordering";
import { COLORS } from "../../../app/theme";
import { interviewStatusMeta } from "../../../app/statusLabels";
import EmptyState from "../../../components/ui/EmptyState";
import { listCardStyle, listCardBodyStyle, listPagination } from "../../../components/ui/listStyles";

interface Props {
    interviews: InterviewResponse[];
    loading: boolean;
    workLocationMap: Record<number, string>;
    /** Tên tin tuyển dụng và phòng ban, ghép từ id mà API buổi phỏng vấn trả về. */
    postingMap: Record<number, string>;
    departmentMap: Record<number, string>;
    sessionDisplayById: ReadonlyMap<number, SessionDisplay>;
    onSelect: (interview: InterviewResponse) => void;
    onOpenEvaluation: (interview: InterviewResponse) => void;
    onOpenApplication: (url: string) => void;
}

/**
 * Chế độ Danh sách của màn hình lịch phỏng vấn.
 *
 * Tách riêng khỏi InterviewCalendar để sửa bảng mà không chạm vào ba chế độ
 * Ngày / Tuần / Tháng.
 */
export default function InterviewListView({
    interviews,
    loading,
    workLocationMap,
    postingMap,
    departmentMap,
    sessionDisplayById,
    onSelect,
    onOpenEvaluation,
    onOpenApplication,
}: Props) {
    /**
     * Thứ tự mặc định do dữ liệu quyết định chứ không đặt `defaultSortOrder` lên cột
     * Thời gian, vì cần gộp nhóm trước rồi mới xếp theo giờ. Bấm vào đầu cột vẫn
     * sắp lại thuần theo giờ như bình thường.
     */
    const orderedInterviews = useMemo(() => sortInterviewsForList(interviews), [interviews]);

    const columns: ColumnsType<InterviewResponse> = [
        {
            title: "Ứng viên",
            dataIndex: "candidateName",
            key: "candidateName",
            ellipsis: true,
            render: (name: string, r) => {
                const session = r.sessionId == null ? undefined : sessionDisplayById.get(r.sessionId);

                // Hồ sơ cũ có thể thiếu candidateId — lúc đó để chữ thường, không tạo liên kết chết.
                const candidateName = r.candidateId == null ? (
                    <span style={{ fontWeight: 500 }}>{name}</span>
                ) : (
                    <Button
                        type="link"
                        style={{ padding: 0, height: "auto", fontWeight: 500 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenApplication(`/candidates/${r.candidateId}/applications/${r.applicationId}`);
                        }}
                    >
                        {name}
                    </Button>
                );

                // Vị trí và phòng ban nằm ở dòng phụ thay vì hai cột riêng: bảng gọn hơn,
                // mà đây là thông tin để liếc nhanh chứ không phải để sắp xếp.
                const posting = r.jobPostingId == null ? undefined : postingMap[r.jobPostingId];
                const department = r.departmentId == null ? undefined : departmentMap[r.departmentId];
                const context = [posting, department].filter(Boolean).join(" · ");

                return (
                    <div
                        style={{
                            minWidth: 0,
                            paddingLeft: session ? 8 : 0,
                            borderLeft: session ? `3px solid ${session.accent}` : undefined,
                        }}
                    >
                        <div>{candidateName}</div>
                        {context && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: COLORS.textMuted,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                                title={context}
                            >
                                {context}
                            </div>
                        )}
                        {r.sessionId != null && session && (
                            <Tooltip title={sessionDescription(r.sessionId, session.size)}>
                                <Tag
                                    icon={<ThunderboltOutlined />}
                                    color={session.accent}
                                    style={{ margin: "4px 0 0", fontSize: 11 }}
                                >
                                    Lô {session.size} ứng viên
                                </Tag>
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Thời gian",
            key: "scheduledAt",
            width: 140,
            render: (_, r) => (
                <div style={{ lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {dayjs(r.scheduledAt).format("HH:mm")} –{" "}
                        {dayjs(r.scheduledAt).add(r.durationMinutes ?? 60, "minute").format("HH:mm")}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                        {dayjs(r.scheduledAt).format("dddd, DD/MM/YYYY")}
                    </div>
                    {/* Không có dấu này thì thứ tự gộp nhóm nhìn như sắp xếp sai. */}
                    {isOverdue(r) && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.warning }}>
                            Quá hạn
                        </div>
                    )}
                </div>
            ),
            sorter: (a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf(),
        },
        {
            // Cột riêng thay vì nhét dưới thời gian: đây là thứ HR quét mắt tìm đầu tiên.
            // Không gắn bộ lọc vào đầu cột vì thanh công cụ đã có ô lọc Trạng thái.
            title: "Trạng thái",
            key: "status",
            width: 140,
            render: (_, r) => {
                const meta = interviewStatusMeta(r.status);
                return <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>;
            },
            sorter: (a, b) => statusRank(a.status) - statusRank(b.status),
        },
        {
            title: "Hình thức / Địa điểm",
            responsive: ["xl"],
            key: "format",
            width: 190,
            ellipsis: true,
            render: (_, r) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    {r.format === "ONLINE" ? (
                        <VideoCameraOutlined style={{ color: COLORS.textMuted }} />
                    ) : (
                        <EnvironmentOutlined style={{ color: COLORS.textMuted }} />
                    )}
                    {r.format === "ONLINE"
                        ? "Trực tuyến"
                        : r.workLocationId
                            ? workLocationMap[r.workLocationId] ?? "Trực tiếp"
                            : "Trực tiếp"}
                </span>
            ),
        },
        {
            title: "Người phỏng vấn",
            responsive: ["lg"],
            key: "interviewers",
            width: 180,
            render: (_, r) => {
                if (r.interviewers.length === 0) {
                    return <span style={{ color: COLORS.textMuted }}>—</span>;
                }
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {r.interviewers.map((person) => (
                            <Tooltip
                                key={person.interviewerId}
                                title={person.evaluationSubmitted ? "Đã nộp đánh giá" : "Chưa nộp đánh giá"}
                            >
                                <span
                                    style={{
                                        display: "flex", alignItems: "center", gap: 6,
                                        fontSize: 13, minWidth: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                                            background: person.evaluationSubmitted ? COLORS.success : "#D1D5DB",
                                        }}
                                    />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {person.fullName}
                                    </span>
                                </span>
                            </Tooltip>
                        ))}
                    </div>
                );
            },
        },
        {
            // Gộp "Đánh giá" và nút "Xem đánh giá" cũ: cùng một ý, trước tốn hai cột.
            // Chưa ai nộp thì thẻ xám và không bấm được, thay vì mở ra một bảng rỗng.
            title: "Đánh giá",
            key: "evaluation",
            width: 90,
            render: (_, r) => {
                const total = r.interviewers.length;
                const done = r.interviewers.filter((i) => i.evaluationSubmitted).length;

                if (total === 0) return <span style={{ color: COLORS.textMuted }}>—</span>;

                if (done === 0) {
                    return (
                        <Tooltip title="Chưa có ai nộp đánh giá">
                            <Tag style={{ margin: 0, opacity: 0.65 }}>0/{total}</Tag>
                        </Tooltip>
                    );
                }

                return (
                    <Tooltip title="Xem đánh giá">
                        <Tag
                            icon={<EyeOutlined />}
                            color={done === total ? "success" : "processing"}
                            style={{ margin: 0, cursor: "pointer" }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenEvaluation(r);
                            }}
                        >
                            {done}/{total}
                        </Tag>
                    </Tooltip>
                );
            },
        },
    ];

    return (
        <Card className="table-card-fill" style={listCardStyle} styles={{ body: listCardBodyStyle }}>
            <div className="table-scroll-wrap" style={{ flex: 1, minHeight: 0 }}>
                <Table
                    rowKey="id"
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={orderedInterviews}
                    // Màn hình quá hẹp thì cuộn ngang, không bỏ tiếp thông tin.
                    scroll={{ x: 880 }}
                    onRow={(record) => ({
                        onClick: () => onSelect(record),
                        style: { cursor: "pointer" },
                    })}
                    pagination={{ pageSize: 20, ...listPagination("buổi phỏng vấn") }}
                    locale={{
                        emptyText: loading ? <span /> : (
                            <EmptyState
                                title="Chưa có lịch phỏng vấn nào"
                                description="Lịch phỏng vấn phù hợp với bộ lọc sẽ hiển thị ở đây."
                            />
                        ),
                    }}
                />
            </div>
        </Card>
    );
}
