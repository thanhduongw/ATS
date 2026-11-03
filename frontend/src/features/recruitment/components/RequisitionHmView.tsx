import { useEffect, useState, type ReactNode } from "react";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getPostings } from "../recruitmentApi";
import { getApplications } from "../../candidate/applicationApi";
import type { ApplicationResponse } from "../../candidate/types";
import type { JobPostingResponse, JobRequisitionResponse, RequisitionStatus } from "../types";
import type { RecruitmentCatalogs } from "../useRecruitmentCatalogs";
import { requisitionCode } from "../useRecruitmentCatalogs";
import { WORK_ARRANGEMENT_LABEL } from "../postingLabels";
import { PRIORITY_LABEL, REASON_LABEL } from "../requisitionOptions";
import { COLORS, FIXED_STAGES, STAGE_COLORS, type FixedStage, type StatusTone } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { formatSalaryShort } from "../../../app/money";
import { fullDate } from "../../../app/datetime";
import StatusTag from "../../../components/ui/StatusTag";
import { InlineNotice, Panel } from "../../../components/ui/designKit";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";

/**
 * H06 · H07 — chi tiết yêu cầu tuyển dụng nhìn từ Đại diện phòng ban.
 * - Cần sửa (H06): trích lời góp ý của Chuyên viên tuyển dụng, nút "Sửa và gửi lại".
 * - Đã duyệt (H07): lương duyệt so với đề xuất, tiến độ tuyển (đã tuyển / ứng viên / số theo giai đoạn).
 * Backend chưa lưu lịch sử từng bước của yêu cầu nên chưa có khối "Lịch sử" như HTML.
 */
const TONE: Record<RequisitionStatus, StatusTone> = {
    DRAFT: "neutral", PENDING_APPROVAL: "warning", APPROVED: "success", REJECTED: "danger", CHANGES_REQUESTED: "interview",
};
const LABEL: Record<RequisitionStatus, string> = {
    DRAFT: "Bản nháp", PENDING_APPROVAL: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối", CHANGES_REQUESTED: "Cần sửa",
};
const MAIN: FixedStage[] = FIXED_STAGES.filter((s) => s !== "REJECTED");

function Field({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontSize: 14, color: COLORS.textPrimary }}>{value ?? "—"}</span>
        </div>
    );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
    if (!text?.trim()) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", color: COLORS.textPrimary }}>{text}</div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 110 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>{value}</span>
        </div>
    );
}

