import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    App, Alert, Button, Space, Table, Tag, Tooltip, Spin, Progress,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    TrophyOutlined, FileAddOutlined, EyeOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getOffers } from "../offerApi";
import OfferCreateModal from "./OfferCreateModal";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { getApplications, advanceApplicationStage } from "../../candidate/applicationApi";
import type { ApplicationResponse } from "../../candidate/types";
import { getEvaluationsByApplications } from "../../interview/interviewApi";
import type { EvaluationResponse, RecommendationType } from "../../interview/types";
import { getPostingById } from "../../recruitment/recruitmentApi";
import { getPipelines } from "../../masterdata/masterdataApi";
import type { PipelineStageResponse } from "../../masterdata/types";
import { COLORS } from "../../../app/theme";
import { formatMoney } from "../../../app/money";
import { OFFER_STATUS, statusMeta } from "../../../app/statusLabels";
import EmptyState from "../../../components/ui/EmptyState";

const RECOMMENDATION_LABEL: Record<RecommendationType, string> = {
    STRONG_YES: "Rất khuyến nghị nhận",
    YES: "Khuyến nghị nhận",
    NO: "Không khuyến nghị",
    STRONG_NO: "Kiên quyết không nhận",
};

const RECOMMENDATION_COLOR: Record<RecommendationType, string> = {
    STRONG_YES: "success",
    YES: "success",
    NO: "warning",
    STRONG_NO: "error",
};

/**
 * Quy đổi đề xuất thành điểm để xếp hạng gợi ý. Đây chỉ là thứ tự mặc định của bảng —
 * dữ liệu gốc của từng người chấm vẫn hiển thị đầy đủ để HR tự quyết định.
 */
const RECOMMENDATION_WEIGHT: Record<RecommendationType, number> = {
    STRONG_YES: 4,
    YES: 3,
    NO: 2,
    STRONG_NO: 1,
};

/** Hồ sơ đã kết thúc thì không còn nằm trong diện cân nhắc offer. */
const TERMINAL_STAGE_TYPES = ["REJECTED", "HIRED"];

/** Offer còn chiếm suất tuyển — khớp với quy tắc chặn headcount ở offer-service. */
const ACTIVE_OFFER_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACCEPTED"];

interface ComparisonRow {
    application: ApplicationResponse;
    evaluations: EvaluationResponse[];
    /** Bài chấm đã nộp và người xem được phép đọc nội dung. */
    readable: EvaluationResponse[];
    recommendationScore: number | null;
    averageCriteriaScore: number | null;
    salaryProposed: number | null;
    daysInPipeline: number;
    offer: OfferResponse | null;
}

interface Props {
    jobPostingId: number;
    /** Ẩn tiêu đề khi panel nằm trong một card đã có tiêu đề riêng. */
    showHeader?: boolean;
}

