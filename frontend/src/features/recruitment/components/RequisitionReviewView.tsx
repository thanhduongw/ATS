import { useEffect, useState, type ReactNode } from "react";
import { App, Button, Input, InputNumber } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { approveRequisition, getPostings, rejectRequisition, requestRequisitionChanges } from "../recruitmentApi";
import type { ApiMessageResponse, JobRequisitionResponse, RequisitionStatus } from "../types";
import type { RecruitmentCatalogs } from "../useRecruitmentCatalogs";
import { requisitionCode } from "../useRecruitmentCatalogs";
import { WORK_ARRANGEMENT_LABEL } from "../postingLabels";
import { PRIORITY_LABEL, REASON_LABEL } from "../requisitionOptions";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS, type StatusTone } from "../../../app/theme";
import { formatMoney, formatSalaryShort, moneyFormatter, moneyParser } from "../../../app/money";
import { fullDate } from "../../../app/datetime";
import dayjs from "dayjs";
import StatusTag from "../../../components/ui/StatusTag";
import { Avatar, Panel, SmallDialog } from "../../../components/ui/designKit";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import { departmentLabel } from "../../overview/useCompanyOverview";

/**
 * R03 · Chi tiết yêu cầu tuyển dụng (Chuyên viên tuyển dụng / Quản trị) theo docs/UI:
 * thẻ đầu (trạng thái, ưu tiên, mã, người yêu cầu, nút thao tác) + 2 cột (thông tin vị trí | ngân sách, góp ý, mốc).
 * R04 · Duyệt — chốt khung lương; R05 · Phản hồi — Yêu cầu sửa hoặc Từ chối (bắt buộc nội dung).
 * Nợ kỹ thuật: backend chưa lưu lịch sử từng bước nên khối "Lịch sử" chỉ có mốc tạo; HTML có "Ghi chú của đại
 * diện phòng ban" tách riêng nhưng dữ liệu chỉ có một trường "Giải thích thêm" (hiện dưới Lý do tuyển).
 */
const TONE: Record<RequisitionStatus, StatusTone> = {
    DRAFT: "neutral", PENDING_APPROVAL: "warning", APPROVED: "success", REJECTED: "danger", CHANGES_REQUESTED: "interview",
};
const LABEL: Record<RequisitionStatus, string> = {
    DRAFT: "Bản nháp", PENDING_APPROVAL: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Đã từ chối", CHANGES_REQUESTED: "Chờ phòng ban sửa",
};

type ApiError = AxiosError<ApiMessageResponse>;

