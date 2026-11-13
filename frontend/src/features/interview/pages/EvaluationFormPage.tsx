import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { App, Button, Form, Input, InputNumber, Rate, Spin, Tabs } from "antd";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";

import {
    getEvaluations, getInterviews, saveEvaluationDraft, submitApplicationEvaluation, submitEvaluation,
} from "../interviewApi";
import { getApplicationById } from "../../candidate/applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { evaluationSubmitSchema, type EvaluationSubmitFormValues } from "../schemas/evaluationSubmitSchema";
import type { ApiMessageResponse, InterviewResponse, RecommendationType } from "../types";
import type { ApplicationResponse } from "../../candidate/types";
import type { CatalogItem } from "../../masterdata/types";
import AiScoreCard from "../../ai/components/AiScoreCard";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, RADIUS } from "../../../app/theme";
import { moneyFormatter, moneyParser, formatMoney } from "../../../app/money";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import { Panel, ScreenTitle, SmallDialog } from "../../../components/ui/designKit";

/**
 * H14/R46 · Đánh giá phỏng vấn (CV bên cạnh) và H15/R47 · Xác nhận nộp đánh giá — dùng chung cho
 * Đại diện phòng ban và Chuyên viên tuyển dụng được phân công phỏng vấn.
 * Đích chấm là một buổi phỏng vấn (?interviewId=) hoặc chính hồ sơ khi vòng hiện tại không có
 * buổi phỏng vấn (Chuyên viên tuyển dụng chấm). Lưu nháp chỉ có khi chấm theo buổi phỏng vấn.
 */
