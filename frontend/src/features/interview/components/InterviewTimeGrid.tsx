import { useEffect, useMemo, useRef } from "react";
import { Tooltip } from "antd";
import { VideoCameraOutlined, EnvironmentOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { InterviewResponse } from "../types";
import { interviewStatusMeta } from "../../../app/statusLabels";
import { COLORS } from "../../../app/theme";

const HOUR_HEIGHT = 56;
const GUTTER_WIDTH = 56;
const VI_WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

interface SessionDisplay {
    size: number;
    accent: string;
}

interface Props {
    interviews: InterviewResponse[];
    mode: "day" | "week";
    anchorDate: Dayjs;
    workLocationMap: Record<number, string>;
    sessionDisplayById: ReadonlyMap<number, SessionDisplay>;
    onSelectInterview: (interview: InterviewResponse) => void;
    onSelectEmptySlot?: (start: Dayjs) => void;
    startHour?: number;
    endHour?: number;
    slotMinutes?: number;
}

interface PositionedEvent {
    interview: InterviewResponse;
    start: Dayjs;
    end: Dayjs;
    startMin: number;
    endMin: number;
    col: number;
    cols: number;
}

/** Xếp chỗ các buổi phỏng vấn trong 1 ngày — buổi nào chồng giờ thì chia cột đứng cạnh nhau. */
function layoutDay(items: InterviewResponse[]): PositionedEvent[] {
    const events = items
        .map((interview) => {
            const start = dayjs(interview.scheduledAt);
            const end = start.add(interview.durationMinutes ?? 60, "minute");
            const startMin = start.hour() * 60 + start.minute();
            // Buổi vắt qua nửa đêm thì cắt ở cuối ngày để không phá layout.
            const rawEndMin = startMin + (interview.durationMinutes ?? 60);
            return { interview, start, end, startMin, endMin: Math.min(rawEndMin, 24 * 60) };
        })
        .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const positioned: PositionedEvent[] = [];
    let cluster: typeof events = [];
    let clusterEnd = -1;

    const flushCluster = () => {
        if (cluster.length === 0) return;
        const colEnds: number[] = [];
        const assigned = cluster.map((ev) => {
            let col = colEnds.findIndex((end) => end <= ev.startMin);
            if (col === -1) col = colEnds.length;
            colEnds[col] = ev.endMin;
            return { ...ev, col };
        });
        assigned.forEach((a) => positioned.push({ ...a, cols: colEnds.length }));
        cluster = [];
        clusterEnd = -1;
    };

    for (const ev of events) {
        if (cluster.length > 0 && ev.startMin >= clusterEnd) flushCluster();
        cluster.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.endMin);
    }
    flushCluster();

    return positioned;
}

