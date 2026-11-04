import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Spin } from "antd";
import { CheckCircleFilled, DownloadOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { approveOffer, deleteOffer, getOfferById, getOfferPdf, getOffers, sendOffer } from "../offerApi";
import OfferRejectModal from "../components/OfferRejectModal";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { getApplicationById } from "../../candidate/applicationApi";
import { getPostingById, getRequisitionById } from "../../recruitment/recruitmentApi";
import { getApplicationEvaluations } from "../../interview/interviewApi";
import type { EvaluationResponse, RecommendationType } from "../../interview/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getPublicCompany } from "../../public/publicApi";
import { salaryText } from "../../public/jobFormat";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS, type StatusTone } from "../../../app/theme";
import { formatMoney } from "../../../app/money";
import { InlineNotice, Panel, ScreenTitle, SmallDialog } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import OfferLetterPreview from "../components/OfferLetterPreview";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";

/**
 * R26 · Chi tiết thư mời — bản nháp: điều khoản, "Kiểm tra trước khi gửi" (trong khung lương duyệt, còn suất,
 * đã có đánh giá phỏng vấn) và "Xem trước thư mời". R27 · Xác nhận gửi: nhắc lại các mục kiểm tra.
 * Thư mời đã gửi / đã phản hồi / hết hạn dùng cùng trang (không còn nút sửa).
 */
const STATUS_VIEW: Record<string, { label: string; tone: StatusTone }> = {
    DRAFT: { label: "Bản nháp", tone: "neutral" },
    PENDING_APPROVAL: { label: "Chờ duyệt", tone: "warning" },
    APPROVED: { label: "Đã gửi", tone: "brand" },
    REJECTED: { label: "Không duyệt", tone: "danger" },
    ACCEPTED: { label: "Ứng viên nhận", tone: "success" },
    DECLINED: { label: "Ứng viên từ chối", tone: "danger" },
    EXPIRED: { label: "Hết hạn", tone: "neutral" },
};
const REC_LABEL: Record<RecommendationType, string> = {
    STRONG_YES: "Rất nên tuyển", YES: "Nên tuyển", NO: "Không nên tuyển", STRONG_NO: "Không tuyển",
};
const PAY: Record<string, string> = { MONTHLY: "/tháng", YEARLY: "/năm" };
const d = (v?: string | null) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");

interface Check { ok: boolean; text: string }

