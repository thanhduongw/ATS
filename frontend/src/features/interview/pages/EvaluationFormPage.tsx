import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    App, Avatar, Button, Card, Col, Form, Input, Radio, Rate, Row, Spin, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import type { AxiosError } from "axios";

import { submitApplicationEvaluation, submitEvaluation, getInterviews } from "../interviewApi";
import { getApplicationById, getApplicationHistory } from "../../candidate/applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import {
    evaluationSubmitSchema,
    type EvaluationSubmitFormValues,
} from "../schemas/evaluationSubmitSchema";
import type { ApiMessageResponse, InterviewResponse } from "../types";
import type { ApplicationResponse, ApplicationHistoryResponse } from "../../candidate/types";
import type { CatalogItem } from "../../masterdata/types";
import { COLORS, RADIUS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import "./EvaluationFormPage.css";

const { Text } = Typography;

const RECOMMENDATION_OPTIONS = [
    { value: "STRONG_YES", label: "Đề xuất tuyển dụng" },
    { value: "YES", label: "Lưu hồ sơ dự phòng" },
    // { value: "NO", label: "Không khuyến nghị" },
    { value: "STRONG_NO", label: "Không phù hợp" },
];

const UNKNOWN_ROUND = "Chưa xác định vòng";

const getInitials = (name: string) => {
    const parts = (name || "").split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name || "?").substring(0, 2).toUpperCase();
};

/** Vòng của một mốc thời gian = lần chuyển vòng gần nhất trước mốc đó. */
function roundAt(at: string | null | undefined, sortedHistory: ApplicationHistoryResponse[]): string {
    if (!at || sortedHistory.length === 0) return UNKNOWN_ROUND;
    const moment = dayjs(at);
    let round = UNKNOWN_ROUND;
    for (const entry of sortedHistory) {
        if (dayjs(entry.changedAt).isAfter(moment)) break;
        round = entry.toStageName;
    }
    return round;
}

/** Tiêu đề đánh số cho từng phần của phiếu chấm. */
function StepTitle({ index, title }: { index: number; title: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
                style={{
                    width: 21, height: 21, borderRadius: "50%", flexShrink: 0,
                    background: COLORS.primary, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11.5, fontWeight: 700,
                }}
            >
                {index}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>{title}</span>
        </div>
    );
}

/**
 * Trang chấm đánh giá ứng viên. Đích chấm là một buổi phỏng vấn (?interviewId=)
 * hoặc chính hồ sơ ứng tuyển khi vòng hiện tại không có buổi phỏng vấn nào.
 */
