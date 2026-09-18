import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    App, Alert, Button, Modal, Space, Table, Tag, Tooltip, Spin, Progress,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    TrophyOutlined, FileAddOutlined, EyeOutlined, ArrowRightOutlined, ColumnWidthOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getOffers } from "../offerApi";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { getApplications, advanceApplicationStage } from "../../candidate/applicationApi";
import { getCandidates } from "../../candidate/candidateApi";
import type { ApplicationResponse, CandidateResponse } from "../../candidate/types";
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

/** Quá 4 cột thì mỗi cột hẹp tới mức không đọc được nhận xét nữa. */
const MAX_COMPARE = 4;

/** Hồ sơ đã kết thúc thì không còn nằm trong diện cân nhắc offer. */
const TERMINAL_STAGE_TYPES = ["REJECTED", "HIRED"];

/** Offer đã chốt: ứng viên nhận việc, suất tuyển coi như đã dùng hẳn. */
const SETTLED_OFFER_STATUSES = ["ACCEPTED"];

/** Offer đang giữ chỗ nhưng chưa có kết quả — vẫn chiếm suất cho tới khi bị từ chối. */
const PENDING_OFFER_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED"];

/** Offer còn chiếm suất tuyển — khớp với quy tắc chặn headcount ở offer-service. */
const ACTIVE_OFFER_STATUSES = [...PENDING_OFFER_STATUSES, ...SETTLED_OFFER_STATUSES];