export default function CandidateComparisonPanel({ jobPostingId, showHeader = true }: Props) {
    const navigate = useNavigate();
    const { message, modal } = App.useApp();

    const [loading, setLoading] = useState(true);
    const [advancing, setAdvancing] = useState(false);
    const [rows, setRows] = useState<ComparisonRow[]>([]);
    const [headcount, setHeadcount] = useState<number | null>(null);
    const [activeOfferCount, setActiveOfferCount] = useState(0);
    const [stages, setStages] = useState<PipelineStageResponse[]>([]);
    const [createForApplicationId, setCreateForApplicationId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const postingRes = await getPostingById(jobPostingId);
            setHeadcount(postingRes.data.headcount ?? null);

            const pipelinesRes = await getPipelines();
            const pipeline = pipelinesRes.data.find((p) => p.id === postingRes.data.pipelineId);
            setStages(pipeline ? [...pipeline.stages].sort((a, b) => a.stageOrder - b.stageOrder) : []);

            const [appsRes, offersRes] = await Promise.all([
                getApplications({ jobPostingId, size: 1000 }),
                getOffers({ jobPostingId, size: 1000 }),
            ]);

            const offers = offersRes.data.content;
            setActiveOfferCount(offers.filter((o) => ACTIVE_OFFER_STATUSES.includes(o.status)).length);

            // Chỉ so sánh hồ sơ chưa kết thúc của chính tin tuyển dụng này.
            const candidates = appsRes.data.content.filter(
                (a) => !TERMINAL_STAGE_TYPES.includes(a.currentStageType),
            );
            if (candidates.length === 0) {
                setRows([]);
                return;
            }

            const evalRes = await getEvaluationsByApplications(candidates.map((a) => a.id));
            const evalByApplication = new Map(
                evalRes.data.map((e) => [e.applicationId, e.evaluations]),
            );
            // Offer mới nhất của mỗi hồ sơ — danh sách đã sắp xếp giảm dần theo ngày tạo.
            const offerByApplication = new Map<number, OfferResponse>();
            offers.forEach((o) => {
                if (!offerByApplication.has(o.applicationId)) offerByApplication.set(o.applicationId, o);
            });

            const built = candidates
                .map((application) => buildRow(
                    application,
                    evalByApplication.get(application.id) ?? [],
                    offerByApplication.get(application.id) ?? null,
                ))
                // Quy tắc so sánh: phải có tối thiểu một đánh giá đã nộp.
                .filter((row) => row.readable.length > 0 || hasSubmitted(row.evaluations));

            built.sort(compareRows);
            setRows(built);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu so sánh");
        } finally {
            setLoading(false);
        }
    }, [jobPostingId, message]);

    useEffect(() => {
        load();
    }, [load]);

    const offerStage = useMemo(() => stages.find((s) => s.stageType === "OFFER"), [stages]);
    const remaining = headcount != null ? headcount - activeOfferCount : null;
    const headcountExhausted = remaining != null && remaining <= 0;

    /**
     * Đưa hồ sơ tới vòng Offer rồi mở form tạo offer. Pipeline chỉ cho đi từng vòng một nên
     * phải gọi lần lượt; lịch sử hồ sơ nhờ vậy vẫn ghi đủ các vòng đã đi qua.
     */
    const selectForOffer = async (row: ComparisonRow) => {
        if (!offerStage) return;
        const current = row.application.currentStageOrder;
        const steps = offerStage.stageOrder - current;

        if (steps <= 0) {
            setCreateForApplicationId(row.application.id);
            return;
        }

        const passing = stages
            .filter((s) => s.stageOrder > current && s.stageOrder <= offerStage.stageOrder)
            .map((s) => s.name);

        modal.confirm({
            title: `Chọn ${row.application.candidateName} để offer?`,
            content: (
                <div>
                    <div style={{ marginBottom: 8 }}>
                        Hồ sơ sẽ được chuyển qua các vòng: <b>{passing.join(" → ")}</b>.
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                        Các ứng viên còn lại giữ nguyên vòng hiện tại để bạn còn quay lại nếu
                        ứng viên này từ chối offer.
                    </div>
                </div>
            ),
            okText: "Chuyển tới vòng Offer",
            cancelText: "Hủy",
            onOk: async () => {
                setAdvancing(true);
                try {
                    for (let i = 0; i < steps; i += 1) {
                        await advanceApplicationStage(row.application.id, {
                            note: "Được chọn để offer sau khi so sánh ứng viên",
                        });
                    }
                    message.success("Hồ sơ đã ở vòng Offer");
                    await load();
                    setCreateForApplicationId(row.application.id);
                } catch (err) {
                    const axiosErr = err as AxiosError<ApiMessageResponse>;
                    message.error(axiosErr.response?.data?.message ?? "Không chuyển được vòng");
                    await load();
                } finally {
                    setAdvancing(false);
                }
            },
        });
    };

    const columns: ColumnsType<ComparisonRow> = [
        {
            title: "Ứng viên",
            key: "candidate",
            width: 200,
            ellipsis: true,
            render: (_, row) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{row.application.candidateName}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                        {row.application.recruitmentSourceName || "—"} · {row.daysInPipeline} ngày trong pipeline
                    </div>
                </div>
            ),
        },
        {
            title: "Vòng hiện tại",
            key: "stage",
            width: 150,
            render: (_, row) => <Tag>{row.application.currentStageName}</Tag>,
        },
        {
            title: "Đề xuất của người phỏng vấn",
            key: "recommendations",
            width: 230,
            render: (_, row) => {
                const submitted = row.readable.filter((e) => e.overallRecommendation);
                if (submitted.length === 0) {
                    return <span style={{ color: COLORS.textMuted }}>Chưa đọc được nội dung</span>;
                }
                return (
                    <Space size={4} wrap>
                        {submitted.map((e) => (
                            <Tooltip key={e.id} title={`${e.interviewerName}`}>
                                <Tag color={RECOMMENDATION_COLOR[e.overallRecommendation!]} style={{ margin: 0 }}>
                                    {RECOMMENDATION_LABEL[e.overallRecommendation!]}
                                </Tag>
                            </Tooltip>
                        ))}
                    </Space>
                );
            },
        },
        {
            title: (
                <Tooltip title="Trung bình đề xuất, quy đổi: Rất khuyến nghị 4 · Khuyến nghị 3 · Không khuyến nghị 2 · Kiên quyết không 1">
                    <span>Điểm đề xuất</span>
                </Tooltip>
            ),
            key: "recommendationScore",
            width: 130,
            sorter: (a, b) => (a.recommendationScore ?? -1) - (b.recommendationScore ?? -1),
            render: (_, row) =>
                row.recommendationScore == null ? (
                    <span style={{ color: COLORS.textMuted }}>—</span>
                ) : (
                    <Progress
                        percent={(row.recommendationScore / 4) * 100}
                        size="small"
                        format={() => row.recommendationScore!.toFixed(2)}
                        strokeColor={row.recommendationScore >= 3 ? COLORS.success : "#F59E0B"}
                    />
                ),
        },
        {
            title: "Điểm TB tiêu chí",
            key: "averageCriteriaScore",
            width: 130,
            sorter: (a, b) => (a.averageCriteriaScore ?? -1) - (b.averageCriteriaScore ?? -1),
            render: (_, row) =>
                row.averageCriteriaScore == null
                    ? <span style={{ color: COLORS.textMuted }}>—</span>
                    : row.averageCriteriaScore.toFixed(2),
        },
        {
            title: "Lương đề xuất",
            key: "salaryProposed",
            width: 140,
            sorter: (a, b) => (a.salaryProposed ?? -1) - (b.salaryProposed ?? -1),
            render: (_, row) =>
                row.salaryProposed == null
                    ? <span style={{ color: COLORS.textMuted }}>Chưa đề xuất</span>
                    : formatMoney(row.salaryProposed),
        },
        {
            title: "Offer",
            key: "offer",
            width: 150,
            render: (_, row) => {
                if (!row.offer) return <span style={{ color: COLORS.textMuted }}>Chưa có</span>;
                const meta = statusMeta(OFFER_STATUS, row.offer.status);
                return <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>;
            },
        },
        {
            title: "Thao tác",
            key: "action",
            width: 180,
            fixed: "right",
            render: (_, row) => renderAction(row),
        },
    ];

    function renderAction(row: ComparisonRow) {
        const hasActiveOffer = row.offer != null && ACTIVE_OFFER_STATUSES.includes(row.offer.status);
        if (hasActiveOffer) {
            return (
                <Button size="small" icon={<EyeOutlined />} onClick={() => navigate("/offers")}>
                    Xem offer
                </Button>
            );
        }
        if (!offerStage) {
            return (
                <Tooltip title="Quy trình tuyển dụng của tin này không có vòng Offer">
                    <Button size="small" disabled>Chọn để offer</Button>
                </Tooltip>
            );
        }
        if (headcountExhausted) {
            return (
                <Tooltip title="Tin tuyển dụng đã dùng hết số lượng tuyển">
                    <Button size="small" disabled>Chọn để offer</Button>
                </Tooltip>
            );
        }
        const atOfferStage = row.application.currentStageType === "OFFER";
        return (
            <Button
                size="small"
                type="primary"
                loading={advancing}
                icon={atOfferStage ? <FileAddOutlined /> : <ArrowRightOutlined />}
                onClick={() => selectForOffer(row)}
            >
                {atOfferStage ? "Tạo offer" : "Chọn để offer"}
            </Button>
        );
    }

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <Spin />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
            {showHeader && (
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                    <TrophyOutlined style={{ marginRight: 8, color: COLORS.textMuted }} />
                    So sánh ứng viên ({rows.length})
                </div>
            )}

            {headcount != null && (
                <Alert
                    type={headcountExhausted ? "warning" : "info"}
                    showIcon
                    style={{ marginBottom: 12 }}
                    message={
                        headcountExhausted
                            ? `Đã dùng hết ${headcount} suất tuyển của tin này`
                            : `Đã dùng ${activeOfferCount}/${headcount} suất tuyển · còn ${remaining} suất`
                    }
                    description={
                        headcountExhausted
                            ? "Muốn offer thêm ứng viên, hãy hủy một offer đang xử lý hoặc tăng số lượng tuyển trong yêu cầu tuyển dụng."
                            : "Offer bị ứng viên từ chối sẽ trả lại suất tuyển, khi đó bạn quay lại bảng này chọn ứng viên xếp sau."
                    }
                />
            )}

            <Table
                rowKey={(row) => row.application.id}
                size="small"
                columns={columns}
                dataSource={rows}
                scroll={{ x: 1300 }}
                pagination={false}
                expandable={{
                    expandedRowRender: (row) => <EvaluationDetail row={row} />,
                    rowExpandable: (row) => row.evaluations.length > 0,
                }}
                locale={{
                    emptyText: (
                        <EmptyState
                            title="Chưa có ứng viên nào để so sánh"
                            description="Bảng chỉ hiện ứng viên chưa kết thúc quy trình và đã có ít nhất một đánh giá phỏng vấn được nộp."
                        />
                    ),
                }}
            />

            <OfferCreateModal
                open={createForApplicationId != null}
                defaultApplicationId={createForApplicationId}
                onClose={() => setCreateForApplicationId(null)}
                onSuccess={() => {
                    setCreateForApplicationId(null);
                    load();
                }}
            />
        </div>
    );
}