export default function InterviewTimeGrid({
    interviews,
    mode,
    anchorDate,
    workLocationMap,
    sessionDisplayById,
    onSelectInterview,
    onSelectEmptySlot,
    startHour = 7,
    endHour = 20,
    slotMinutes = 30,
}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const days = useMemo(() => {
        if (mode === "day") return [anchorDate.startOf("day")];
        const weekStart = anchorDate.startOf("week");
        return Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
    }, [mode, anchorDate]);

    const hours = useMemo(
        () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
        [startHour, endHour],
    );

    const eventsByDay = useMemo(
        () =>
            days.map((day) =>
                layoutDay(
                    interviews.filter(
                        (iv) => dayjs(iv.scheduledAt).format("YYYY-MM-DD") === day.format("YYYY-MM-DD"),
                    ),
                ),
            ),
        [days, interviews],
    );

    const gridHeight = (endHour - startHour) * HOUR_HEIGHT;
    const slotsPerHour = 60 / slotMinutes;
    const slotHeight = HOUR_HEIGHT / slotsPerHour;
    const totalSlots = (endHour - startHour) * slotsPerHour;

    const now = dayjs();
    const nowMin = now.hour() * 60 + now.minute();
    const nowVisible = nowMin >= startHour * 60 && nowMin <= endHour * 60;
    const nowTop = ((nowMin - startHour * 60) / 60) * HOUR_HEIGHT;

    // Cuộn tới quanh giờ hiện tại (hoặc 8h) để không phải cuộn tay mỗi lần mở.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const focusMin = nowVisible ? nowMin - 60 : 8 * 60;
        el.scrollTop = Math.max(0, ((focusMin - startHour * 60) / 60) * HOUR_HEIGHT);
        // Chỉ canh 1 lần khi đổi chế độ/ngày neo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, anchorDate.format("YYYY-MM-DD")]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <style>{`
                .itg-slot { transition: background 0.12s ease; }
                .itg-slot:hover { background: rgba(14,122,95,0.06); cursor: pointer; }
                .itg-slot:hover::after {
                    content: "+";
                    position: absolute; left: 6px; top: 50%; transform: translateY(-50%);
                    font-size: 13px; font-weight: 700; color: ${COLORS.primary}; opacity: 0.75;
                }
                .itg-event { transition: filter 0.12s ease, box-shadow 0.12s ease; }
                .itg-event:hover { filter: brightness(0.97); box-shadow: 0 4px 10px rgba(16,24,40,0.12); }
            `}</style>

            {/* Hàng tiêu đề ngày — dính trên đầu khi cuộn */}
            <div
                style={{
                    display: "flex",
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: "#FFFFFF",
                    flexShrink: 0,
                }}
            >
                <div style={{ width: GUTTER_WIDTH, flexShrink: 0 }} />
                {days.map((day) => {
                    const isToday = day.isSame(dayjs(), "day");
                    const dayInterviews = interviews.filter(
                        (iv) => dayjs(iv.scheduledAt).format("YYYY-MM-DD") === day.format("YYYY-MM-DD"),
                    );
                    const count = dayInterviews.length;
                    const sessionCount = new Set(
                        dayInterviews.flatMap((interview) =>
                            interview.sessionId == null ? [] : [interview.sessionId],
                        ),
                    ).size;
                    return (
                        <div
                            key={day.format("YYYY-MM-DD")}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: "8px 6px",
                                textAlign: "center",
                                borderLeft: `1px solid ${COLORS.borderLight}`,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.3,
                                    color: isToday ? COLORS.primary : COLORS.textMuted,
                                }}
                            >
                                {VI_WEEKDAY_SHORT[day.day()]}
                            </div>
                            <div
                                style={{
                                    marginTop: 2,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    fontSize: 15,
                                    fontWeight: 700,
                                    background: isToday ? COLORS.primary : "transparent",
                                    color: isToday ? "#FFFFFF" : COLORS.textPrimary,
                                }}
                            >
                                {day.format("DD")}
                            </div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                                {count > 0
                                    ? `${count} buổi${sessionCount > 0 ? ` · ${sessionCount} lô` : ""}`
                                    : "—"}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lưới giờ */}
            <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#FFFFFF" }}>
                <div style={{ display: "flex", position: "relative", height: gridHeight }}>
                    {/* Cột giờ bên trái */}
                    <div style={{ width: GUTTER_WIDTH, flexShrink: 0, position: "relative" }}>
                        {hours.map((h, i) => (
                            <div
                                key={h}
                                style={{
                                    position: "absolute",
                                    top: i * HOUR_HEIGHT - 7,
                                    right: 8,
                                    fontSize: 11,
                                    color: COLORS.textMuted,
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {String(h).padStart(2, "0")}:00
                            </div>
                        ))}
                    </div>

                    {/* Các cột ngày */}
                    {days.map((day, dayIndex) => (
                        <div
                            key={day.format("YYYY-MM-DD")}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                position: "relative",
                                borderLeft: `1px solid ${COLORS.borderLight}`,
                                background: day.day() === 0 || day.day() === 6 ? "#FCFCFD" : "#FFFFFF",
                            }}
                        >
                            {/* Vạch kẻ giờ */}
                            {hours.map((h, i) => (
                                <div
                                    key={h}
                                    style={{
                                        position: "absolute",
                                        top: i * HOUR_HEIGHT,
                                        left: 0,
                                        right: 0,
                                        borderTop: `1px solid ${COLORS.borderLight}`,
                                    }}
                                />
                            ))}

                            {/* Lớp ô trống bấm được để tạo lịch nhanh */}
                            {onSelectEmptySlot &&
                                Array.from({ length: totalSlots }, (_, i) => {
                                    const minuteOffset = i * slotMinutes;
                                    const slotStart = day
                                        .startOf("day")
                                        .add(startHour * 60 + minuteOffset, "minute");
                                    return (
                                        <div
                                            key={i}
                                            className="itg-slot"
                                            style={{
                                                position: "absolute",
                                                top: i * slotHeight,
                                                left: 0,
                                                right: 0,
                                                height: slotHeight,
                                            }}
                                            onClick={() => onSelectEmptySlot(slotStart)}
                                            title={`Tạo lịch lúc ${slotStart.format("HH:mm DD/MM")}`}
                                        />
                                    );
                                })}

                            {/* Khối buổi phỏng vấn */}
                            {eventsByDay[dayIndex].map((ev) => {
                                const meta = interviewStatusMeta(ev.interview.status);
                                const top = ((ev.startMin - startHour * 60) / 60) * HOUR_HEIGHT;
                                const height = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_HEIGHT - 2, 20);
                                const widthPct = 100 / ev.cols;
                                const compact = height < 44;
                                const cancelled = ev.interview.status === "CANCELLED";
                                const session = ev.interview.sessionId == null
                                    ? undefined
                                    : sessionDisplayById.get(ev.interview.sessionId);
                                const locationText =
                                    ev.interview.format === "ONLINE"
                                        ? "Trực tuyến"
                                        : ev.interview.workLocationId
                                            ? workLocationMap[ev.interview.workLocationId] ?? "Trực tiếp"
                                            : "Trực tiếp";

                                return (
                                    <Tooltip
                                        key={ev.interview.id}
                                        title={`${ev.start.format("HH:mm")}–${ev.end.format("HH:mm")} · ${ev.interview.candidateName} · ${meta.label}${session && ev.interview.sessionId != null ? ` · Lô ${session.size} ứng viên, mã lô ${ev.interview.sessionId}` : ""}`}
                                    >
                                        <div
                                            className="itg-event"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectInterview(ev.interview);
                                            }}
                                            style={{
                                                position: "absolute",
                                                top,
                                                height,
                                                left: `calc(${ev.col * widthPct}% + 2px)`,
                                                width: `calc(${widthPct}% - 4px)`,
                                                background: meta.bg,
                                                border: `1px solid ${meta.border}`,
                                                borderLeft: `3px solid ${meta.accent}`,
                                                borderRight: session ? `3px solid ${session.accent}` : undefined,
                                                borderRadius: 6,
                                                padding: compact ? "1px 6px" : "4px 8px",
                                                overflow: "hidden",
                                                cursor: "pointer",
                                                opacity: cancelled ? 0.6 : 1,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: meta.accent,
                                                    fontVariantNumeric: "tabular-nums",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    minWidth: 0,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    {ev.start.format("HH:mm")}
                                                    {!compact && ` – ${ev.end.format("HH:mm")}`}
                                                    {compact && ` ${ev.interview.candidateName}`}
                                                </span>
                                                {session && (
                                                    <span
                                                        style={{
                                                            flexShrink: 0,
                                                            padding: "0 4px",
                                                            borderRadius: 999,
                                                            border: `1px solid ${session.accent}55`,
                                                            background: `${session.accent}14`,
                                                            color: session.accent,
                                                            fontSize: 9,
                                                            lineHeight: "14px",
                                                        }}
                                                    >
                                                        Lô {session.size}
                                                    </span>
                                                )}
                                            </div>

                                            {!compact && (
                                                <>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: COLORS.textPrimary,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            textDecoration: cancelled ? "line-through" : "none",
                                                        }}
                                                    >
                                                        {ev.interview.candidateName}
                                                    </div>
                                                    {height >= 62 && (
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color: COLORS.textMuted,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 4,
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                            }}
                                                        >
                                                            {ev.interview.format === "ONLINE" ? (
                                                                <VideoCameraOutlined />
                                                            ) : (
                                                                <EnvironmentOutlined />
                                                            )}
                                                            {locationText}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </Tooltip>
                                );
                            })}

                            {/* Vạch giờ hiện tại */}
                            {nowVisible && day.isSame(now, "day") && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: nowTop,
                                        left: 0,
                                        right: 0,
                                        height: 0,
                                        borderTop: `2px solid ${COLORS.error}`,
                                        zIndex: 5,
                                        pointerEvents: "none",
                                    }}
                                >
                                    <span
                                        style={{
                                            position: "absolute",
                                            left: -4,
                                            top: -4,
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: COLORS.error,
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
