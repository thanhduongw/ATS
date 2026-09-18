import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Card, Segmented, Select, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getInterviews } from "../interviewApi";
import { getApplications } from "../../candidate/applicationApi";
import type { ApplicationResponse } from "../../candidate/types";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { INTERVIEW_HELD, type ApiMessageResponse, type InterviewResponse } from "../types";
import MyEvaluationsList from "../components/MyEvaluationsList";
import { evaluationDueAt } from "../evaluationDeadline";
import { useAppSelector } from "../../../app/hooks";
import { useTrailNavigate } from "../../../app/useNavTrail";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import { listCardStyle, listCardBodyStyle, listPagination } from "../../../components/ui/listStyles";
import { useTableScrollY } from "../../../app/useTableScrollY";

/**
 * Hai goc nhin tren cung mot du lieu:
 * - Nguoi phong van: nhung buoi CHINH MINH con no danh gia.
 * - HR: buoi nao con thieu danh gia va thieu cua ai, de biet can nhac ai.
 */
export default function EvaluationsPage() {
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    return (
        <div className="page-shell animate-fade-in">
            <PageBreadcrumb className="page-shell-fixed" />
            <Card className="table-card-fill" style={listCardStyle} styles={{ body: listCardBodyStyle }}>
                {isHr ? <HrEvaluationTracking /> : <MyEvaluationsList />}
            </Card>
        </div>
    );
}

type TrackingRow = {
    interview: InterviewResponse;
    application: ApplicationResponse | null;
    submitted: number;
    total: number;
    missing: string[];
};

