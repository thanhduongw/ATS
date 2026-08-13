import { useCallback, useEffect, useState } from "react";
import { Card, Button, List, App, Select, Space, Typography, Tag, Empty, Spin } from "antd";
import { SendOutlined, DollarOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getPostings } from "../../recruitment/recruitmentApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { applyToJob } from "../applicationApi";
import { ensureMyCandidateProfile } from "../candidateApi";
import { getMyProfile } from "../../auth/authApi";
import type { JobPostingResponse } from "../../recruitment/types";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse } from "../types";

const { Text, Title } = Typography;

export default function JobsPage() {
    const { message } = App.useApp();
    const [jobs, setJobs] = useState<JobPostingResponse[]>([]);
    const [sources, setSources] = useState<CatalogItem[]>([]);
    const [sourceId, setSourceId] = useState<number | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [applyingId, setApplyingId] = useState<number | null>(null);
    const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Đảm bảo user CANDIDATE đã có hồ sơ candidate trước khi apply
            const profile = await getMyProfile();
            await ensureMyCandidateProfile({ email: profile.data.email, fullName: profile.data.fullName });

            const [postingRes, sourceRes] = await Promise.all([
                getPostings(),
                getCatalogItems("/masterdata/recruitment-sources"),
            ]);
            setJobs(postingRes.data.filter((p) => p.status === "OPEN"));
            setSources(sourceRes.data);
            if (sourceRes.data.length > 0) setSourceId(sourceRes.data[0].id);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được danh sách việc làm");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        load();
    }, [load]);

    const handleApply = async (jobPostingId: number) => {
        if (!sourceId) {
            message.warning("Vui lòng chọn nguồn ứng tuyển");
            return;
        }
        setApplyingId(jobPostingId);
        try {
            await applyToJob({ jobPostingId, recruitmentSourceId: sourceId });
            message.success("Nộp hồ sơ thành công! Theo dõi trạng thái tại mục 'Đơn của tôi'.");
            setAppliedIds((prev) => new Set(prev).add(jobPostingId));
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Nộp hồ sơ thất bại");
        } finally {
            setApplyingId(null);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Việc làm đang tuyển</Title>
                <Text type="secondary">Chọn nguồn bạn biết đến tin này rồi bấm Ứng tuyển</Text>
            </div>

            <Space style={{ marginBottom: 16 }}>
                <Text>Nguồn ứng tuyển:</Text>
                <Select
                    style={{ width: 220 }}
                    value={sourceId}
                    onChange={setSourceId}
                    options={sources.map((s) => ({ value: s.id, label: s.name as string }))}
                />
            </Space>

            {jobs.length === 0 ? (
                <Card style={{ textAlign: "center", padding: "60px 0", borderRadius: 12 }}>
                    <Empty description="Hiện chưa có tin tuyển dụng nào đang mở" />
                </Card>
            ) : (
                <List
                    dataSource={jobs}
                    renderItem={(job) => {
                        const applied = appliedIds.has(job.id);
                        return (
                            <List.Item key={job.id}>
                                <Card style={{ width: "100%", borderRadius: 12 }} size="small">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                                        <div style={{ flex: 1 }}>
                                            <Title level={4} style={{ margin: 0 }}>{job.title}</Title>
                                            <Space style={{ marginTop: 6 }}>
                                                <Tag color="success">Đang mở</Tag>
                                                {(job.salaryMin || job.salaryMax) && (
                                                    <Tag icon={<DollarOutlined />}>
                                                        {job.salaryMin ?? "?"} – {job.salaryMax ?? "?"}
                                                    </Tag>
                                                )}
                                            </Space>
                                            {job.description && (
                                                <div style={{ marginTop: 10, color: "#4B5563" }}>{job.description}</div>
                                            )}
                                        </div>
                                        <Button
                                            type="primary"
                                            icon={<SendOutlined />}
                                            loading={applyingId === job.id}
                                            disabled={applied}
                                            onClick={() => handleApply(job.id)}
                                        >
                                            {applied ? "Đã nộp" : "Ứng tuyển"}
                                        </Button>
                                    </div>
                                </Card>
                            </List.Item>
                        );
                    }}
                />
            )}
        </div>
    );
}