export default function OfferDetailPage() {
    const { id } = useParams();
    const offerId = Number(id);
    const navigate = useNavigate();
    const { message } = App.useApp();
    const user = useAppSelector((s) => s.auth.user);
    const role = user?.role as UserRole | undefined;
    const userId = user?.userId != null ? Number(user.userId) : undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    const [offer, setOffer] = useState<OfferResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);
    const [dialog, setDialog] = useState<null | "send" | "delete" | "reject">(null);
    const [checks, setChecks] = useState<Check[] | null>(null);
    const [company, setCompany] = useState("");
    const [location, setLocation] = useState("");
    const [deptName, setDeptName] = useState("");

    const load = useCallback(async () => {
        try {
            const res = await getOfferById(offerId);
            const o = res.data;
            setOffer(o);
            getPublicCompany().then((r) => setCompany(r.data.name)).catch(() => undefined);
            if (o.workLocationId) {
                getCatalogItems("/masterdata/work-locations")
                    .then((r) => setLocation(String(r.data.find((x) => x.id === o.workLocationId)?.name ?? ""))).catch(() => undefined);
            }
            void buildChecks(o).then(setChecks).catch(() => setChecks([]));
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không tải được thư mời");
            navigate("/offers");
        } finally { setLoading(false); }

        // Kiểm tra trước khi gửi: khung lương của yêu cầu đã duyệt, suất còn lại của việc làm, đánh giá phỏng vấn.
        async function buildChecks(o: OfferResponse): Promise<Check[]> {
            const app = (await getApplicationById(o.applicationId)).data;
            setDeptName(app.departmentName ?? "");
            const posting = (await getPostingById(app.jobPostingId)).data;
            const [req, offers, evals] = await Promise.all([
                getRequisitionById(posting.requisitionId).then((r) => r.data).catch(() => null),
                getOffers({ jobPostingId: app.jobPostingId, size: 1000 }).then((r) => r.data.content).catch(() => [] as OfferResponse[]),
                getApplicationEvaluations(o.applicationId).then((r) => r.data).catch(() => [] as EvaluationResponse[]),
            ]);
            const list: Check[] = [];
            const min = req?.approvedSalaryMin ?? req?.expectedSalaryMin ?? null;
            const max = req?.approvedSalaryMax ?? req?.expectedSalaryMax ?? null;
            if (min != null || max != null) {
                const inRange = (min == null || o.salaryOffered >= min) && (max == null || o.salaryOffered <= max);
                list.push({ ok: inRange, text: inRange ? `Trong khung lương đã duyệt (${salaryText(min, max)})` : `Ngoài khung lương đã duyệt (${salaryText(min, max)})` });
            }
            if (posting.headcount) {
                const taken = offers.filter((x) => x.id !== o.id && ["ACCEPTED", "APPROVED", "PENDING_APPROVAL"].includes(x.status)).length;
                const left = posting.headcount - taken;
                list.push({ ok: left > 0, text: left > 0 ? `Còn ${left}/${posting.headcount} suất tuyển` : `Đã hết suất tuyển (${posting.headcount}/${posting.headcount})` });
            }
            const submitted = evals.filter((e) => e.submittedAt && e.overallRecommendation);
            const best = submitted.map((e) => e.overallRecommendation!).sort((a, b) => Object.keys(REC_LABEL).indexOf(a) - Object.keys(REC_LABEL).indexOf(b))[0];
            list.push(submitted.length
                ? { ok: best === "STRONG_YES" || best === "YES", text: `Đã có đánh giá phỏng vấn: ${REC_LABEL[best]}${submitted.length > 1 ? ` (${submitted.length} phiếu)` : ""}` }
                : { ok: false, text: "Chưa có đánh giá phỏng vấn nào" });
            return list;
        }
    }, [offerId, message, navigate]);

    useEffect(() => { void load(); }, [load]);

    if (loading || !offer) return <div style={{ display: "flex", justifyContent: "center", padding: 64 }}><Spin /></div>;

    const st = STATUS_VIEW[offer.status] ?? { label: offer.status, tone: "neutral" as StatusTone };
    const isOwner = userId != null && offer.requesterId === userId;
    const isDraft = offer.status === "DRAFT";
    const canEdit = isHr && isOwner && isDraft;
    const canSend = isHr && isDraft;
    const canApprove = isHr && offer.approverId === userId && offer.status === "PENDING_APPROVAL";
    const canDelete = isHr && (isDraft || offer.status === "REJECTED");
    const pay = PAY[offer.payFrequency ?? "MONTHLY"] ?? "";
    const failing = (checks ?? []).filter((c) => !c.ok);

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setActing(true);
        try {
            await fn();
            message.success(ok);
            setDialog(null);
            await load();
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Thao tác thất bại");
        } finally { setActing(false); }
    };

    const downloadPdf = async () => {
        try {
            const res = await getOfferPdf(offer.id);
            saveAs(res.data, `thu-moi-${offer.candidateName}.pdf`);
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không tải được file PDF");
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1180 }}>
            <div>
                <PageBreadcrumb crumb={offer.candidateName} />
                <ScreenTitle
                    title="Chi tiết thư mời"
                    actions={<>
                        <Button icon={<DownloadOutlined />} onClick={downloadPdf}>Tải PDF</Button>
                        {canDelete && <Button danger onClick={() => setDialog("delete")}>{isDraft ? "Xoá nháp" : "Xoá"}</Button>}
                        {canEdit && <Button onClick={() => navigate(`/offers/${offer.id}/edit`)}>Sửa</Button>}
                        {canApprove && <Button danger onClick={() => setDialog("reject")}>Không duyệt</Button>}
                        {canApprove && <Button type="primary" loading={acting} onClick={() => run(() => approveOffer(offer.id), "Đã duyệt và gửi thư mời")}>Duyệt & gửi</Button>}
                        {canSend && <Button type="primary" onClick={() => setDialog("send")}>Gửi thư mời</Button>}
                    </>}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13, color: COLORS.textSecondary }}>
                    <StatusTag {...st} />
                    <span><b style={{ color: COLORS.textPrimary }}>{offer.candidateName}</b> · {offer.jobTitle ?? "—"}</span>
                    <span>· Soạn bởi {offer.requesterName ?? "—"} · {d(offer.createdAt)}</span>
                </div>
            </div>

            {offer.status === "APPROVED" && (
                <InlineNotice tone="warning">
                    {offer.candidateViewCount
                        ? `Ứng viên chưa phản hồi · đã xem ${offer.candidateViewCount} lần${offer.candidateLastViewedAt ? ` lúc ${dayjs(offer.candidateLastViewedAt).format("HH:mm, DD/MM")}` : ""}`
                        : "Ứng viên chưa phản hồi · chưa mở thư"}
                </InlineNotice>
            )}
            {offer.status === "EXPIRED" && (
                <InlineNotice tone="neutral">
                    Thư mời đã hết hạn phản hồi{offer.expiredAt ? ` lúc ${dayjs(offer.expiredAt).format("HH:mm, DD/MM/YYYY")}` : ""}. Suất tuyển đã được trả lại, bạn có thể soạn thư mời mới.
                </InlineNotice>
            )}
            {offer.rejectReason && <InlineNotice tone="danger">Thư mời không được duyệt: {offer.rejectReason}</InlineNotice>}
            {offer.declineReasonName && (
                <InlineNotice tone="danger">Ứng viên từ chối: {offer.declineReasonName}{offer.declineNote ? ` — ${offer.declineNote}` : ""}</InlineNotice>
            )}
            {offer.status === "ACCEPTED" && <InlineNotice tone="success">Ứng viên đã nhận việc. Ngày đầu tiên {d(offer.startDate)}.</InlineNotice>}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)", gap: 16, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Panel title="Điều khoản" bodyGap={0}>
                        <Row label="Lương gộp" value={<b>{formatMoney(offer.salaryOffered)}{pay}</b>} />
                        {!!offer.allowance && <Row label="Phụ cấp" value={`${formatMoney(offer.allowance)}${pay}`} />}
                        {offer.performanceBonus && <Row label="Thưởng hiệu suất" value={offer.performanceBonus} />}
                        {offer.benefits && <Row label="Phúc lợi" value={<span style={{ whiteSpace: "pre-line" }}>{offer.benefits}</span>} />}
                        <Row label="Ngày bắt đầu" value={d(offer.startDate)} />
                        <Row label="Thử việc" value={`${offer.probationMonths ?? 0} tháng`} />
                        <Row label="Hợp đồng" value={offer.contractTypeName ?? "—"} />
                        {location && <Row label="Nơi làm việc" value={location} />}
                        {offer.reportingManager && <Row label="Báo cáo cho" value={offer.reportingManager} />}
                        {offer.annualLeaveDays != null && <Row label="Nghỉ phép" value={`${offer.annualLeaveDays} ngày/năm`} />}
                        <Row label="Hạn phản hồi" value={offer.responseDeadline ? dayjs(offer.responseDeadline).format("HH:mm DD/MM/YYYY") : "—"} />
                        {isHr && offer.note && <Row label="Ghi chú nội bộ" value={<span style={{ whiteSpace: "pre-wrap" }}>{offer.note}</span>} />}
                    </Panel>
                    {isDraft && (
                        <Panel title="Kiểm tra trước khi gửi">
                            {checks == null ? <Spin size="small" /> : <CheckList items={checks} />}
                        </Panel>
                    )}
                </div>

                <Panel title={isDraft ? "Xem trước thư mời" : "Thư mời đã gửi"}>
                    <OfferLetterPreview data={{
                        company, location, candidateName: offer.candidateName, jobTitle: offer.jobTitle, deptName,
                        salaryOffered: offer.salaryOffered, allowance: offer.allowance, payFrequency: offer.payFrequency,
                        startDate: offer.startDate, probationMonths: offer.probationMonths, contractTypeName: offer.contractTypeName,
                        annualLeaveDays: offer.annualLeaveDays, reportingManager: offer.reportingManager, benefits: offer.benefits,
                        candidateVisibleNote: offer.candidateVisibleNote, responseDeadline: offer.responseDeadline,
                        requesterName: offer.requesterName,
                    }} />
                </Panel>
            </div>

            <SmallDialog open={dialog === "send"} title={`Gửi thư mời cho ${offer.candidateName}?`} okText="Gửi thư mời" okLoading={acting}
                onCancel={() => setDialog(null)} onOk={() => run(() => sendOffer(offer.id), `Đã gửi thư mời cho ${offer.candidateName}`)}>
                {checks && <CheckList items={checks} />}
                {failing.length > 0 && (
                    <span style={{ fontSize: 13, color: COLORS.warning }}>Còn {failing.length} mục chưa đạt — bạn vẫn có thể gửi nếu đã thống nhất với đại diện phòng ban.</span>
                )}
                <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                    Ứng viên nhận thư qua email và cổng ứng viên ngay. Sau khi gửi không sửa được điều khoản.
                </span>
            </SmallDialog>

            <SmallDialog open={dialog === "delete"} title="Xoá bản nháp thư mời?" okText="Xoá" danger okLoading={acting}
                onCancel={() => setDialog(null)}
                onOk={async () => {
                    setActing(true);
                    try { await deleteOffer(offer.id); message.success("Đã xoá bản nháp"); navigate("/offers"); }
                    catch (err) { message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Xoá thất bại"); }
                    finally { setActing(false); }
                }}>
                <span style={{ color: COLORS.textSecondary }}>Không hoàn tác được.</span>
            </SmallDialog>

            <OfferRejectModal open={dialog === "reject"} offerId={offer.id} onClose={() => setDialog(null)} onSuccess={() => { setDialog(null); void load(); }} />
        </div>
    );
}

function CheckList({ items }: { items: Check[] }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((c) => (
                <span key={c.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    {c.ok ? <CheckCircleFilled style={{ color: COLORS.success }} /> : <ExclamationCircleFilled style={{ color: COLORS.warning }} />}
                    {c.text}
                </span>
            ))}
        </div>
    );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ display: "flex", gap: 16, padding: "9px 0", borderTop: `0.5px solid ${COLORS.border}`, fontSize: 14 }}>
            <span style={{ width: 130, flexShrink: 0, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{value}</span>
        </div>
    );
}