/** Chi tiết từng bài chấm, để HR đọc nhận xét chứ không chỉ nhìn điểm tổng. */
function EvaluationDetail({ row }: { row: ComparisonRow }) {
    return (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {row.evaluations.map((e) => (
                <div
                    key={e.id}
                    style={{
                        border: `1px solid ${COLORS.borderLight}`,
                        borderRadius: 8,
                        padding: 10,
                        background: "#fff",
                    }}
                >
                    <Space wrap style={{ marginBottom: 6 }}>
                        <b>{e.interviewerName}</b>
                        {e.overallRecommendation && (
                            <Tag color={RECOMMENDATION_COLOR[e.overallRecommendation]} style={{ margin: 0 }}>
                                {RECOMMENDATION_LABEL[e.overallRecommendation]}
                            </Tag>
                        )}
                        {e.submittedAt ? (
                            <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                                Nộp {dayjs(e.submittedAt).format("DD/MM/YYYY HH:mm")}
                            </span>
                        ) : (
                            <Tag color="default" style={{ margin: 0 }}>Chưa nộp</Tag>
                        )}
                        {e.salaryProposed != null && (
                            <span style={{ fontSize: 12 }}>
                                Đề xuất lương: <b>{formatMoney(e.salaryProposed)}</b>
                            </span>
                        )}
                    </Space>

                    {!e.contentVisible ? (
                        <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                            Nội dung bài chấm này chưa mở khóa cho bạn.
                        </div>
                    ) : (
                        <>
                            {e.scores.length > 0 && (
                                <Space size={4} wrap style={{ marginBottom: 6 }}>
                                    {e.scores.map((s) => (
                                        <Tooltip key={s.criteriaId} title={s.comment || "Không có nhận xét"}>
                                            <Tag style={{ margin: 0 }}>
                                                {s.criteriaName}: <b>{s.score}</b>
                                            </Tag>
                                        </Tooltip>
                                    ))}
                                </Space>
                            )}
                            {e.generalComment && (
                                <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{e.generalComment}</div>
                            )}
                        </>
                    )}
                </div>
            ))}
        </Space>
    );
}