function HrEvaluationTracking() {
    const { message } = App.useApp();
    const openApplication = useTrailNavigate();
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [applicationById, setApplicationById] = useState<Map<number, ApplicationResponse>>(new Map());
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<"pending" | "done">("pending");

    // Loc tuy chon: day la hang doi cong viec nen mac dinh phai thay het,
    // nhung van di theo thu tu phong ban -> tin tuyen dung khi can thu hep.
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [jobPostingId, setJobPostingId] = useState<number | null>(null);

    const { wrapRef, scrollY } = useTableScrollY([loading, interviews.length, mode]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Buoi phong van khong mang san phong ban va tin tuyen dung — phai tra qua ho so.
            const [res, appRes, deptRes, postRes] = await Promise.all([
                getInterviews(),
                getApplications({ size: 1000 }),
                getCatalogItems("/masterdata/departments"),
                getPostings({ size: 1000 }),
            ]);
            setInterviews(res.data);
            setApplicationById(new Map(appRes.data.content.map((a) => [a.id, a])));
            setDepartments(deptRes.data);
            setPostings(postRes.data.content);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được danh sách phỏng vấn");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        load();
    }, [load]);

    const rows = useMemo<TrackingRow[]>(() => {
        const built = interviews
            // Buổi đang chờ đánh giá hoặc đã hoàn tất đều cần xuất hiện trong bảng theo dõi.
            .filter((iv) =>
                (INTERVIEW_HELD.has(iv.status) || iv.status === "COMPLETED")
                && iv.interviewers.length > 0,
            )
            .map((iv) => ({
                interview: iv,
                application: applicationById.get(iv.applicationId) ?? null,
                submitted: iv.interviewers.filter((i) => i.evaluationSubmitted).length,
                total: iv.interviewers.length,
                missing: iv.interviewers.filter((i) => !i.evaluationSubmitted).map((i) => i.fullName),
            }));

        const filtered = built
            .filter((r) => (mode === "pending" ? r.missing.length > 0 : r.missing.length === 0))
            .filter((r) => departmentId == null || r.application?.departmentId === departmentId)
            .filter((r) => jobPostingId == null || r.application?.jobPostingId === jobPostingId);
        // Buoi da phong van lau ma chua cham thi day len dau — do la cho dang ket.
        return filtered.sort(
            (a, b) => dayjs(a.interview.scheduledAt).valueOf() - dayjs(b.interview.scheduledAt).valueOf(),
        );
    }, [interviews, applicationById, mode, departmentId, jobPostingId]);

    const pendingCount = useMemo(
        () => interviews.filter(
            (iv) => INTERVIEW_HELD.has(iv.status)
                && iv.interviewers.length > 0
                && iv.interviewers.some((i) => !i.evaluationSubmitted),
        ).length,
        [interviews],
    );

    const columns: ColumnsType<TrackingRow> = [
        {
            title: "Ứng viên",
            key: "candidate",
            width: 200,
            ellipsis: true,
            render: (_, r) => <span style={{ fontWeight: 600 }}>{r.interview.candidateName}</span>,
        },
        {
            title: "Vị trí ứng tuyển",
            responsive: ["lg"],
            key: "position",
            width: 200,
            ellipsis: true,
            render: (_, r) => r.application?.jobTitle
                ?? <span style={{ color: COLORS.textMuted }}>—</span>,
        },
        {
            title: "Thời gian phỏng vấn",
            key: "scheduledAt",
            width: 180,
            render: (_, r) => {
                const at = dayjs(r.interview.scheduledAt);
                const due = evaluationDueAt(r.interview.scheduledAt);
                const overdue = r.missing.length > 0 && due.isBefore(dayjs());
                return (
                    <div className="cell-stack">
                        <div>{at.format("HH:mm DD/MM/YYYY")}</div>
                        <div
                            className="cell-stack-sub"
                            style={r.missing.length > 0 ? { color: overdue ? "#B91C1C" : "#B45309" } : undefined}
                        >
                            {r.missing.length === 0
                                ? ""
                                : overdue
                                    ? `Quá hạn nộp ${due.fromNow(true)}`
                                    : `Hạn nộp ${due.format("HH:mm DD/MM")}`}
                        </div>
                    </div>
                );
            },
        },
        {
            title: "Tiến độ đánh giá",
            key: "progress",
            width: 130,
            render: (_, r) => (
                <Tag color={r.missing.length === 0 ? "success" : "warning"} style={{ margin: 0 }}>
                    {r.submitted}/{r.total} đã nộp
                </Tag>
            ),
        },
        {
            title: "Còn thiếu của",
            responsive: ["md"],
            key: "missing",
            ellipsis: true,
            render: (_, r) => (r.missing.length === 0
                ? <span style={{ color: COLORS.textMuted }}>—</span>
                : (
                    <Tooltip title={r.missing.join(", ")}>
                        <span>{r.missing.join(", ")}</span>
                    </Tooltip>
                )),
        },
    ];

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ marginBottom: 14, flexShrink: 0 }}>
                <Segmented
                    value={mode}
                    onChange={(v) => setMode(v as "pending" | "done")}
                    options={[
                        {
                            label: `Chờ đánh giá${pendingCount ? ` (${pendingCount})` : ""}`,
                            value: "pending",
                            icon: <ClockCircleOutlined />,
                        },
                        { label: "Đã đủ đánh giá", value: "done", icon: <CheckCircleOutlined /> },
                    ]}
                />
                <Space wrap style={{ marginLeft: 12 }}>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{ minWidth: 190 }}
                        placeholder="Tất cả phòng ban"
                        value={departmentId ?? undefined}
                        onChange={(v) => {
                            setDepartmentId(v ?? null);
                            // Tin dang chon co the thuoc phong ban khac nen phai bo di.
                            setJobPostingId(null);
                        }}
                        options={departments.map((d) => ({ value: d.id, label: String(d.name) }))}
                    />
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{ minWidth: 240 }}
                        disabled={departmentId == null}
                        placeholder={departmentId == null ? "Chọn phòng ban trước" : "Tất cả tin tuyển dụng"}
                        value={jobPostingId ?? undefined}
                        onChange={(v) => setJobPostingId(v ?? null)}
                        notFoundContent="Phòng ban này chưa có tin tuyển dụng"
                        options={postings
                            .filter((p) => p.departmentId === departmentId)
                            .map((p) => ({ value: p.id, label: p.title }))}
                    />
                </Space>

                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>
                    Bấm một dòng để mở thẳng tab Đánh giá trong hồ sơ ứng viên.
                </div>
            </div>

            <div ref={wrapRef} className="table-scroll-wrap">
                <Table
                    rowKey={(r) => r.interview.id}
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={rows}
                    sticky
                    scroll={{ y: scrollY }}
                    onRow={(r) => ({
                        onClick: () => {
                            if (r.interview.candidateId == null) return;
                            openApplication(
                                `/candidates/${r.interview.candidateId}`
                                + `/applications/${r.interview.applicationId}?tab=evaluation`,
                            );
                        },
                        style: { cursor: r.interview.candidateId != null ? "pointer" : "default" },
                    })}
                    pagination={{ pageSize: 10, ...listPagination("buổi phỏng vấn") }}
                    locale={{
                        emptyText: loading ? <span /> : (
                            <EmptyState
                                title={mode === "pending" ? "Không còn buổi nào chờ đánh giá" : "Chưa có buổi nào đủ đánh giá"}
                                description={mode === "pending"
                                    ? "Mọi buổi phỏng vấn đã có đủ đánh giá của người phỏng vấn."
                                    : "Các buổi đã đủ đánh giá sẽ hiện ở đây."}
                            />
                        ),
                    }}
                />
            </div>
        </div>
    );
}
