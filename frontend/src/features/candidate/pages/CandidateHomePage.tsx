import { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import { CalendarOutlined, EnvironmentOutlined, VideoCameraOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getOpenPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { formatSalaryRange } from "../../../app/money";
import { relativeTime } from "../../../app/datetime";
import { InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";
import CandidateStageTag from "../components/CandidateStageTag";
import { todoOf, useCandidatePortal } from "../useCandidatePortal";

/**
 * C20 · Tổng quan (ứng viên): Việc cần làm · Phỏng vấn sắp tới · Đơn gần đây · Việc làm gợi ý.
 * "Việc làm gợi ý" = việc làm đang mở mà bạn chưa ứng tuyển, mới đăng trước (chưa có gợi ý theo hồ sơ).
 */
export default function CandidateHomePage() {
    const navigate = useNavigate();
    const fullName = useAppSelector((s) => s.auth.user?.fullName ?? "");
    const { loading, failed, applications, interviews, offers, slotsByApp, reload } = useCandidatePortal();
    const [jobs, setJobs] = useState<JobPostingResponse[] | null>(null);

    useEffect(() => {
        getOpenPostings().then((r) => setJobs(r.data)).catch(() => setJobs([]));
    }, []);

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;

    const firstName = fullName.trim().split(/\s+/).pop() ?? "";
    const todos = applications
        .map((a) => ({ app: a, todo: todoOf(a, interviews, offers, slotsByApp) }))
        .filter((x): x is { app: typeof x.app; todo: NonNullable<typeof x.todo> } => x.todo != null)
        .sort((a, b) => dayjs(a.todo.due ?? "2999-01-01").valueOf() - dayjs(b.todo.due ?? "2999-01-01").valueOf());
    const nextIv = interviews
        .filter((iv) => iv.status !== "CANCELLED" && iv.status !== "NO_SHOW" && dayjs(iv.scheduledAt).isAfter(dayjs()))
        .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf())[0];
    const nextIvApp = nextIv ? applications.find((a) => a.id === nextIv.applicationId) : undefined;
    const appliedJobIds = new Set(applications.map((a) => a.jobPostingId));
    const suggested = (jobs ?? []).filter((j) => !appliedJobIds.has(j.id))
        .sort((a, b) => dayjs(b.publishedAt ?? 0).valueOf() - dayjs(a.publishedAt ?? 0).valueOf()).slice(0, 4);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1080 }}>
            <ScreenTitle title={firstName ? `Chào ${firstName}` : "Tổng quan"} />
            {failed && (
                <InlineNotice tone="danger" action={<Button onClick={reload}>Thử lại</Button>}>
                    Không tải được đơn ứng tuyển. Kiểm tra kết nối mạng rồi thử lại.
                </InlineNotice>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 16, alignItems: "start" }}>
                <Panel title="Việc cần làm" bodyGap={0}>
                    {!failed && todos.length === 0 && (
                        <span style={{ color: COLORS.textSecondary }}>Bạn không có việc gì cần làm lúc này.</span>
                    )}
                    {todos.map(({ app, todo }, i) => (
                        <div key={app.id} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                            borderTop: i ? `0.5px solid ${COLORS.border}` : undefined,
                        }}>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <span style={{ fontWeight: 600 }}>{todo.text}</span>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{app.jobTitle}</span>
                            </div>
                            <Button type="primary" onClick={() => navigate(todo.to)}>{todo.actionLabel}</Button>
                        </div>
                    ))}
                </Panel>

                <Panel title="Phỏng vấn sắp tới">
                    {!nextIv ? (
                        <span style={{ color: COLORS.textSecondary }}>Chưa có lịch phỏng vấn nào.</span>
                    ) : (
                        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                            <div style={{
                                width: 56, flexShrink: 0, borderRadius: 14, background: COLORS.primarySoft, color: COLORS.primary,
                                display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0",
                            }}>
                                <span style={{ fontSize: 11 }}>TH {dayjs(nextIv.scheduledAt).format("MM")}</span>
                                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{dayjs(nextIv.scheduledAt).format("DD")}</span>
                            </div>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                                <span style={{ fontWeight: 600 }}>{nextIvApp?.jobTitle ?? "Phỏng vấn"}</span>
                                <span style={{ fontSize: 13, color: COLORS.textSecondary, display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    {nextIv.format === "ONLINE" ? <VideoCameraOutlined /> : <EnvironmentOutlined />}
                                    {dayjs(nextIv.scheduledAt).format("HH:mm")} – {dayjs(nextIv.scheduledAt).add(nextIv.durationMinutes ?? 60, "minute").format("HH:mm")}
                                    {" · "}{nextIv.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng"}
                                </span>
                            </div>
                        </div>
                    )}
                    {nextIv && (
                        nextIv.format === "ONLINE" && nextIv.meetingLink
                            ? <Button type="primary" href={nextIv.meetingLink} target="_blank" rel="noreferrer">Vào phòng họp</Button>
                            : <Button icon={<CalendarOutlined />} onClick={() => navigate("/my-interviews")}>Xem lịch phỏng vấn</Button>
                    )}
                </Panel>
            </div>

            <Panel title="Đơn gần đây" extra={<a onClick={() => navigate("/my-applications")}>Xem tất cả</a>} bodyGap={0}>
                {!failed && applications.length === 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ color: COLORS.textSecondary }}>Bạn chưa ứng tuyển vị trí nào.</span>
                        <Button onClick={() => navigate("/jobs")}>Tìm việc làm</Button>
                    </div>
                )}
                {applications.slice(0, 3).map((a, i) => (
                    <div key={a.id} className="row-clickable" onClick={() => navigate(`/my-applications/${a.id}`)} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", cursor: "pointer",
                        borderTop: i ? `0.5px solid ${COLORS.border}` : undefined,
                    }}>
                        <span style={{ fontWeight: 600 }}>{a.jobTitle}</span>
                        <CandidateStageTag app={a} />
                    </div>
                ))}
            </Panel>

            <Panel title="Việc làm gợi ý" extra={<a onClick={() => navigate("/jobs")}>Xem tất cả việc làm</a>}>
                {jobs == null ? <Spin size="small" /> : suggested.length === 0 ? (
                    <span style={{ color: COLORS.textSecondary }}>Chưa có việc làm mới.</span>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                        {suggested.map((j) => (
                            <div key={j.id} className="row-clickable" onClick={() => navigate(`/careers/jobs/${j.id}`)} style={{
                                display: "flex", flexDirection: "column", gap: 6, padding: 16, borderRadius: 16, cursor: "pointer",
                                boxShadow: `inset 0 0 0 1px ${COLORS.border}`,
                            }}>
                                {j.departmentName && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{j.departmentName}</span>}
                                <span style={{ fontWeight: 600 }}>{j.title}</span>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                    {[j.workLocationName, j.employmentTypeName].filter(Boolean).join(" · ")}
                                </span>
                                <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                    <b>{formatSalaryRange(j.salaryMin, j.salaryMax)}</b>
                                    <span style={{ color: COLORS.textMuted }}>{relativeTime(j.publishedAt)}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}