export default function RequisitionHmView({ requisition: r, cat }: { requisition: JobRequisitionResponse; cat: RecruitmentCatalogs }) {
    const navigate = useNavigate();
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [apps, setApps] = useState<ApplicationResponse[]>([]);

    useEffect(() => {
        if (r.status !== "APPROVED") return;
        let cancelled = false;
        (async () => {
            const p = (await getPostings({ size: 1000 })).data.content.filter((x) => x.requisitionId === r.id);
            const lists = await Promise.all(p.map((x) => getApplications({ jobPostingId: x.id, size: 2000 })));
            if (cancelled) return;
            setPostings(p);
            setApps(lists.flatMap((l) => l.data.content));
        })().catch(() => undefined);
        return () => { cancelled = true; };
    }, [r.id, r.status]);

    const counts: Partial<Record<FixedStage, number>> = {};
    apps.forEach((a) => { const s = toFixedStage(a.currentStageType); counts[s] = (counts[s] ?? 0) + 1; });
    const hired = counts.HIRED ?? 0;
    const proposed = formatSalaryShort(r.expectedSalaryMin, r.expectedSalaryMax);
    const edit = () => navigate(`/recruitment/requisitions/${r.id}/edit`);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1080 }}>
            <div>
                <PageBreadcrumb crumb={requisitionCode(r.id)} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>{r.title}</span>
                    <StatusTag tone={TONE[r.status]} label={LABEL[r.status]} />
                </div>
            </div>

            {r.status === "CHANGES_REQUESTED" && (
                <Panel
                    title={`${r.approverName} yêu cầu sửa`}
                    extra={<Button type="primary" icon={<EditOutlined />} onClick={edit}>Sửa và gửi lại</Button>}
                    style={{ background: STAGE_COLORS.INTERVIEW.bg }}
                >
                    {r.hrNote && <span style={{ fontSize: 15, lineHeight: 1.6 }}>“{r.hrNote}”</span>}
                </Panel>
            )}
            {r.status === "DRAFT" && (
                <InlineNotice action={<Button type="primary" onClick={edit}>Hoàn thiện và gửi</Button>}>
                    Bản nháp — chưa gửi cho Chuyên viên tuyển dụng.
                </InlineNotice>
            )}
            {r.status === "PENDING_APPROVAL" && (
                <InlineNotice tone="warning">Đang chờ {r.approverName} duyệt.</InlineNotice>
            )}
            {r.status === "REJECTED" && (
                <InlineNotice tone="danger">
                    {r.approverName} đã từ chối yêu cầu{r.rejectReason ? `: “${r.rejectReason}”` : "."}
                </InlineNotice>
            )}

            {r.status === "APPROVED" && (
                <>
                    <InlineNotice tone="success">
                        Đã duyệt bởi {r.approverName}
                        {(r.approvedSalaryMin != null || r.approvedSalaryMax != null) && (
                            <> · Lương duyệt <b>{formatSalaryShort(r.approvedSalaryMin, r.approvedSalaryMax)}</b> (bạn đề xuất {proposed})</>
                        )}
                    </InlineNotice>
                    <Panel
                        title="Tiến độ tuyển"
                        extra={postings.length > 0 && (
                            <Button onClick={() => navigate(`/applications?jobPostingId=${postings[0].id}`)}>Xem ứng viên</Button>
                        )}
                        bodyGap={16}
                    >
                        {postings.length === 0 ? (
                            <span style={{ color: COLORS.textSecondary }}>Chuyên viên tuyển dụng chưa tạo việc làm từ yêu cầu này.</span>
                        ) : (
                            <>
                                <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                                    <Metric label="Đã tuyển" value={<>{hired} <span style={{ fontSize: 14, fontWeight: 400, color: COLORS.textSecondary }}>/ {r.quantity} người</span></>} />
                                    <Metric label="Ứng viên" value={apps.length} />
                                    <Metric label="Đang phỏng vấn" value={counts.INTERVIEW ?? 0} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAIN.length}, minmax(0, 1fr))`, gap: 8 }}>
                                    {MAIN.map((s) => (
                                        <div key={s} style={{ padding: "10px 12px", borderRadius: 12, background: STAGE_COLORS[s].bg }}>
                                            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{FIXED_STAGE_LABEL[s]}</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: STAGE_COLORS[s].color }}>{counts[s] ?? 0}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Panel>
                </>
            )}

            <Panel title="Thông tin vị trí" bodyGap={16}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
                    <Field label="Chức danh" value={cat.jobTitleMap[r.jobTitleId]} />
                    <Field label="Cấp bậc" value={r.jobLevelId != null ? cat.jobLevelMap[r.jobLevelId] : null} />
                    <Field label="Số lượng" value={`${r.quantity} người`} />
                    <Field label="Phòng ban" value={cat.departmentMap[r.departmentId]} />
                    <Field label="Hình thức" value={r.workArrangement ? WORK_ARRANGEMENT_LABEL[r.workArrangement] : null} />
                    <Field label="Loại hình" value={r.employmentTypeId != null ? cat.employmentTypeMap[r.employmentTypeId] : null} />
                    <Field label="Địa điểm" value={r.workLocationId != null ? cat.workLocationMap[r.workLocationId] : null} />
                    <Field label="Kinh nghiệm" value={r.experienceRequired || null} />
                    <Field label="Lý do" value={r.reason ? REASON_LABEL[r.reason] : null} />
                    <Field label="Độ ưu tiên" value={r.priority ? PRIORITY_LABEL[r.priority] : null} />
                    <Field label="Ngày bắt đầu" value={r.expectedStartDate ? fullDate(r.expectedStartDate) : null} />
                    <Field label="Lương đề xuất" value={proposed} />
                </div>
                {r.skillIds.length > 0 && (
                    <Field label="Kỹ năng yêu cầu" value={r.skillIds.map((id) => cat.skillMap[id]).filter(Boolean).join(", ")} />
                )}
                <TextBlock title="Giải thích thêm" text={r.note} />
                <TextBlock title="Mô tả công việc" text={r.description} />
                <TextBlock title="Yêu cầu" text={r.requirements} />
                <TextBlock title="Quyền lợi" text={r.benefits} />
            </Panel>

            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                {requisitionCode(r.id)} · tạo ngày {fullDate(r.createdAt)} · người duyệt {r.approverName}
            </span>
        </div>
    );
}