const RECOMMENDATIONS: { value: RecommendationType; label: string }[] = [
    { value: "STRONG_YES", label: "Rất nên tuyển" },
    { value: "YES", label: "Nên tuyển" },
    { value: "NO", label: "Không nên tuyển" },
    { value: "STRONG_NO", label: "Hoàn toàn không" },
];
const WEEKDAY = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export default function EvaluationFormPage() {
    const { candidateId, applicationId: applicationIdParam } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const myId = useAppSelector((s) => (s.auth.user?.userId ? Number(s.auth.user.userId) : null));

    const applicationId = Number(applicationIdParam);
    const interviewIdParam = searchParams.get("interviewId");
    const interviewId = interviewIdParam ? Number(interviewIdParam) : null;

    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    const [interview, setInterview] = useState<InterviewResponse | null>(null);
    const [criteria, setCriteria] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    /** Tiêu chí đã bấm "+ Thêm nhận xét" (mẫu R46/H14 ẩn ô nhận xét tới khi cần — giảm cuộn). */
    const [openComments, setOpenComments] = useState<Set<number>>(new Set());

    const backToProfile = useCallback(
        () => navigate(`/candidates/${candidateId}/applications/${applicationId}`),
        [navigate, candidateId, applicationId],
    );

    const {
        control, handleSubmit, reset, watch, getValues,
        formState: { errors, isSubmitting },
    } = useForm<EvaluationSubmitFormValues>({ resolver: zodResolver(evaluationSubmitSchema) });
    const { fields } = useFieldArray({ control, name: "scores" });

    useEffect(() => {
        if (!applicationId) return;
        let cancelled = false;
        Promise.all([
            getApplicationById(applicationId),
            getInterviews(applicationId),
            getCatalogItems("/masterdata/interview-criteria"),
            getCatalogItems("/masterdata/work-locations"),
            interviewId != null ? getEvaluations(interviewId).catch(() => null) : Promise.resolve(null),
        ])
            .then(([appRes, ivRes, critRes, locRes, evalRes]) => {
                if (cancelled) return;
                const crit = critRes.data.filter((c) => c.active);
                setApplication(appRes.data);
                setCriteria(crit);
                setWorkLocations(Object.fromEntries(locRes.data.map((w) => [w.id, String(w.name)])));
                setInterview(interviewId != null ? ivRes.data.find((i) => i.id === interviewId) ?? null : null);
                // Có bản nháp của mình thì điền lại.
                const draft = evalRes?.data.find((e) => e.interviewerId === myId && !e.submittedAt);
                reset({
                    overallRecommendation: draft?.overallRecommendation ?? "YES",
                    generalComment: draft?.generalComment ?? "",
                    salaryProposed: draft?.salaryProposed ?? undefined,
                    salaryNote: draft?.salaryNote ?? "",
                    scores: crit.map((c) => {
                        const s = draft?.scores?.find((x) => x.criteriaId === c.id);
                        return { criteriaId: c.id, score: s?.score ?? 0, comment: s?.comment ?? "" };
                    }),
                });
            })
            .catch((err) => {
                const e = err as AxiosError<ApiMessageResponse>;
                message.error(e.response?.data?.message ?? "Không tải được dữ liệu đánh giá");
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [applicationId, interviewId, myId, message, reset]);

    const scores = watch("scores") ?? [];
    const rec = watch("overallRecommendation");
    const salary = watch("salaryProposed");
    const scored = scores.filter((s) => s.score > 0);
    const average = scored.length ? scored.reduce((a, s) => a + s.score, 0) / scored.length : 0;

    const onSubmit = async (data: EvaluationSubmitFormValues) => {
        try {
            if (interviewId != null) await submitEvaluation(interviewId, data);
            else await submitApplicationEvaluation(applicationId, data);
            message.success("Đã nộp đánh giá");
            backToProfile();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Nộp đánh giá thất bại");
        } finally {
            setConfirmOpen(false);
        }
    };

    const saveDraft = async () => {
        if (interviewId == null) return;
        setSavingDraft(true);
        try {
            const v = getValues();
            await saveEvaluationDraft(interviewId, {
                ...v,
                scores: v.scores.filter((s) => s.score > 0),
            });
            message.success("Đã lưu nháp");
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Lưu nháp thất bại");
        } finally {
            setSavingDraft(false);
        }
    };

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spin size="large" /></div>;
    if (!application) {
        return <EmptyState title="Không tìm thấy hồ sơ ứng tuyển" description="Hồ sơ có thể đã bị xoá hoặc bạn không có quyền đánh giá." />;
    }

    const when = interview ? (() => {
        const s = dayjs(interview.scheduledAt);
        const e = s.add(interview.durationMinutes ?? 60, "minute");
        const place = interview.format === "ONLINE" ? "Trực tuyến"
            : (interview.workLocationId ? workLocations[interview.workLocationId] : null) ?? "Tại văn phòng";
        return `${WEEKDAY[s.day()]} ${s.format("DD/MM/YYYY")} · ${s.format("HH:mm")} – ${e.format("HH:mm")} · ${place}`;
    })() : null;
    const others = interview?.interviewers.filter((p) => p.interviewerId !== myId) ?? [];
    const missingScore = scores.some((s) => s.score < 1);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <PageBreadcrumb crumb="Đánh giá phỏng vấn" />
                <ScreenTitle
                    title="Đánh giá phỏng vấn"
                    actions={
                        <>
                            {interviewId != null && <Button onClick={() => void saveDraft()} loading={savingDraft}>Lưu nháp</Button>}
                            <Button type="primary" onClick={handleSubmit(() => setConfirmOpen(true))}>Nộp đánh giá</Button>
                        </>
                    }
                />
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <Panel
                    title="Phiếu đánh giá của bạn"
                    subtitle={[application.candidateName, when].filter(Boolean).join(" · ")}
                    style={{ flex: "1 1 520px", minWidth: 0 }}
                    bodyGap={14}
                >
                    <Form layout="vertical" requiredMark>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Chấm từng tiêu chí (1 – 5)</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {fields.map((f, i) => (
                                <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ flex: 1, fontWeight: 500 }}>{String(criteria[i]?.name ?? "")}</span>
                                        <Controller name={`scores.${i}.score`} control={control}
                                            render={({ field }) => <Rate count={5} value={field.value} onChange={field.onChange} style={{ fontSize: 18 }} />} />
                                        <span style={{ width: 32, textAlign: "right", fontSize: 13, color: COLORS.textSecondary }}>
                                            {scores[i]?.score ? `${scores[i].score}/5` : "–"}
                                        </span>
                                    </div>
                                    {openComments.has(i) || scores[i]?.comment ? (
                                        <Controller name={`scores.${i}.comment`} control={control}
                                            render={({ field }) => (
                                                <Input {...field} value={field.value ?? ""} placeholder="Nhận xét cho tiêu chí này"
                                                    variant="filled" autoFocus={openComments.has(i) && !field.value} />
                                            )} />
                                    ) : (
                                        <Button type="link" size="small" style={{ alignSelf: "flex-start", padding: 0, height: "auto" }}
                                            onClick={() => setOpenComments((prev) => new Set(prev).add(i))}>
                                            + Thêm nhận xét
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {(errors.scores || missingScore) && (
                            <div style={{ fontSize: 12, color: errors.scores ? COLORS.error : COLORS.textSecondary, marginTop: 6 }}>
                                Chấm đủ mọi tiêu chí từ 1 đến 5 sao trước khi nộp.
                            </div>
                        )}

                        <Form.Item label="Kết luận đề xuất" required style={{ marginTop: 16 }}>
                            <Controller name="overallRecommendation" control={control}
                                render={({ field }) => (
                                    <div style={{ display: "flex", gap: 8, width: "100%" }}>
                                        {RECOMMENDATIONS.map((o) => {
                                            const on = field.value === o.value;
                                            // Mẫu R46: Rất nên / Nên tuyển xanh lá · Không nên tuyển cam · Hoàn toàn không đỏ.
                                            const accent = o.value === "NO" ? COLORS.warning : o.value === "STRONG_NO" ? COLORS.error : COLORS.success;
                                            return (
                                                <button key={o.value} type="button" onClick={() => field.onChange(o.value)}
                                                    style={{
                                                        flex: "1 1 0", minWidth: 0, whiteSpace: "nowrap", height: 38, padding: "0 6px", borderRadius: 19, cursor: "pointer",
                                                        fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                                                        border: `1px solid ${accent}`, background: on ? accent : COLORS.cardBg,
                                                        color: on ? "#fff" : accent,
                                                    }}>
                                                    {o.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )} />
                        </Form.Item>
                        <Form.Item label="Nhận xét chung" required validateStatus={errors.generalComment ? "error" : ""}
                            help={errors.generalComment?.message}>
                            <Controller name="generalComment" control={control}
                                render={({ field }) => (
                                    <Input.TextArea {...field} value={field.value ?? ""} autoSize={{ minRows: 3, maxRows: 8 }}
                                        placeholder="Điểm mạnh, điểm cần lưu ý, nhận định tổng quan" />
                                )} />
                        </Form.Item>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <Form.Item label="Đề xuất mức lương (đồng/tháng)" style={{ marginBottom: 4 }}>
                                <Controller name="salaryProposed" control={control}
                                    render={({ field }) => (
                                        <InputNumber value={field.value ?? undefined} onChange={(v) => field.onChange(v ?? undefined)}
                                            min={0} style={{ width: 220 }} formatter={moneyFormatter} parser={moneyParser} suffix="đ" />
                                    )} />
                            </Form.Item>
                            <Form.Item label="Ghi chú về lương" style={{ flex: 1, minWidth: 220, marginBottom: 4 }}>
                                <Controller name="salaryNote" control={control}
                                    render={({ field }) => <Input {...field} value={field.value ?? ""} placeholder="Không bắt buộc" />} />
                            </Form.Item>
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            Đề xuất lương chỉ Chuyên viên tuyển dụng thấy, dùng để tham khảo khi soạn thư mời.
                        </div>
                    </Form>
                </Panel>

                <Panel style={{ flex: "1 1 480px", minWidth: 0, position: "sticky", top: 16 }}>
                    {others.length > 0 && (
                        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: RADIUS.md, background: COLORS.fill }}>
                            <LockOutlined style={{ color: COLORS.textSecondary }} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <b style={{ fontSize: 14 }}>Phỏng vấn cùng: {others.map((p) => p.fullName).join(", ")}</b>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Đánh giá của người khác hiện sau khi bạn nộp.</span>
                            </div>
                        </div>
                    )}
                    <Tabs
                        size="small"
                        items={[
                            {
                                key: "cv", label: "CV",
                                children: application.resumeUrl ? (
                                    <iframe src={application.resumeUrl} title="CV ứng viên"
                                        style={{ width: "100%", height: "calc(100vh - 260px)", minHeight: 520, border: "none", borderRadius: 12 }} />
                                ) : <span style={{ color: COLORS.textSecondary }}>Ứng viên chưa có CV.</span>,
                            },
                            {
                                key: "ai", label: "Điểm AI",
                                children: <AiScoreCard applicationId={application.id} canRescore={false} hasResume={!!application.resumeUrl} />,
                            },
                        ]}
                    />
                </Panel>
            </div>

            <SmallDialog
                open={confirmOpen}
                title="Nộp đánh giá?"
                onCancel={() => setConfirmOpen(false)}
                onOk={handleSubmit(onSubmit)}
                okText="Nộp đánh giá"
                okLoading={isSubmitting}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: COLORS.textSecondary }}>Kết luận</span>
                        <b>{RECOMMENDATIONS.find((o) => o.value === rec)?.label}</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: COLORS.textSecondary }}>Điểm trung bình</span>
                        <b>{average.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} / 5</b>
                    </div>
                    {salary != null && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: COLORS.textSecondary }}>Đề xuất mức lương</span>
                            <b>{formatMoney(salary)}</b>
                        </div>
                    )}
                    <span style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6 }}>
                        Sau khi nộp bạn không sửa được nữa và sẽ thấy đánh giá của người phỏng vấn khác.
                    </span>
                </div>
            </SmallDialog>
        </div>
    );
}
