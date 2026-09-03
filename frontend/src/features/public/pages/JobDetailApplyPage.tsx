import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Col, Result, Row, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeftOutlined, DollarOutlined, EnvironmentOutlined, LoginOutlined, SendOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import type { AxiosError } from "axios";
import { getPublicCompany, getPublicJobById } from "../publicApi";
import type { ApiMessageResponse, PublicCompanyResponse, PublicJobPosting } from "../types";
import { COLORS } from "../../../app/theme";

const { Paragraph, Text, Title } = Typography;

function JobSection({ title, content }: { title: string; content: string | null }) {
    if (!content) return null;
    return <section style={{ borderTop: `1px solid ${COLORS.borderLight}`, padding: "22px 0" }}>
        <Title level={4}>{title}</Title>
        <Paragraph style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>{content}</Paragraph>
    </section>;
}

export default function JobDetailApplyPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [company, setCompany] = useState<PublicCompanyResponse | null>(null);
    const [job, setJob] = useState<PublicJobPosting | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const id = Number(jobId);
        if (!Number.isInteger(id)) { setLoading(false); return; }
        try {
            const [companyResponse, jobResponse] = await Promise.all([getPublicCompany(), getPublicJobById(id)]);
            setCompany(companyResponse.data);
            setJob(jobResponse.data);
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không tải được tin tuyển dụng");
        } finally { setLoading(false); }
    }, [jobId, message]);

    useEffect(() => { load(); }, [load]);
    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin size="large" /></div>;
    if (!company || !job) return <Result status="404" title="Không tìm thấy tin tuyển dụng" extra={<Button onClick={() => navigate("/careers")}>Danh sách việc làm</Button>} />;

    return <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate("/careers")}>Danh sách việc làm</Button>
        <Row gutter={[32, 24]}>
            <Col xs={24} lg={16}>
                <Text type="secondary">{company.name}</Text>
                <Title level={1} style={{ marginTop: 6 }}>{job.title}</Title>
                <Space wrap>
                    <Tag color="green">Đang tuyển</Tag>
                    {job.workLocationName && <Tag icon={<EnvironmentOutlined />}>{job.workLocationName}</Tag>}
                    <Tag icon={<DollarOutlined />}>{job.salaryMin?.toLocaleString("vi-VN") ?? "Thỏa thuận"}</Tag>
                </Space>
                <JobSection title="Mô tả công việc" content={job.description} />
                <JobSection title="Yêu cầu ứng viên" content={job.requirements} />
                <JobSection title="Quyền lợi" content={job.benefits} />
            </Col>
            <Col xs={24} lg={8}>
                <Card style={{ position: "sticky", top: 16, borderRadius: 8 }}>
                    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                        <SendOutlined style={{ fontSize: 28, color: COLORS.primary }} />
                        <Title level={4} style={{ margin: 0 }}>Ứng tuyển vị trí này</Title>
                        <Text type="secondary">Ứng viên cần đăng nhập để dùng CV trong hồ sơ và theo dõi tiến độ.</Text>
                        <Button type="primary" block icon={<LoginOutlined />} onClick={() => navigate("/login")}>Đăng nhập</Button>
                        <Button block onClick={() => navigate("/register")}>Đăng ký ứng viên</Button>
                    </Space>
                </Card>
            </Col>
        </Row>
    </div>;
}