export default function EvaluationFormPage() {
    const { candidateId, applicationId: applicationIdParam } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const applicationId = Number(applicationIdParam);
    const interviewIdParam = searchParams.get("interviewId");
    const interviewId = interviewIdParam ? Number(interviewIdParam) : null;

    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    const [history, setHistory] = useState<ApplicationHistoryResponse[]>([]);
    const [interview, setInterview] = useState<InterviewResponse | null>(null);
    const [criteria, setCriteria] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);

    const backToProfile = useCallback(
        () => navigate(`/candidates/${candidateId}/applications/${applicationId}`),
        [navigate, candidateId, applicationId],
    );

    useEffect(() => {
        if (!applicationId) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            getApplicationById(applicationId),
            getApplicationHistory(applicationId),
            getInterviews(applicationId),
            getCatalogItems("/masterdata/interview-criteria"),
        ])
            .then(([appRes, historyRes, interviewsRes, criteriaRes]) => {
                if (cancelled) return;
                setApplication(appRes.data);
                setHistory(historyRes.data);
                setCriteria(criteriaRes.data);
                setInterview(
                    interviewId != null
                        ? interviewsRes.data.find((i) => i.id === interviewId) ?? null
                        : null,
                );
            })
            .catch((err) => {
                const e = err as AxiosError<ApiMessageResponse>;
                message.error(e.response?.data?.message ?? "Không tải được dữ liệu đánh giá");
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [applicationId, interviewId, message]);

    const {
        control, handleSubmit, reset, watch,
        formState: { errors, isSubmitting },
    } = useForm<EvaluationSubmitFormValues>({ resolver: zodResolver(evaluationSubmitSchema) });

    const { fields } = useFieldArray({ control, name: "scores" });
    const watchedScores = watch("scores");

    useEffect(() => {
        if (criteria.length === 0) return;
        reset({
            overallRecommendation: "YES",
            generalComment: "",
            salaryProposed: undefined,
            salaryNote: "",
            scores: criteria.map((c) => ({ criteriaId: c.id, score: 3, comment: "" })),
        });
    }, [criteria, reset]);

    const sortedHistory = useMemo(
        () => [...history].sort((a, b) => dayjs(a.changedAt).valueOf() - dayjs(b.changedAt).valueOf()),
        [history],
    );

    const roundName = interview
        ? roundAt(interview.createdAt, sortedHistory)
        : application?.currentStageName ?? UNKNOWN_ROUND;

    const onSubmit = async (data: EvaluationSubmitFormValues) => {
        try {
            if (interviewId != null) {
                await submitEvaluation(interviewId, data);
            } else {
                await submitApplicationEvaluation(applicationId, data);
            }
            message.success("Đã nộp đánh giá");
            backToProfile();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Nộp đánh giá thất bại");
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!application) {
        return (
            <div className="page-container">
                <EmptyState
                    title="Không tìm thấy hồ sơ ứng tuyển"
                    description="Hồ sơ có thể đã bị xóa hoặc bạn không có quyền đánh giá."
                />
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in evaluation-page">
            {/* Ngữ cảnh gọn trong một hàng: quay lại, ai, vị trí nào, vòng nào. */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <Button
                    type="text"
                    size="small"
                    icon={<ArrowLeftOutlined />}
                    onClick={backToProfile}
                    style={{ paddingLeft: 0, color: COLORS.textSecondary }}
                >
                    Quay lại
                </Button>

                <Avatar size={34} style={{ background: COLORS.primary, color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                    {getInitials(application.candidateName)}
                </Avatar>

                <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.25 }}>
                        {application.candidateName}
                    </div>
                    <div style={{ fontSize: 12.5, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {application.jobTitle}
                    </div>
                </div>

                <Tag color="processing" style={{ margin: 0, borderRadius: 14, padding: "1px 10px" }}>
                    {roundName}
                </Tag>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {interview
                        ? `Buổi phỏng vấn ${dayjs(interview.scheduledAt).format("HH:mm DD/MM/YYYY")}`
                        : ""}
                </span>
            </div>

            <Form layout="vertical" className="evaluation-form">
                <Row gutter={[16, 16]} className="evaluation-grid">
                    <Col xs={24} lg={14} className="evaluation-column">
                        <Card
                            className="evaluation-score-card"
                            style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12 }}
                        >
                            <StepTitle index={1} title="Chấm điểm theo tiêu chí" />

                            <div
                                className="evaluation-criteria-list"
                                style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: RADIUS.md, overflow: "hidden" }}
                            >
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="evaluation-criterion-row"
                                        style={{
                                            background: index % 2 === 1 ? "#FAFBFC" : "#fff",
                                            borderBottom: index < fields.length - 1 ? `1px solid ${COLORS.borderLight}` : undefined,
                                        }}
                                    >
                                        <span className="evaluation-criterion-name">
                                            {criteria[index]?.name as string}
                                        </span>
                                        <Controller
                                            name={`scores.${index}.score`}
                                            control={control}
                                            render={({ field: scoreField }) => (
                                                <Rate
                                                    count={5}
                                                    value={scoreField.value}
                                                    onChange={scoreField.onChange}
                                                    className="evaluation-rate"
                                                />
                                            )}
                                        />
                                        <span
                                            style={{
                                                width: 20, flexShrink: 0, textAlign: "right", fontWeight: 700,
                                                fontSize: 14, fontVariantNumeric: "tabular-nums", color: COLORS.primary,
                                            }}
                                        >
                                            {watchedScores?.[index]?.score ?? 0}
                                        </span>
                                        <Controller
                                            name={`scores.${index}.comment`}
                                            control={control}
                                            render={({ field: commentField }) => (
                                                <Input
                                                    {...commentField}
                                                    value={commentField.value ?? ""}
                                                    placeholder="Nhận xét cho tiêu chí này"
                                                    className="evaluation-criterion-comment"
                                                />
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>

                            {errors.scores && (
                                <Text type="danger" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                                    Vui lòng chấm điểm từ 1 đến 5 cho mọi tiêu chí.
                                </Text>
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} lg={10} className="evaluation-column">
                        <div className="evaluation-side-column">
                        <Card
                            className="evaluation-comment-card"
                            style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12 }}
                        >
                            <StepTitle index={2} title="Nhận xét và đề xuất lương" />

                            <Form.Item className="evaluation-general-comment" style={{ marginBottom: 16 }}>
                                <Controller
                                    name="generalComment"
                                    control={control}
                                    render={({ field }) => (
                                        <Input.TextArea
                                            {...field}
                                            value={field.value ?? ""}
                                            autoSize={{ minRows: 8, maxRows: 12 }}
                                            placeholder="Điểm mạnh, điểm cần lưu ý, nhận định tổng quan"
                                        />
                                    )}
                                />
                            </Form.Item>

                            <Row gutter={10}>
                                <Col span={12}>
                                    <Form.Item label="Lương đề xuất" style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="salaryProposed"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    type="number"
                                                    size="small"
                                                    suffix="VNĐ"
                                                    placeholder="15000000"
                                                    value={field.value ?? ""}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Ghi chú đãi ngộ" style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="salaryNote"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    size="small"
                                                    placeholder="Không bắt buộc"
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        <Card
                            className="evaluation-conclusion-card"
                            style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12 }}
                        >
                            <StepTitle index={3} title="Kết luận" />

                            <Form.Item
                                validateStatus={errors.overallRecommendation ? "error" : ""}
                                help={errors.overallRecommendation?.message}
                                style={{ marginBottom: 0 }}
                            >
                                <Controller
                                    name="overallRecommendation"
                                    control={control}
                                    render={({ field }) => (
                                        <Radio.Group
                                            {...field}
                                            className="evaluation-recommendations"
                                        >
                                            {RECOMMENDATION_OPTIONS.map((option) => (
                                                <Radio.Button key={option.value} value={option.value}>
                                                    {option.label}
                                                </Radio.Button>
                                            ))}
                                        </Radio.Group>
                                    )}
                                />
                            </Form.Item>
                        </Card>

                        <div
                            className="evaluation-lock-notice"
                            style={{
                                background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: RADIUS.md,
                                padding: "10px 12px", fontSize: 12.5, color: "#92400E",
                                display: "flex", alignItems: "flex-start", gap: 8,
                            }}
                        >
                            <WarningOutlined style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>Đánh giá đã nộp sẽ khóa lại, không sửa được.</span>
                        </div>

                        <div className="evaluation-actions">
                            <Button onClick={backToProfile} disabled={isSubmitting}>Hủy</Button>
                            <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                loading={isSubmitting}
                                onClick={handleSubmit(onSubmit)}
                            >
                                Nộp đánh giá
                            </Button>
                        </div>
                        </div>
                    </Col>
                </Row>
            </Form>
        </div>
    );
}