function Field({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{value ?? "—"}</span>
        </div>
    );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 14, borderTop: `0.5px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
            {children}
        </div>
    );
}

const text = (v: string) => <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v}</div>;
const millions = (n: number | null | undefined) => (n == null ? null : `${Math.round(n / 1_000_000)} triệu`);

export default function RequisitionReviewView({ requisition: r, cat, onChanged }: {
    requisition: JobRequisitionResponse;
    cat: RecruitmentCatalogs;
    onChanged: () => void;
}) {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const me = useAppSelector((s) => s.auth.user);
    const [linkedPostingId, setLinkedPostingId] = useState<number | null>(null);
    const [dialog, setDialog] = useState<null | "approve" | "respond">(null);
    const [respondKind, setRespondKind] = useState<"changes" | "reject">("changes");
    const [min, setMin] = useState<number | null>(null);
    const [max, setMax] = useState<number | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (r.status !== "APPROVED") return;
        getPostings({ size: 1000 })
            .then((res) => setLinkedPostingId(res.data.content.find((p) => p.requisitionId === r.id)?.id ?? null))
            .catch(() => setLinkedPostingId(null));
    }, [r.id, r.status]);

    const role = me?.role as UserRole | undefined;
    const canAct = r.status === "PENDING_APPROVAL" && !!role && HR_ROLES.includes(role) && me?.userId === String(r.approverId);
    const skills = r.skillIds.map((id) => cat.skillMap[id]).filter(Boolean);
    const dept = cat.departmentMap[r.departmentId];

    const openApprove = () => { setMin(r.expectedSalaryMin); setMax(r.expectedSalaryMax); setNote(""); setDialog("approve"); };
    const openRespond = (kind: "changes" | "reject") => { setRespondKind(kind); setNote(""); setDialog("respond"); };

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try {
            await fn();
            message.success(ok);
            setDialog(null);
            onChanged();
        } catch (e) {
            message.error((e as ApiError).response?.data?.message ?? "Thao tác thất bại");
        } finally { setBusy(false); }
    };
    const approve = () => {
        if (min != null && max != null && min > max) { message.error("Mức lương tối thiểu không được lớn hơn mức tối đa"); return; }
        void run(() => approveRequisition(r.id, { approvedSalaryMin: min, approvedSalaryMax: max, note: note.trim() || null }),
            "Đã duyệt yêu cầu tuyển dụng");
    };
    const respond = () => void run(
        () => (respondKind === "changes" ? requestRequisitionChanges(r.id, { note: note.trim() }) : rejectRequisition(r.id, { reason: note.trim() })),
        respondKind === "changes" ? "Đã gửi yêu cầu sửa cho phòng ban" : "Đã từ chối yêu cầu tuyển dụng");

    const proposedMax = r.expectedSalaryMax;
    const maxBelowProposal = max != null && proposedMax != null && max < proposedMax;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1180 }}>
            <PageBreadcrumb crumb={r.title} />

            <Panel bodyGap={8}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13, color: COLORS.textSecondary }}>
                            <StatusTag tone={TONE[r.status]} label={LABEL[r.status]} />
                            {(r.priority === "HIGH" || r.priority === "URGENT") && (
                                <StatusTag tone="danger" label={`Ưu tiên ${PRIORITY_LABEL[r.priority].toLowerCase()}`} />
                            )}
                            <span>{requisitionCode(r.id)} · tạo lúc {dayjs(r.createdAt).format("HH:mm, DD/MM/YYYY")}</span>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>{r.title}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textSecondary }}>
                            <Avatar name={r.requesterName} colorKey={r.requesterId} size={22} />
                            {r.requesterName}{dept ? ` · ${departmentLabel(dept)}` : ""}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {canAct && (<>
                            <Button onClick={() => openRespond("changes")}>Yêu cầu sửa</Button>
                            <Button danger onClick={() => openRespond("reject")}>Từ chối</Button>
                            <Button type="primary" icon={<CheckOutlined />} onClick={openApprove}>Duyệt</Button>
                        </>)}
                        {r.status === "APPROVED" && (linkedPostingId
                            ? <Button onClick={() => navigate(`/recruitment/postings/${linkedPostingId}`)}>Xem việc làm</Button>
                            : <Button type="primary" onClick={() => navigate(`/recruitment/postings/new?requisitionId=${r.id}`)}>Tạo việc làm</Button>)}
                    </div>
                </div>
            </Panel>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16, alignItems: "start" }}>
                <Panel title="Thông tin vị trí" bodyGap={14}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px 16px" }}>
                        <Field label="Chức danh" value={cat.jobTitleMap[r.jobTitleId]} />
                        <Field label="Cấp bậc" value={r.jobLevelId != null ? cat.jobLevelMap[r.jobLevelId] : null} />
                        <Field label="Số lượng" value={`${r.quantity} người`} />
                        <Field label="Loại hình" value={r.employmentTypeId != null ? cat.employmentTypeMap[r.employmentTypeId] : null} />
                        <Field label="Hình thức" value={r.workArrangement ? WORK_ARRANGEMENT_LABEL[r.workArrangement] : null} />
                        <Field label="Địa điểm" value={r.workLocationId != null ? cat.workLocationMap[r.workLocationId] : null} />
                        <Field label="Kinh nghiệm" value={r.experienceRequired || null} />
                        <Field label="Ngày bắt đầu mong muốn" value={r.expectedStartDate ? fullDate(r.expectedStartDate) : null} />
                    </div>
                    {(r.reason || r.note) && (
                        <Block title="Lý do tuyển">
                            {r.reason && <span style={{ alignSelf: "flex-start" }}><StatusTag tone="interview" label={REASON_LABEL[r.reason]} /></span>}
                            {r.note && text(r.note)}
                        </Block>
                    )}
                    {skills.length > 0 && (
                        <Block title="Kỹ năng yêu cầu">
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {skills.map((s) => (
                                    <span key={s} style={{ padding: "3px 10px", borderRadius: 12, background: COLORS.primarySoft, color: COLORS.primary, fontSize: 12 }}>{s}</span>
                                ))}
                            </div>
                        </Block>
                    )}
                    {r.description && <Block title="Mô tả công việc">{text(r.description)}</Block>}
                    {r.requirements && <Block title="Yêu cầu">{text(r.requirements)}</Block>}
                    {r.benefits && <Block title="Quyền lợi">{text(r.benefits)}</Block>}
                </Panel>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Panel title="Ngân sách" bodyGap={12}>
                        <Field label="Lương đề xuất / người" value={formatSalaryShort(r.expectedSalaryMin, r.expectedSalaryMax)} />
                        <Field label="Ngân sách tối đa / tháng" value={millions(r.budget)} />
                        {r.status === "APPROVED"
                            ? <Field label="Lương đã duyệt" value={<span style={{ color: COLORS.success }}>{formatSalaryShort(r.approvedSalaryMin, r.approvedSalaryMax)}</span>} />
                            : <Field label="Người duyệt" value={r.approverName || "Chuyên viên tuyển dụng hoặc quản trị viên"} />}
                    </Panel>
                    {r.status === "CHANGES_REQUESTED" && r.hrNote && (
                        <Panel title="Đã yêu cầu phòng ban sửa" bodyGap={6}>{text(`“${r.hrNote}”`)}</Panel>
                    )}
                    {r.status === "REJECTED" && r.rejectReason && (
                        <Panel title="Lý do từ chối" bodyGap={6}>{text(r.rejectReason)}</Panel>
                    )}
                    {r.status === "APPROVED" && r.hrNote && (
                        <Panel title="Ghi chú khi duyệt" bodyGap={6}>{text(r.hrNote)}</Panel>
                    )}
                    <Panel title="Lịch sử" bodyGap={8}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                            <Avatar name={r.requesterName} colorKey={r.requesterId} size={22} />
                            <span>{r.requesterName} tạo yêu cầu · {dayjs(r.createdAt).format("DD/MM HH:mm")}</span>
                        </span>
                    </Panel>
                </div>
            </div>

            <SmallDialog open={dialog === "approve"} title="Duyệt yêu cầu tuyển dụng" subtitle={`${r.title} · ${r.quantity} người`}
                okText="Duyệt" okLoading={busy} onCancel={() => setDialog(null)} onOk={approve} width={480}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: COLORS.textSecondary }}>
                        Lương duyệt từ (đồng)
                        <InputNumber value={min ?? undefined} onChange={(v) => setMin(v ?? null)} min={0} style={{ width: "100%" }}
                            formatter={moneyFormatter} parser={moneyParser} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: COLORS.textSecondary }}>
                        đến (đồng)
                        <InputNumber value={max ?? undefined} onChange={(v) => setMax(v ?? null)} min={0} style={{ width: "100%" }}
                            formatter={moneyFormatter} parser={moneyParser} />
                    </label>
                </div>
                {maxBelowProposal && (
                    <span style={{ fontSize: 12, color: COLORS.warning }}>
                        Mức tối đa thấp hơn đề xuất của đại diện phòng ban ({formatMoney(proposedMax)} đ)
                    </span>
                )}
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: COLORS.textSecondary, marginTop: 8 }}>
                    Ghi chú của chuyên viên tuyển dụng
                    <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} autoSize={{ minRows: 2, maxRows: 5 }}
                        placeholder="Căn cứ chốt khung lương…" />
                </label>
            </SmallDialog>

            <SmallDialog open={dialog === "respond"} title="Phản hồi yêu cầu tuyển dụng" subtitle={`Gửi lại cho ${r.requesterName}`}
                okText={respondKind === "reject" ? "Từ chối" : "Gửi"} danger={respondKind === "reject"} okLoading={busy}
                okDisabled={!note.trim()} onCancel={() => setDialog(null)} onOk={respond} width={480}>
                <div style={{ display: "flex", gap: 8 }}>
                    {(["changes", "reject"] as const).map((k) => (
                        <Button key={k} type={respondKind === k ? "primary" : "default"} danger={k === "reject" && respondKind === k}
                            style={{ flex: 1 }} onClick={() => setRespondKind(k)}>
                            {k === "changes" ? "Yêu cầu sửa" : "Từ chối"}
                        </Button>
                    ))}
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: COLORS.textSecondary, marginTop: 8 }}>
                    <span>{respondKind === "changes" ? "Nội dung cần sửa" : "Lý do từ chối"} <span style={{ color: COLORS.error }}>*</span></span>
                    <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} autoSize={{ minRows: 3, maxRows: 6 }} maxLength={1000}
                        placeholder={respondKind === "changes" ? "Phòng ban cần bổ sung / làm rõ điều gì…" : "Vì sao không tuyển vị trí này…"} />
                </label>
            </SmallDialog>
        </div>
    );
}
