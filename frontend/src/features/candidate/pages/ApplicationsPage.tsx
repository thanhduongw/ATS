import { useCallback, useEffect, useRef, useState, type Key } from "react";
import { departmentLabel } from "../../overview/useCompanyOverview";
import { Table, Button, Select, Modal, Form, Input, App, Tooltip } from "antd";
import type { ColumnsType, SortOrder } from "antd/es/table/interface";
import { useSearchParams } from "react-router-dom";
import { getCandidates } from "../candidateApi";
import { useTrailNavigate } from "../../../app/useNavTrail";
import type { AxiosError } from "axios";
import {
    getApplications,
    bulkAdvanceApplicationStage,
    bulkRejectApplications,
    bulkAssignApplicationRecruiter,
} from "../applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import { getUserDirectory } from "../../auth/authApi";
import type { ApplicationResponse, ApiMessageResponse, BulkOperationResponse } from "../types";
import type { JobPostingResponse } from "../../recruitment/types";
import type { CatalogItem } from "../../masterdata/types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole, UserDirectoryResponse } from "../../auth/types";
import { FIXED_STAGE_LABEL, fixedStageLabel, stageTypeFilterOf } from "../../../app/stages";
import { FIXED_STAGES } from "../../../app/theme";
import StageTag from "../../../components/ui/StageTag";
import { exportToExcel } from "../../../app/exportExcel";
import {
    DownloadOutlined, UserAddOutlined, CloseOutlined, PlusOutlined, RobotOutlined, SearchOutlined,
} from "@ant-design/icons";
import { COLORS, type FixedStage } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { ModalTitle } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { rowArrowColumn, useStatusCounts } from "../../../components/ui/listHelpers";
import { Avatar } from "../../../components/ui/designKit";
import { fullDate } from "../../../app/datetime";
import CandidateFormModal from "../components/CandidateFormModal";
import { useMyInterviewStatus } from "../useMyInterviewStatus";
import StatusTag from "../../../components/ui/StatusTag";
import AiCvUploadModal from "../../ai/components/AiCvUploadModal";
import AiScoreBadge from "../../ai/components/AiScoreBadge";
import { AI_TIER_OPTIONS, aiTierMeta } from "../../ai/aiScore";
import { rescorePosting } from "../../ai/aiApi";
import { useFitPageSize } from "../../../components/ui/useFitPageSize";
import type { CandidateFormValues } from "../schemas/candidateSchema";

/** Bộ lọc giai đoạn theo 6 nhóm cố định (DS06) — giá trị là danh sách stageType gửi lên API. */
const STAGE_FILTER_OPTIONS = FIXED_STAGES.map((g) => ({ value: stageTypeFilterOf(g), label: FIXED_STAGE_LABEL[g] }));

/** R16: 4 tab. "Đang trong quy trình" = mọi giai đoạn trừ Đã tuyển và Từ chối. */
type Tab = "ACTIVE" | "HIRED" | "REJECTED" | "ALL";
const ACTIVE_STAGES: FixedStage[] = FIXED_STAGES.filter((s) => s !== "HIRED" && s !== "REJECTED");
const TAB_STAGE_FILTER: Record<Tab, string | undefined> = {
    ACTIVE: ACTIVE_STAGES.map(stageTypeFilterOf).join(","),
    HIRED: stageTypeFilterOf("HIRED"),
    REJECTED: stageTypeFilterOf("REJECTED"),
    ALL: undefined,
};
const TAB_KEYS: Tab[] = ["ACTIVE", "HIRED", "REJECTED", "ALL"];
const TAB_LABEL: Record<Tab, string> = { ACTIVE: "Đang trong quy trình", HIRED: "Đã tuyển", REJECTED: "Từ chối", ALL: "Tất cả" };



