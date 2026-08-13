import { useCallback, useEffect, useState } from "react";
import { Table, Button, Space, Select, Modal, Form, Input, App, Tag } from "antd";
import type { AxiosError } from "axios";
import {
    getApplications,
    advanceApplicationStage,
    rejectApplication,
} from "../applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { ApplicationResponse, ApiMessageResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";

export default function ApplicationsPage() {
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    const [rows, setRows] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [jobPostingId, setJobPostingId] = useState<number | undefined>();
    const [rejectOpen, setRejectOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [reasons, setReasons] = useState<{ id: number; name: string }[]>([]);
    const [rejectForm] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getApplications(jobPostingId ? { jobPostingId } : undefined);
            setRows(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được danh sách");
        } finally {
            setLoading(false);
        }
    }, [jobPostingId, message]);

    useEffect(() => {
        load();
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setReasons(r.data as any));
    }, [load]);

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
        { title: "Job Posting ID", dataIndex: "jobPostingId", key: "jobPostingId" },
        {
            title: "Giai đoạn",
            key: "stage",
            render: (_: unknown, r: ApplicationResponse) => (
                <Tag>{r.currentStageName}</Tag>
            ),
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
            <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} />

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