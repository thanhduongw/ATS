import { useCallback, useEffect, useState } from "react";
import { Table, Button, Space, Select, Modal, Form, Input, App, Tag, DatePicker } from "antd";
import type { AxiosError } from "axios";
import type { Dayjs } from "dayjs";
import {
    getApplications,
    advanceApplicationStage,
    rejectApplication,
} from "../applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import { getUsers } from "../../auth/authApi";
import type { ApplicationResponse, ApiMessageResponse } from "../types";
import type { JobPostingResponse } from "../../recruitment/types";
import type { CatalogItem, StageType } from "../../masterdata/types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole, UserSummaryResponse } from "../../auth/types";
import { STAGE_TYPE_LABEL } from "../../../app/statusLabels";

const { RangePicker } = DatePicker;

const STAGE_TYPE_OPTIONS: StageType[] = [
    "APPLIED",
    "CV_SCREENING",
    "HR_SCREENING",
    "TECHNICAL_INTERVIEW",
    "HR_INTERVIEW",
    "FINAL_INTERVIEW",
    "OFFER",
    "HIRED",
    "REJECTED",
    "CUSTOM",
];

export default function ApplicationsPage() {
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    const [rows, setRows] = useState<ApplicationResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);

    // Bộ lọc
    const [jobPostingId, setJobPostingId] = useState<number | undefined>();
    const [stageType, setStageType] = useState<string | undefined>();
    const [assignedRecruiterId, setAssignedRecruiterId] = useState<number | undefined>();
    const [recruitmentSourceId, setRecruitmentSourceId] = useState<number | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    // Phân trang
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Nguồn dữ liệu cho các dropdown lọc
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [recruiters, setRecruiters] = useState<UserSummaryResponse[]>([]);
    const [sources, setSources] = useState<CatalogItem[]>([]);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [reasons, setReasons] = useState<{ id: number; name: string }[]>([]);
    const [rejectForm] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getApplications({
                jobPostingId,
                stageType,
                assignedRecruiterId,
                recruitmentSourceId,
                appliedFrom: dateRange ? dateRange[0].format("YYYY-MM-DD") : undefined,
                appliedTo: dateRange ? dateRange[1].format("YYYY-MM-DD") : undefined,
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
    }, [jobPostingId, stageType, assignedRecruiterId, recruitmentSourceId, dateRange, page, pageSize, message]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setReasons(r.data as any));
        getPostings().then((r) => setPostings(r.data));
        getUsers("RECRUITER").then((r) => setRecruiters(r.data));
        getCatalogItems("/masterdata/recruitment-sources").then((r) => setSources(r.data));
    }, []);

    const handlePass = async (id: number) => {
        try {
            await advanceApplicationStage(id, { note: "Pass sơ tuyển" });
            message.success("Đã chuyển vòng tiếp theo");
            load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        }
    };

    const handleReject = async () => {
        const values = await rejectForm.validateFields();
        if (!selectedId) return;
        try {
            await rejectApplication(selectedId, {
                rejectionReasonId: values.rejectionReasonId,
                note: values.note,
            });
            message.success("Đã từ chối hồ sơ");
            setRejectOpen(false);
            load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        }
    };

    const columns = [
        { title: "Ứng viên", dataIndex: "candidateName", key: "candidateName" },
        {
            title: "Vị trí ứng tuyển",
            key: "jobTitle",
            render: (_: unknown, r: ApplicationResponse) =>
                r.jobTitle || `Job #${r.jobPostingId}`,
        },
        {
            title: "Giai đoạn",
            key: "stage",
            render: (_: unknown, r: ApplicationResponse) => <Tag>{r.currentStageName}</Tag>,
        },
        {
            title: "Người phụ trách",
            dataIndex: "assignedRecruiterName",
            key: "assignedRecruiterName",
            render: (v: string | null) => v || "—",
        },
        {
            title: "Nguồn",
            dataIndex: "recruitmentSourceName",
            key: "recruitmentSourceName",
        },
        {
            title: "Ngày nộp",
            dataIndex: "appliedAt",
            key: "appliedAt",
            render: (v: string) => new Date(v).toLocaleDateString("vi-VN"),
        },
        {
            title: "CV",
            dataIndex: "resumeUrl",
            key: "resumeUrl",
            render: (url: string) =>
                url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                        Xem CV
                    </a>
                ) : (
                    "—"
                ),
        },
        ...(isHr
            ? [
                {
                    title: "Thao tác",
                    key: "actions",
                    render: (_: unknown, r: ApplicationResponse) =>
                        r.currentStageType === "REJECTED" || r.currentStageType === "HIRED" ? null : (
                            <Space>
                                <Button type="primary" size="small" onClick={() => handlePass(r.id)}>
                                    Pass
                                </Button>
                                <Button
                                    danger
                                    size="small"
                                    onClick={() => {
                                        setSelectedId(r.id);
                                        setRejectOpen(true);
                                    }}
                                >
                                    Reject
                                </Button>
                            </Space>
                        ),
                },
            ]
            : []),
    ];

    return (
        <div className="page-container">
            <h2>Hồ sơ ứng tuyển</h2>

            <Space wrap style={{ marginBottom: 16 }}>
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Vị trí tuyển dụng"
                    style={{ width: 220 }}
                    value={jobPostingId}
                    onChange={(v) => { setJobPostingId(v); setPage(1); }}
                    options={postings.map((p) => ({ value: p.id, label: p.title }))}
                />
                <Select
                    allowClear
                    placeholder="Giai đoạn"
                    style={{ width: 200 }}
                    value={stageType}
                    onChange={(v) => { setStageType(v); setPage(1); }}
                    options={STAGE_TYPE_OPTIONS.map((t) => ({ value: t, label: STAGE_TYPE_LABEL[t] ?? t }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Người phụ trách"
                    style={{ width: 200 }}
                    value={assignedRecruiterId}
                    onChange={(v) => { setAssignedRecruiterId(v); setPage(1); }}
                    options={recruiters.map((r) => ({ value: r.id, label: r.fullName }))}
                />
                <Select
                    allowClear
                    placeholder="Nguồn tuyển dụng"
                    style={{ width: 180 }}
                    value={recruitmentSourceId}
                    onChange={(v) => { setRecruitmentSourceId(v); setPage(1); }}
                    options={sources.map((s) => ({ value: s.id, label: String(s.name) }))}
                />
                <RangePicker
                    placeholder={["Nộp từ ngày", "Đến ngày"]}
                    value={dateRange}
                    onChange={(v) => { setDateRange(v as [Dayjs, Dayjs] | null); setPage(1); }}
                />
            </Space>

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={{
                    current: page,
                    pageSize,
                    total: totalItems,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50],
                    showTotal: (total) => `Tổng ${total} hồ sơ`,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
            />

            <Modal
                title="Từ chối hồ sơ"
                open={rejectOpen}
                onOk={handleReject}
                onCancel={() => setRejectOpen(false)}
                okText="Từ chối"
            >
                <Form form={rejectForm} layout="vertical">
                    <Form.Item
                        name="rejectionReasonId"
                        label="Lý do"
                        rules={[{ required: true, message: "Chọn lý do" }]}
                    >
                        <Select
                            options={reasons.map((r) => ({ value: r.id, label: r.name }))}
                        />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