export default function ApplicationsPage() {
    const { message, modal } = App.useApp();
    const openApplication = useTrailNavigate();
    const [searchParams] = useSearchParams();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);
    const isHm = role === "HIRING_MANAGER";
    const myId = useAppSelector((s) => (s.auth.user?.userId ? Number(s.auth.user.userId) : null));
    const myDeptId = useAppSelector((s) => s.auth.user?.departmentId ?? null);
    const [myDeptName, setMyDeptName] = useState<string | null>(null);

    const [rows, setRows] = useState<ApplicationResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);

    // Bộ lọc (R16): tab trạng thái, tìm kiếm, Việc làm, Giai đoạn, Điểm AI
    const [tab, setTab] = useState<Tab>("ACTIVE");
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [jobPostingId, setJobPostingId] = useState<number | undefined>(
        () => (searchParams.get("jobPostingId") ? Number(searchParams.get("jobPostingId")) : undefined),
    );
    const [stageType, setStageType] = useState<string | undefined>(
        () => searchParams.get("stageType") ?? undefined,
    );
    const [aiTier, setAiTier] = useState<string | undefined>();
    /** Sắp xếp phía server theo điểm AI; undefined = mới nộp trước. */
    const [aiScoreOrder, setAiScoreOrder] = useState<SortOrder>(null);
    const [rescoringPosting, setRescoringPosting] = useState(false);

    // Phân trang
    const [page, setPage] = useState(1);
    // Số dòng/trang vừa khít màn hình (phân trang phía server — đổi cỡ cửa sổ thì tải lại đúng số dòng).
    const tableRef = useRef<HTMLDivElement>(null);
    const pageSize = useFitPageSize(tableRef, {
        itemSelector: ".ant-table-tbody > tr.ant-table-row",
        headerSelector: ".ant-table-thead",
        fallbackItem: 57,
        deps: [rows.length],
    });

    // Nguồn dữ liệu cho các dropdown lọc
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    /** candidateId -> email/phone, vì ApplicationResponse không mang sẵn thông tin liên hệ. */
    const [contactById, setContactById] = useState<Map<number, { email: string; phone: string }>>(new Map());
    const [recruiters, setRecruiters] = useState<UserDirectoryResponse[]>([]);
    // AI doc CV tra ve ten ky nang/hoc van dang chuoi; can danh muc de anh xa sang id.
    const [skills, setSkills] = useState<CatalogItem[]>([]);
    const [educationLevels, setEducationLevels] = useState<CatalogItem[]>([]);
    const [reasons, setReasons] = useState<CatalogItem[]>([]);

    // Bulk actions
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkForm] = Form.useForm();
    const [bulkAssignForm] = Form.useForm();
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    // Them ung vien thu cong, hoac de AI doc CV roi dien san vao chinh form do.
    const [candidateFormOpen, setCandidateFormOpen] = useState(false);
    const [aiUploadOpen, setAiUploadOpen] = useState(false);
    const [aiPrefill, setAiPrefill] = useState<Partial<CandidateFormValues> | null>(null);
    const [aiPrefillFile, setAiPrefillFile] = useState<File | null>(null);

    // Debounce ô tìm kiếm
    useEffect(() => {
        const h = setTimeout(() => { setKeyword(searchInput.trim()); setPage(1); }, 400);
        return () => clearTimeout(h);
    }, [searchInput]);

    /** Giai đoạn chọn ở bộ lọc thắng tab; không chọn thì lấy theo tab. */
    const effectiveStage = stageType ?? TAB_STAGE_FILTER[tab];

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getApplications({
                jobPostingId,
                stageType: effectiveStage,
                keyword: keyword || undefined,
                aiTier,
                sort: aiScoreOrder ? `aiScore,${aiScoreOrder === "ascend" ? "asc" : "desc"}` : undefined,
                page: page - 1,
                size: pageSize,
            });
            setRows(res.data.content);
            setTotalItems(res.data.totalItems);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được danh sách");
        } finally {
            setLoading(false);
        }
    }, [jobPostingId, effectiveStage, keyword, aiTier, aiScoreOrder, page, pageSize, message]);

    // Số trên tab = totalItems của API với cùng bộ lọc (trừ giai đoạn).
    const tabCounts = useStatusCounts<Tab>(TAB_KEYS, (k) => getApplications({
        jobPostingId, keyword: keyword || undefined, aiTier, stageType: TAB_STAGE_FILTER[k], size: 1,
    }).then((r) => r.data.totalItems), [jobPostingId, keyword, aiTier, rows]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setReasons(r.data));
        getCatalogItems("/masterdata/skills").then((r) => setSkills(r.data));
        getCatalogItems("/masterdata/education-levels").then((r) => setEducationLevels(r.data));
        getPostings({ size: 1000 }).then((r) => setPostings(r.data.content));
        if (myDeptId != null) {
            getCatalogItems("/masterdata/departments")
                .then((r) => setMyDeptName(String(r.data.find((d) => d.id === myDeptId)?.name ?? "")))
                .catch(() => undefined);
        }
        getUserDirectory("RECRUITER").then((r) => setRecruiters(r.data));
        getCandidates({ size: 1000 })
            .then((r) => setContactById(new Map(
                r.data.content.map((c) => [c.id, { email: c.email ?? "", phone: c.phone ?? "" }]),
            )))
            // Thieu lien he chi lam mat hai dong phu, khong duoc chan danh sach.
            .catch(() => setContactById(new Map()));
    }, [myDeptId]);

    const myInterview = useMyInterviewStatus(isHm, myId, rows.map((r) => r.id));

    const reportBulkResult = (result: BulkOperationResponse) => {
        const failedCount = Object.keys(result.failedIds).length;
        if (failedCount === 0) {
            message.success(`Đã xử lý thành công ${result.succeededIds.length} hồ sơ`);
        } else {
            message.warning(
                `Thành công ${result.succeededIds.length} hồ sơ, thất bại ${failedCount} hồ sơ (xem lý do trong console)`
            );
            console.warn("Bulk action failures:", result.failedIds);
        }
        setSelectedRowKeys([]);
        load();
    };

    const handleBulkAdvance = () => {
        modal.confirm({
            title: `Chuyển vòng cho ${selectedRowKeys.length} hồ sơ đã chọn?`,
            content: "Mỗi hồ sơ sẽ được chuyển sang giai đoạn kế tiếp trong quy trình tuyển dụng của nó.",
            okText: "Chuyển vòng",
            onOk: async () => {
                const res = await bulkAdvanceApplicationStage(selectedRowKeys as number[], "Chuyển vòng hàng loạt");
                reportBulkResult(res.data);
            },
        });
    };

    const handleBulkReject = async () => {
        const values = await bulkForm.validateFields();
        setBulkSubmitting(true);
        try {
            const res = await bulkRejectApplications(selectedRowKeys as number[], values.rejectionReasonId, values.note);
            setBulkRejectOpen(false);
            bulkForm.resetFields();
            reportBulkResult(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleBulkAssign = async () => {
        const values = await bulkAssignForm.validateFields();
        setBulkSubmitting(true);
        try {
            const res = await bulkAssignApplicationRecruiter(selectedRowKeys as number[], values.assignedRecruiterId);
            setBulkAssignOpen(false);
            bulkAssignForm.resetFields();
            reportBulkResult(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleRescorePosting = () => {
        if (jobPostingId == null) return;
        const title = postings.find((p) => p.id === jobPostingId)?.title ?? `tin #${jobPostingId}`;
        modal.confirm({
            title: `AI chấm các hồ sơ của "${title}"?`,
            content: "Chỉ chấm hồ sơ chưa có điểm hoặc chấm lỗi; hồ sơ đã có điểm được giữ nguyên. "
                + "AI chạy nền, mỗi hồ sơ mất khoảng 10–40 giây.",
            okText: "Chấm",
            onOk: async () => {
                setRescoringPosting(true);
                try {
                    const res = await rescorePosting(jobPostingId);
                    const { queued, skipped } = res.data;
                    message.success(queued > 0
                        ? `Đã đưa ${queued} hồ sơ vào hàng chờ chấm${skipped ? ` (bỏ qua ${skipped} hồ sơ đã có điểm hoặc đang chấm)` : ""}`
                        : "Mọi hồ sơ của tin này đã có điểm hoặc đang được chấm");
                    // Trạng thái "chờ chấm" tới danh sách qua hàng đợi sự kiện — đợi một nhịp rồi tải lại.
                    if (queued > 0) setTimeout(load, 1500);
                } catch (err) {
                    const e = err as AxiosError<{ detail?: string }>;
                    message.error(e.response?.data?.detail ?? "Không gửi được yêu cầu chấm");
                } finally {
                    setRescoringPosting(false);
                }
            },
        });
    };

    const hasActiveFilters = !!(jobPostingId || stageType || aiTier || keyword);

    const handleResetFilters = () => {
        setJobPostingId(undefined);
        setStageType(undefined);
        setAiTier(undefined);
        setSearchInput("");
        setKeyword("");
        setPage(1);
    };

    const columns: ColumnsType<ApplicationResponse> = [
        {
            title: "Ứng viên",
            key: "candidateName",
            width: 320,
            render: (_, r) => {
                const contact = contactById.get(r.candidateId);
                const line = [contact?.email, contact?.phone].filter(Boolean).join(" · ");
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={r.candidateName} colorKey={r.candidateId} size={32} />
                        <div className="cell-stack">
                            <div style={{ fontWeight: 600, color: COLORS.textPrimary }}>{r.candidateName}</div>
                            <Tooltip title={line || undefined}>
                                <div className="cell-stack-sub">{line}</div>
                            </Tooltip>
                        </div>
                    </div>
                );
            },
        },
        {
            title: "Việc làm",
            key: "jobTitle",
            ellipsis: true,
            render: (_, r) => <span style={{ fontWeight: 500 }}>{r.jobTitle || `Job #${r.jobPostingId}`}</span>,
        },
        {
            title: "Giai đoạn",
            key: "stage",
            width: 160,
            render: (_, r) => <StageTag stageType={r.currentStageType} />,
        },
        {
            title: "Điểm AI",
            key: "aiScore",
            width: 170,
            sorter: true,
            sortOrder: aiScoreOrder,
            sortDirections: ["descend", "ascend"],
            render: (_, r) => <AiScoreBadge score={r.aiScore} tier={r.aiTier} status={r.aiStatus} />,
        },
        ...(isHm ? [{
            title: "Phỏng vấn của bạn",
            key: "myInterview",
            width: 220,
            render: (_: unknown, r: ApplicationResponse) => {
                const s = myInterview(r.id);
                if (!s) return <span style={{ color: COLORS.textMuted }}>—</span>;
                return s.tone ? <StatusTag tone={s.tone} label={s.text} /> : <span>{s.text}</span>;
            },
        }] : []),
        {
            title: "Ngày ứng tuyển",
            dataIndex: "appliedAt",
            key: "appliedAt",
            width: 140,
            render: (v: string) => fullDate(v),
        },
        rowArrowColumn,
    ];

    const handleExportExcel = () => {
        exportToExcel(
            "ho-so-ung-tuyen",
            [
                { header: "Ứng viên", value: (r: ApplicationResponse) => r.candidateName },
                { header: "Vị trí ứng tuyển", value: (r: ApplicationResponse) => r.jobTitle || `Job #${r.jobPostingId}` },
                { header: "Giai đoạn", value: (r: ApplicationResponse) => fixedStageLabel(r.currentStageType) },
                { header: "Người phụ trách", value: (r: ApplicationResponse) => r.assignedRecruiterName },
                { header: "Nguồn", value: (r: ApplicationResponse) => r.recruitmentSourceName },
                { header: "Điểm AI", value: (r: ApplicationResponse) => r.aiScore ?? "" },
                { header: "Xếp loại AI", value: (r: ApplicationResponse) => aiTierMeta(r.aiTier)?.label ?? "" },
                { header: "Ngày nộp", value: (r: ApplicationResponse) => new Date(r.appliedAt).toLocaleDateString("vi-VN") },
            ],
            rows,
        );
    };

    return (
        <ListPage
            title="Ứng viên"
            subtitle={isHm ? `${myDeptName ? `${departmentLabel(myDeptName)} · ` : ""}bạn xem hồ sơ và nộp đánh giá khi được phân công phỏng vấn` : undefined}
            actions={
                <>
                    <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>Xuất Excel</Button>
                    {isHr && jobPostingId != null && (
                        <Tooltip title="Chấm các hồ sơ chưa có điểm hoặc chấm lỗi của việc làm đang lọc">
                            <Button icon={<RobotOutlined />} loading={rescoringPosting} onClick={handleRescorePosting}>
                                AI chấm hồ sơ của việc làm
                            </Button>
                        </Tooltip>
                    )}
                    {isHr && <Button icon={<RobotOutlined />} onClick={() => setAiUploadOpen(true)}>AI đọc CV</Button>}
                    {isHr && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCandidateFormOpen(true)}>
                            Thêm ứng viên
                        </Button>
                    )}
                </>
            }
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={(k) => { setTab(k); setStageType(undefined); setPage(1); }}
                    items={TAB_KEYS.map((k) => ({ key: k, label: TAB_LABEL[k], count: tabCounts[k] }))}
                />
            }
            filters={
                <ListFilters extra={hasActiveFilters ? <Button type="link" onClick={handleResetFilters}>Xoá bộ lọc</Button> : undefined}>
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Tìm theo tên hoặc email"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{ width: 280 }}
                    />
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Việc làm"
                        style={{ width: 240 }}
                        value={jobPostingId}
                        onChange={(v) => { setJobPostingId(v); setPage(1); }}
                        options={postings.map((p) => ({ value: p.id, label: p.title }))}
                    />
                    <Select
                        allowClear
                        placeholder="Giai đoạn"
                        style={{ width: 170 }}
                        value={stageType}
                        onChange={(v) => { setStageType(v); setPage(1); }}
                        options={STAGE_FILTER_OPTIONS}
                    />
                    <Select
                        allowClear
                        placeholder="Điểm AI"
                        style={{ width: 160 }}
                        value={aiTier}
                        onChange={(v) => { setAiTier(v); setPage(1); }}
                        options={AI_TIER_OPTIONS}
                    />
                </ListFilters>
            }
            footnote={`${totalItems} ứng viên · ${aiScoreOrder ? "theo điểm AI" : "cập nhật gần nhất trước"}`}
        >
            {isHr && selectedRowKeys.length > 0 && (
                <div
                    style={{
                        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                        padding: "10px 16px", marginBottom: 12, background: COLORS.primarySoft, borderRadius: 12,
                    }}
                >
                    <span>Đã chọn {selectedRowKeys.length} hồ sơ</span>
                    <Button size="small" type="primary" onClick={handleBulkAdvance}>Chuyển giai đoạn kế tiếp</Button>
                    <Button size="small" danger onClick={() => setBulkRejectOpen(true)}>Từ chối</Button>
                    <Button size="small" onClick={() => setBulkAssignOpen(true)}>Gán người phụ trách</Button>
                    <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>Bỏ chọn</Button>
                </div>
            )}

            <div ref={tableRef}>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                onChange={(_, __, sorter, extra) => {
                    if (extra.action !== "sort") return;
                    const order = Array.isArray(sorter) ? null : sorter.order ?? null;
                    setAiScoreOrder(order);
                    setPage(1);
                }}
                rowClassName={() => "row-clickable"}
                onRow={(record) => ({
                    onClick: (event) => {
                        // Bấm ô chọn hàng loạt thì chỉ tick, không mở chi tiết.
                        if ((event.target as HTMLElement).closest(".ant-table-selection-column")) return;
                        openApplication(`/candidates/${record.candidateId}/applications/${record.id}`);
                    },
                })}
                rowSelection={isHr ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
                pagination={{
                    current: page,
                    pageSize,
                    total: totalItems,
                    ...listPagination("ứng viên"),
                    showSizeChanger: false,
                    onChange: (p) => setPage(p),
                }}
                locale={{
                    emptyText: loading ? <span /> : (
                        <EmptyState
                            title="Không có ứng viên nào"
                            description="Ứng viên khớp với tab và bộ lọc hiện tại sẽ hiện ở đây."
                        />
                    ),
                }}
            />
            </div>

            <Modal
                title={
                    <ModalTitle
                        icon={<CloseOutlined />}
                        title="Từ chối hàng loạt"
                        subtitle={`${selectedRowKeys.length} hồ sơ được chọn · gửi email tự động`}
                        accent={COLORS.error}
                    />
                }
                open={bulkRejectOpen}
                onOk={handleBulkReject}
                onCancel={() => setBulkRejectOpen(false)}
                okText="Từ chối"
                cancelText="Hủy"
                confirmLoading={bulkSubmitting}
                okButtonProps={{ danger: true }}
            >
                <Form form={bulkForm} layout="vertical">
                    <Form.Item
                        name="rejectionReasonId"
                        label="Lý do"
                        rules={[{ required: true, message: "Chọn lý do" }]}
                    >
                        <Select options={reasons.map((r) => ({ value: r.id, label: String(r.name) }))} />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={
                    <ModalTitle
                        icon={<UserAddOutlined />}
                        title="Gán người phụ trách"
                        subtitle={`${selectedRowKeys.length} hồ sơ được chọn`}
                    />
                }
                open={bulkAssignOpen}
                onOk={handleBulkAssign}
                onCancel={() => setBulkAssignOpen(false)}
                okText="Gán"
                cancelText="Hủy"
                confirmLoading={bulkSubmitting}
            >
                <Form form={bulkAssignForm} layout="vertical">
                    <Form.Item
                        name="assignedRecruiterId"
                        label="Người phụ trách"
                        rules={[{ required: true, message: "Chọn người phụ trách" }]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={recruiters.map((r) => ({ value: r.id, label: r.fullName }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <CandidateFormModal
                open={candidateFormOpen}
                editingItem={null}
                initialValues={aiPrefill}
                initialFile={aiPrefillFile}
                onClose={() => {
                    setCandidateFormOpen(false);
                    setAiPrefill(null);
                    setAiPrefillFile(null);
                }}
                onSuccess={load}
            />

            <AiCvUploadModal
                open={aiUploadOpen}
                availableSkills={skills}
                availableEducationLevels={educationLevels}
                onClose={() => setAiUploadOpen(false)}
                onFillCandidate={(data, file) => {
                    setAiPrefill(data);
                    setAiPrefillFile(file ?? null);
                    setAiUploadOpen(false);
                    setCandidateFormOpen(true);
                }}
            />
        </ListPage>
    );
}