interface ComparisonRow {
    application: ApplicationResponse;
    /** Hồ sơ cá nhân: vị trí đang làm, học vấn, kỹ năng — bổ sung cho dữ liệu đánh giá. */
    candidate: CandidateResponse | null;
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
    const [acceptedOfferCount, setAcceptedOfferCount] = useState(0);
    const [pendingOfferCount, setPendingOfferCount] = useState(0);
    const [stages, setStages] = useState<PipelineStageResponse[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [detailOpen, setDetailOpen] = useState(false);


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
            setAcceptedOfferCount(offers.filter((o) => SETTLED_OFFER_STATUSES.includes(o.status)).length);
            setPendingOfferCount(offers.filter((o) => PENDING_OFFER_STATUSES.includes(o.status)).length);

            // Chỉ so sánh hồ sơ chưa kết thúc của chính tin tuyển dụng này.
            const candidates = appsRes.data.content.filter(
                (a) => !TERMINAL_STAGE_TYPES.includes(a.currentStageType),
            );
            if (candidates.length === 0) {
                setRows([]);
                return;
            }

            // Ho so ca nhan cua ung vien: doc mot lan roi tra cuu theo candidateId.
            let profileById = new Map<number, CandidateResponse>();
            try {
                const profileRes = await getCandidates({ size: 1000 });
                profileById = new Map(profileRes.data.content.map((c) => [c.id, c]));
            } catch {
                // Thieu ho so ca nhan chi lam mat hai cot, khong duoc chan bang so sanh.
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
                    profileById.get(application.candidateId) ?? null,
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

    const selectedRows = useMemo(
        () => rows.filter((r) => selectedIds.includes(r.application.id)),
        [rows, selectedIds],
    );

    const offerStage = useMemo(() => stages.find((s) => s.stageType === "OFFER"), [stages]);
    const activeOfferCount = acceptedOfferCount + pendingOfferCount;
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
            navigate(`/offers/create?applicationId=${row.application.id}`);
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
            okText: "Chuyển tới vòng Đề nghị",
            cancelText: "Hủy",
            onOk: async () => {
                setAdvancing(true);
                try {
                    for (let i = 0; i < steps; i += 1) {
                        await advanceApplicationStage(row.application.id, {
                            note: "Được chọn gửi đề nghị sau khi so sánh ứng viên",
                        });
                    }
                    message.success("Hồ sơ đã ở vòng Đề nghị nhận việc");
                    navigate(`/offers/create?applicationId=${row.application.id}`);
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
                <div className="cell-stack">
                    <div style={{ fontWeight: 600 }}>{row.application.candidateName}</div>
                    <div className="cell-stack-sub">
                        {row.application.recruitmentSourceName || "—"} · {row.daysInPipeline} ngày trong pipeline
                    </div>
                </div>
            ),
        },
        {
            title: "Hồ sơ",
            responsive: ["xl"],
            key: "profile",
            width: 220,
            render: (_, row) => {
                const c = row.candidate;
                if (!c) {
                    return (
                        <div className="cell-stack">
                            <div style={{ fontSize: 13, color: COLORS.textMuted }}>—</div>
                            <div className="cell-stack-sub" />
                        </div>
                    );
                }
                const skills = c.skillNames.length > 0
                    ? c.skillNames.slice(0, 3).join(" · ")
                    + (c.skillNames.length > 3 ? ` +${c.skillNames.length - 3}` : "")
                    : "";
                return (
                    <Tooltip title={c.skillNames.join(", ") || undefined}>
                        <div className="cell-stack">
                            <div style={{ fontSize: 13 }}>{c.currentPosition || "Chưa ghi vị trí"}</div>
                            <div className="cell-stack-sub">{skills}</div>
                        </div>
                    </Tooltip>
                );
            },
        },
        {
            title: "Vòng hiện tại",
            responsive: ["lg"],
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
            responsive: ["lg"],
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
            responsive: ["lg"],
            key: "salaryProposed",
            width: 140,
            sorter: (a, b) => (a.salaryProposed ?? -1) - (b.salaryProposed ?? -1),
            render: (_, row) =>
                row.salaryProposed == null
                    ? <span style={{ color: COLORS.textMuted }}>Chưa đề xuất</span>
                    : formatMoney(row.salaryProposed),
        },
        {
            title: "Đề nghị",
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
                    Xem đề nghị
                </Button>
            );
        }
        if (!offerStage) {
            return (
                <Tooltip title="Quy trình tuyển dụng của tin này không có vòng Đề nghị nhận việc">
                    <Button size="small" disabled>Chọn gửi đề nghị</Button>
                </Tooltip>
            );
        }
        if (headcountExhausted) {
            return (
                <Tooltip title="Tin tuyển dụng đã dùng hết số lượng tuyển">
                    <Button size="small" disabled>Chọn gửi đề nghị</Button>
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
                {atOfferStage ? "Tạo đề nghị" : "Chọn gửi đề nghị"}
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
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, flexWrap: "wrap", marginBottom: 12,
            }}>
                {showHeader ? (
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                        <TrophyOutlined style={{ marginRight: 8, color: COLORS.textMuted }} />
                        So sánh ứng viên ({rows.length})
                    </div>
                ) : <span />}

                <Space wrap>
                    <Button
                        icon={<ColumnWidthOutlined />}
                        disabled={selectedIds.length < 2}
                        onClick={() => setDetailOpen(true)}
                    >
                        {selectedIds.length < 2
                            ? "Chọn 2 ứng viên để so sánh chi tiết"
                            : `So sánh chi tiết (${selectedIds.length})`}
                    </Button>

                    {headcount != null && (
                        <div style={{
                            fontSize: 13,
                            padding: "6px 12px",
                            borderRadius: 8,
                            background: headcountExhausted ? "#FEF2F2" : "#F0FDF4",
                            border: `1px solid ${headcountExhausted ? "#FECACA" : "#BBF7D0"}`,
                            color: COLORS.textSecondary,
                        }}>
                            Suất tuyển: <b>{acceptedOfferCount} / {headcount}</b> đã tuyển
                            {" · "}Offer đang chờ: <b>{pendingOfferCount}</b>
                        </div>
                    )}
                </Space>
            </div>

            {headcountExhausted && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message={`Tin này đã dùng hết ${headcount} suất tuyển`}
                    description="Muốn gửi đề nghị cho ứng viên khác, hãy hủy một đề nghị đang xử lý hoặc tăng số lượng tuyển trong yêu cầu tuyển dụng. Đề nghị bị ứng viên từ chối sẽ tự trả lại suất."
                />
            )}

