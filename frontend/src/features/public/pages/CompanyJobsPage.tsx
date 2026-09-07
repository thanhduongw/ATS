import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Card, Empty, Select, Space, Spin, Tag, Typography } from "antd";
import { BankOutlined, CalendarOutlined, DollarOutlined, SendOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { getPublicCompany, getPublicJobs } from "../publicApi";
import type { ApiMessageResponse, PublicCompanyResponse, PublicJobPosting } from "../types";
import { COLORS } from "../../../app/theme";

const { Paragraph, Text, Title } = Typography;

function formatSalary(min: number | null, max: number | null): string {
    if (min == null && max == null) return "Thỏa thuận";
    const fmt = (value: number) => value.toLocaleString("vi-VN") + " VND";
    if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`;
    return min != null ? `Từ ${fmt(min)}` : `Đến ${fmt(max!)}`;
}

export default function CompanyJobsPage() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [company, setCompany] = useState<PublicCompanyResponse | null>(null);
    const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
    const [loading, setLoading] = useState(true);
    const [employmentType, setEmploymentType] = useState<string>();
    const [workLocation, setWorkLocation] = useState<string>();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [companyResponse, jobsResponse] = await Promise.all([
                getPublicCompany(),
                getPublicJobs(),
            ]);
            setCompany(companyResponse.data);
            setJobs(jobsResponse.data);
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không tải được trang tuyển dụng");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => { load(); }, [load]);

    const employmentOptions = useMemo(() =>
        [...new Set(jobs.map((job) => job.employmentTypeName).filter(Boolean))]
            .map((value) => ({ label: value!, value: value! })), [jobs]);
    const locationOptions = useMemo(() =>
        [...new Set(jobs.map((job) => job.workLocationName).filter(Boolean))]
            .map((value) => ({ label: value!, value: value! })), [jobs]);
    const filteredJobs = jobs.filter((job) =>
        (!employmentType || job.employmentTypeName === employmentType) &&
        (!workLocation || job.workLocationName === workLocation));

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin size="large" /></div>;
    if (!company) return <Empty description="Không tải được thông tin doanh nghiệp" />;

    return (
        <div>
            <section style={{ padding: "20px 0 32px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <Space align="start" size={20}>
                    {company.logoUrl ? (
                        <img src={company.logoUrl} alt={company.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                    ) : <BankOutlined style={{ fontSize: 48, color: COLORS.primary }} />}
                    <div>
                        <Title level={2} style={{ margin: 0 }}>{company.name}</Title>
                        {company.description && <Paragraph style={{ maxWidth: 720 }}>{company.description}</Paragraph>}
                        <Text strong>{jobs.length} vị trí đang tuyển</Text>
                    </div>
                </Space>
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "28px 0 16px" }}>
                <Title level={4} style={{ margin: 0 }}>Việc làm đang mở</Title>
                <Space wrap>
                    <Select allowClear placeholder="Loại hình" style={{ width: 180 }} options={employmentOptions} value={employmentType} onChange={setEmploymentType} />
                    <Select allowClear placeholder="Địa điểm" style={{ width: 180 }} options={locationOptions} value={workLocation} onChange={setWorkLocation} />
                </Space>
            </div>

            {filteredJobs.length === 0 ? (
                <Empty description="Hiện chưa có vị trí đang mở" />
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                    {filteredJobs.map((job) => (
                        <Card key={job.id} hoverable onClick={() => navigate(`/careers/jobs/${job.id}`)} style={{ height: "100%", borderRadius: 8 }}>
                            <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                    <Title level={5} style={{ margin: 0 }}>{job.title}</Title>
                                    <Tag color="green">Đang mở</Tag>
                                </div>
                                <Text type="secondary"><DollarOutlined /> {formatSalary(job.salaryMin, job.salaryMax)}</Text>
                                {job.publishedAt && <Text type="secondary"><CalendarOutlined /> {new Date(job.publishedAt).toLocaleDateString("vi-VN")}</Text>}
                                <Space wrap>
                                    {job.employmentTypeName && <Tag>{job.employmentTypeName}</Tag>}
                                    {job.workLocationName && <Tag>{job.workLocationName}</Tag>}
                                </Space>
                                {job.description && <Paragraph ellipsis={{ rows: 2 }}>{job.description}</Paragraph>}
                                <Button type="primary" block icon={<SendOutlined />}>Xem chi tiết</Button>
                            </Space>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