function hasSubmitted(evaluations: EvaluationResponse[]) {
    return evaluations.some((e) => e.submittedAt != null);
}

function average(values: number[]) {
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildRow(
    application: ApplicationResponse,
    evaluations: EvaluationResponse[],
    offer: OfferResponse | null,
): ComparisonRow {
    const readable = evaluations.filter((e) => e.contentVisible && e.submittedAt != null);

    const recommendationScore = average(
        readable
            .filter((e) => e.overallRecommendation)
            .map((e) => RECOMMENDATION_WEIGHT[e.overallRecommendation!]),
    );
    const averageCriteriaScore = average(readable.flatMap((e) => e.scores.map((s) => s.score)));
    const salaries = readable
        .map((e) => e.salaryProposed)
        .filter((v): v is number => v != null);

    return {
        application,
        evaluations,
        readable,
        recommendationScore,
        averageCriteriaScore,
        // Lấy mức cao nhất: đây là ngưỡng HR phải chốt được nếu muốn ứng viên nhận offer.
        salaryProposed: salaries.length > 0 ? Math.max(...salaries) : null,
        daysInPipeline: dayjs().diff(dayjs(application.appliedAt), "day"),
        offer,
    };
}

/** Thứ tự gợi ý: đề xuất tốt hơn lên trước, hòa thì xét điểm tiêu chí rồi tới thâm niên hồ sơ. */
function compareRows(a: ComparisonRow, b: ComparisonRow) {
    const byRecommendation = (b.recommendationScore ?? -1) - (a.recommendationScore ?? -1);
    if (byRecommendation !== 0) return byRecommendation;
    const byScore = (b.averageCriteriaScore ?? -1) - (a.averageCriteriaScore ?? -1);
    if (byScore !== 0) return byScore;
    return dayjs(a.application.appliedAt).valueOf() - dayjs(b.application.appliedAt).valueOf();
}