            <Modal
                open={detailOpen}
                onCancel={() => setDetailOpen(false)}
                footer={null}
                width={Math.min(360 + selectedRows.length * 260, 1200)}
                title={`So sánh chi tiết ${selectedRows.length} ứng viên`}
                destroyOnHidden
            >
                <ComparisonColumns
                    rows={selectedRows}
                    onPick={(row) => { setDetailOpen(false); selectForOffer(row); }}
                    canPick={!headcountExhausted && !!offerStage}
                />
            </Modal>

            <Table
                rowKey={(row) => row.application.id}
                size="small"
                columns={columns}
                dataSource={rows}
                scroll={{ x: "max-content" }}
                pagination={false}
                rowSelection={{
                    selectedRowKeys: selectedIds,
                    onChange: (keys) => setSelectedIds(keys as number[]),
                    getCheckboxProps: (row) => ({
                        disabled: selectedIds.length >= MAX_COMPARE
                            && !selectedIds.includes(row.application.id),
                    }),
                }}
                expandable={{
                    expandedRowRender: (row) => <EvaluationDetail row={row} />,
                    rowExpandable: (row) => row.evaluations.length > 0,
                }}
                locale={{
                    emptyText: loading ? <span /> : (
                        <EmptyState
                            title="Chưa có ứng viên nào để so sánh"
                            description="Bảng chỉ hiện ứng viên chưa kết thúc quy trình và đã có ít nhất một đánh giá phỏng vấn được nộp."
                        />
                    ),
                }}
            />
        </div>
    );
}

/**
 * Mỗi ứng viên một cột, tiêu chí xếp thành hàng ngang — đọc ngang một hàng là so được
 * cùng một tiêu chí giữa những người đang cân nhắc, thay vì quét chéo như bảng theo dòng.
 */
