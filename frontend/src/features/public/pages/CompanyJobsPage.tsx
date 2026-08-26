import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Card,
    List,
    Typography,
    Tag,
    Button,
    Empty,
    Spin,
    Space,
    App,
    Statistic,
    Select,
} from "antd";
import {
    SendOutlined,
    DollarOutlined,
    CalendarOutlined,
    BankOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getPublicCompany, getPublicJobs } from "../publicApi";
import type { PublicCompanyResponse, PublicJobPosting, ApiMessageResponse } from "../types";
import { COLORS } from "../../../app/theme";

const { Title, Text, Paragraph } = Typography;

function formatSalary(min: number | null, max: number | null): string {
    if (min == null && max == null) return "Thỏa thuận";
    const fmt = (n: number) =>
        n >= 1_000_000
            ? `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} triệu`
            : n.toLocaleString("vi-VN");
    if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
    if (min != null) return `Từ ${fmt(min)}`;
    return `Đến ${fmt(max!)}`;
}

export default function CompanyJobsPage() {
    const { tenantCode } = useParams<{ tenantCode: string }>();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [company, setCompany] = useState<PublicCompanyResponse | null>(null);
    const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
    const [loading, setLoading] = useState(true);
    const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string | undefined>();
    const [workLocationFilter, setWorkLocationFilter] = useState<string | undefined>();

    const load = useCallback(async () => {
        if (!tenantCode) return;
        setLoading(true);
        try {
            const [companyRes, jobsRes] = await Promise.all([
                getPublicCompany(tenantCode),
                getPublicJobs(tenantCode),
            ]);
            setCompany(companyRes.data);
            setJobs(jobsRes.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(
                e.response?.data?.message ?? "Không tải được trang tuyển dụng"
            );
            setCompany(null);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    }, [tenantCode, message]);

    useEffect(() => {
        load();
    }, [load]);

    // Lọc phía client theo tên loại hình/địa điểm (đã có sẵn trong danh sách job) — không cần gọi lại API
    const employmentTypeOptions = Array.from(
        new Set(jobs.map((j) => j.employmentTypeName).filter((n): n is string => !!n))
    );
    const workLocationOptions = Array.from(
        new Set(jobs.map((j) => j.workLocationName).filter((n): n is string => !!n))
    );
    const filteredJobs = jobs.filter(
        (j) =>
            (!employmentTypeFilter || j.employmentTypeName === employmentTypeFilter) &&
            (!workLocationFilter || j.workLocationName === workLocationFilter)
    );

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!company) {
        return (
            <Empty
                description="Không tìm thấy công ty hoặc công ty không hoạt động"
                style={{ marginTop: 80 }}
            >
            </Empty>
        );
    }

    return (
        <div>
            {/* Hero company */}
            <Card
                style={{
                    marginBottom: 28,
                    borderRadius: 16,
                    background: company.bannerUrl
                        ? `linear-gradient(135deg, rgba(240,253,244,0.9) 0%, rgba(236,253,245,0.9) 100%), url(${company.bannerUrl}) center/cover`
                        : "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
                    border: `1px solid ${COLORS.borderLight}`,
                }}
                styles={{ body: { padding: "28px 32px" } }}
            >
                <Space align="start" size={20}>
                    {company.logoUrl ? (
                        <img
                            src={company.logoUrl}
                            alt={company.name}
                            style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 14,
                                background: COLORS.primary,
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 28,
                                fontWeight: 700,
                                flexShrink: 0,
                            }}
                        >
                            <BankOutlined />
                        </div>
                    )}
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            {company.name}
                        </Title>
                        <Text type="secondary">
                            Mã công ty: <Text code>{company.tenantCode}</Text>
                        </Text>
                        {company.description && (
                            <Paragraph style={{ marginTop: 8, marginBottom: 0, maxWidth: 640 }}>
                                {company.description}
                            </Paragraph>
                        )}
                        <div style={{ marginTop: 12 }}>
                            <Statistic
                                title="Vị trí đang tuyển"
                                value={jobs.length}
                                styles={{ content: { color: COLORS.primary, fontSize: 28 } }}
                            />
                        </div>
                    </div>
                </Space>
            </Card>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                    Việc làm đang mở
                </Title>
                {jobs.length > 0 && (
                    <Space wrap>
                        <Select
                            allowClear
                            placeholder="Loại hình"
                            style={{ width: 180 }}
                            value={employmentTypeFilter}
                            onChange={setEmploymentTypeFilter}
                            options={employmentTypeOptions.map((n) => ({ value: n, label: n }))}
                        />
                        <Select
                            allowClear
                            placeholder="Địa điểm"
                            style={{ width: 180 }}
                            value={workLocationFilter}
                            onChange={setWorkLocationFilter}
                            options={workLocationOptions.map((n) => ({ value: n, label: n }))}
                        />
                    </Space>
                )}
            </div>

            {filteredJobs.length === 0 ? (
                <Empty description="Hiện chưa có tin tuyển dụng nào đang mở" />
            ) : (
                <List
                    grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2 }}
                    dataSource={filteredJobs}
                    renderItem={(job) => (
                        <List.Item>
                            <Card
                                hoverable
                                style={{ borderRadius: 12, height: "100%" }}
                                styles={{ body: { padding: 20 } }}
                                onClick={() =>
                                    navigate(`/c/${tenantCode}/jobs/${job.id}`)
                                }
                            >
                                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <Title level={5} style={{ margin: 0, flex: 1 }}>
                                            {job.title}
                                        </Title>
                                        <Tag color="green">Đang mở</Tag>
                                    </div>

                                    <Space wrap size={[12, 4]}>
                                        <Text type="secondary">
                                            <DollarOutlined style={{ marginRight: 4 }} />
                                            {formatSalary(job.salaryMin, job.salaryMax)}
                                        </Text>
                                        {job.publishedAt && (
                                            <Text type="secondary">
                                                <CalendarOutlined style={{ marginRight: 4 }} />
                                                {new Date(job.publishedAt).toLocaleDateString("vi-VN")}
                                            </Text>
                                        )}
                                    </Space>

                                    {(job.employmentTypeName || job.workLocationName) && (
                                        <Space wrap size={4}>
                                            {job.employmentTypeName && <Tag>{job.employmentTypeName}</Tag>}
                                            {job.workLocationName && <Tag>{job.workLocationName}</Tag>}
                                        </Space>
                                    )}

                                    {job.description && (
                                        <Paragraph
                                            type="secondary"
                                            ellipsis={{ rows: 2 }}
                                            style={{ marginBottom: 0 }}
                                        >
                                            {job.description}
                                        </Paragraph>
                                    )}

                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        block
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/c/${tenantCode}/jobs/${job.id}`);
                                        }}
                                    >
                                        Ứng tuyển ngay
                                    </Button>
                                </Space>
                            </Card>
                        </List.Item>
                    )}
                />
            )}
        </div>
    );
}