function ComparisonColumns({
    rows, onPick, canPick,
}: {
    rows: ComparisonRow[];
    onPick: (row: ComparisonRow) => void;
    canPick: boolean;
}) {
    // Gộp tiêu chí của mọi người được chọn; ai không có tiêu chí nào thì ô đó để trống.
    const criteriaNames = Array.from(new Set(
        rows.flatMap((r) => r.readable.flatMap((e) => e.scores.map((s) => s.criteriaName))),
    ));

    const criteriaAverage = (row: ComparisonRow, name: string) => {
        const scores = row.readable
            .flatMap((e) => e.scores)
            .filter((s) => s.criteriaName === name)
            .map((s) => s.score);
        return scores.length === 0 ? null : average(scores);
    };

    const cellStyle: React.CSSProperties = {
        padding: "8px 10px",
        borderBottom: `1px solid ${COLORS.borderLight}`,
        verticalAlign: "top",
        fontSize: 13,
    };
    const labelStyle: React.CSSProperties = {
        ...cellStyle,
        color: COLORS.textSecondary,
        fontWeight: 500,
        whiteSpace: "nowrap",
    };

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th style={{ ...labelStyle, width: 180, textAlign: "left" }} />
                        {rows.map((r) => (
                            <th key={r.application.id} style={{ ...cellStyle, minWidth: 220, textAlign: "left" }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.application.candidateName}</div>
                                <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                                    {r.application.currentStageName}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={labelStyle}>Vị trí hiện tại</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>
                                {r.candidate?.currentPosition || "—"}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Học vấn</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>
                                {r.candidate?.educationLevelName || "—"}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Kỹ năng</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>
                                {r.candidate && r.candidate.skillNames.length > 0 ? (
                                    <Space size={4} wrap>
                                        {r.candidate.skillNames.map((skill) => (
                                            <Tag key={skill} style={{ margin: 0 }}>{skill}</Tag>
                                        ))}
                                    </Space>
                                ) : "—"}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Nguồn tuyển</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>
                                {r.application.recruitmentSourceName || "—"}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Đề xuất của hội đồng</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>
                                <Space size={4} wrap>
                                    {r.readable.filter((e) => e.overallRecommendation).map((e) => (
                                        <Tooltip key={e.id} title={e.interviewerName}>
                                            <Tag
                                                color={RECOMMENDATION_COLOR[e.overallRecommendation!]}
                                                style={{ margin: 0 }}
                                            >
                                                {RECOMMENDATION_LABEL[e.overallRecommendation!]}
                                            </Tag>
                                        </Tooltip>
                                    ))}
                                    {r.readable.length === 0 && <span style={{ color: COLORS.textMuted }}>—</span>}
                                </Space>
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Điểm đề xuất</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={{ ...cellStyle, fontWeight: 600 }}>
                                {r.recommendationScore == null ? "—" : `${r.recommendationScore.toFixed(2)} / 4`}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Điểm TB tiêu chí</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={{ ...cellStyle, fontWeight: 600 }}>
                                {r.averageCriteriaScore == null ? "—" : `${r.averageCriteriaScore.toFixed(2)} / 5`}
                            </td>
                        ))}
                    </tr>

                    {criteriaNames.map((name) => {
                        const values = rows.map((r) => criteriaAverage(r, name));
                        const best = Math.max(...values.map((v) => v ?? -1));
                        return (
                            <tr key={name}>
                                <td style={labelStyle}>{name}</td>
                                {rows.map((r, i) => {
                                    const v = values[i];
                                    // Tô đậm người cao điểm nhất của tiêu chí, chỉ khi có chênh lệch thật.
                                    const isBest = v != null && v === best && values.some((x) => (x ?? -1) < best);
                                    return (
                                        <td
                                            key={r.application.id}
                                            style={{
                                                ...cellStyle,
                                                fontWeight: isBest ? 700 : 400,
                                                color: isBest ? COLORS.success : undefined,
                                            }}
                                        >
                                            {v == null ? "—" : v.toFixed(1)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}

                    <tr>
                        <td style={labelStyle}>Lương đề xuất</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>
                                {r.salaryProposed == null ? "Chưa đề xuất" : formatMoney(r.salaryProposed)}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Thời gian trong pipeline</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>{r.daysInPipeline} ngày</td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Trạng thái đề nghị</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={cellStyle}>
                                {r.offer
                                    ? <Tag color={statusMeta(OFFER_STATUS, r.offer.status).color} style={{ margin: 0 }}>
                                        {statusMeta(OFFER_STATUS, r.offer.status).label}
                                    </Tag>
                                    : <span style={{ color: COLORS.textMuted }}>Chưa có</span>}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle}>Nhận xét</td>
                        {rows.map((r) => (
                            <td key={r.application.id} style={{ ...cellStyle, whiteSpace: "pre-wrap" }}>
                                {r.readable.filter((e) => e.generalComment).map((e) => (
                                    <div key={e.id} style={{ marginBottom: 6 }}>
                                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{e.interviewerName}</div>
                                        {e.generalComment}
                                    </div>
                                ))}
                                {r.readable.every((e) => !e.generalComment) && (
                                    <span style={{ color: COLORS.textMuted }}>—</span>
                                )}
                            </td>
                        ))}
                    </tr>

                    <tr>
                        <td style={labelStyle} />
                        {rows.map((r) => {
                            const hasActiveOffer = r.offer != null && ACTIVE_OFFER_STATUSES.includes(r.offer.status);
                            return (
                                <td key={r.application.id} style={{ ...cellStyle, borderBottom: "none" }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        block
                                        disabled={!canPick || hasActiveOffer}
                                        onClick={() => onPick(r)}
                                    >
                                        {hasActiveOffer ? "Đã có đề nghị" : "Chọn người này"}
                                    </Button>
                                </td>
                            );
                        })}
                    </tr>
                </tbody>
            </table>
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
    candidate: CandidateResponse | null,
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
        candidate,
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
