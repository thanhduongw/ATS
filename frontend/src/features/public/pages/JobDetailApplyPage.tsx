import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Card,
    Typography,
    Tag,
    Button,
    Form,
    Input,
    Upload,
    App,
    Spin,
    Empty,
    Space,
    Divider,
    Row,
    Col,
    Result,
} from "antd";
import {
    SendOutlined,
    DollarOutlined,
    ArrowLeftOutlined,
    InboxOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import type { AxiosError } from "axios";
import {
    getPublicCompany,
    getPublicJobById,
    publicApply,
} from "../publicApi";
import type {
    PublicCompanyResponse,
    PublicJobPosting,
    PublicApplyResponse,
    ApiMessageResponse,
} from "../types";
import { COLORS } from "../../../app/theme";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

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

interface ApplyFormValues {
    fullName: string;
    email: string;
    phone?: string;
    note?: string;
}

export default function JobDetailApplyPage() {
    const { tenantCode, jobId } = useParams<{ tenantCode: string; jobId: string }>();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [form] = Form.useForm<ApplyFormValues>();

    const [company, setCompany] = useState<PublicCompanyResponse | null>(null);
    const [job, setJob] = useState<PublicJobPosting | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [success, setSuccess] = useState<PublicApplyResponse | null>(null);

    const load = useCallback(async () => {
        if (!tenantCode || !jobId) return;
        setLoading(true);
        try {
            const [companyRes, jobRes] = await Promise.all([
                getPublicCompany(tenantCode),
                getPublicJobById(tenantCode, Number(jobId)),
            ]);
            setCompany(companyRes.data);
            setJob(jobRes.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(
                e.response?.data?.message ?? "Không tải được tin tuyển dụng"
            );
            setJob(null);
        } finally {
            setLoading(false);
        }
    }, [tenantCode, jobId, message]);

    useEffect(() => {
        load();
    }, [load]);

    const uploadProps: UploadProps = {
        multiple: false,
        maxCount: 1,
        accept: ".pdf,.doc,.docx",
        fileList,
        beforeUpload: (file) => {
            const isValid =
                file.type === "application/pdf" ||
                file.type === "application/msword" ||
                file.type ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            if (!isValid) {
                message.error("Chỉ chấp nhận file PDF, DOC, DOCX");
                return Upload.LIST_IGNORE;
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error("File CV không được vượt quá 5MB");
                return Upload.LIST_IGNORE;
            }
            setFileList([file as UploadFile]);
            return false; // không auto upload
        },
        onRemove: () => {
            setFileList([]);
        },
    };

    const onFinish = async (values: ApplyFormValues) => {
        if (!tenantCode || !jobId) return;
        if (fileList.length === 0) {
            message.warning("Vui lòng đính kèm file CV");
            return;
        }
        const file = fileList[0].originFileObj || (fileList[0] as unknown as File);
        if (!file) {
            message.warning("File CV không hợp lệ");
            return;
        }

        setSubmitting(true);
        try {
            const res = await publicApply(tenantCode, Number(jobId), {
                fullName: values.fullName.trim(),
                email: values.email.trim(),
                phone: values.phone?.trim(),
                note: values.note?.trim(),
                file: file as File,
            });
            setSuccess(res.data);
            message.success(res.data.message || "Nộp hồ sơ thành công");
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(
                e.response?.data?.message ?? "Nộp hồ sơ thất bại. Vui lòng thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!job || !company) {
        return (
            <Empty description="Tin tuyển dụng không tồn tại hoặc đã đóng">
                <Button onClick={() => navigate(`/c/${tenantCode}`)}>
                    Quay lại danh sách
                </Button>
            </Empty>
        );
    }

    if (success) {
        return (
            <Result
                status="success"
                title="Nộp hồ sơ thành công!"
                subTitle={
                    <div>
                        <p>{success.message}</p>
                        <p>
                            Mã hồ sơ: <Text strong>#{success.applicationId}</Text>
                            {" · "}
                            Giai đoạn: <Text strong>{success.currentStageName}</Text>
                        </p>
                        <p style={{ color: COLORS.textSecondary }}>
                            Chúng tôi đã ghi nhận hồ sơ của{" "}
                            <Text strong>{success.candidateName}</Text> (
                            {success.candidateEmail}). HR sẽ liên hệ nếu phù hợp.
                        </p>
                    </div>
                }
                extra={[
                    <Button
                        type="primary"
                        key="jobs"
                        onClick={() => navigate(`/c/${tenantCode}`)}
                    >
                        Xem thêm việc làm
                    </Button>,
                    <Button key="again" onClick={() => setSuccess(null)}>
                        Nộp thêm hồ sơ khác
                    </Button>,
                ]}
            />
        );
    }

    return (
        <div>
            <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/c/${tenantCode}`)}
                style={{ paddingLeft: 0, marginBottom: 8 }}
            >
                Quay lại danh sách việc làm
            </Button>

            <Row gutter={[24, 24]}>
                {/* Chi tiết job */}
                <Col xs={24} lg={14}>
                    <Card style={{ borderRadius: 12 }}>
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <Title level={3} style={{ margin: 0 }}>
                                    {job.title}
                                </Title>
                                <Tag color="green">Đang mở</Tag>
                            </div>

                            <Text type="secondary">{company.name}</Text>

                            <Space wrap>
                                <Tag icon={<DollarOutlined />} color="blue">
                                    {formatSalary(job.salaryMin, job.salaryMax)}
                                </Tag>
                            </Space>

                            <Divider style={{ margin: "12px 0" }} />

                            {job.description && (
                                <div>
                                    <Title level={5}>
                                        <FileTextOutlined /> Mô tả công việc
                                    </Title>
                                    <Paragraph style={{ whiteSpace: "pre-wrap" }}>
                                        {job.description}
                                    </Paragraph>
                                </div>
                            )}

                            {job.requirements && (
                                <div>
                                    <Title level={5}>Yêu cầu</Title>
                                    <Paragraph style={{ whiteSpace: "pre-wrap" }}>
                                        {job.requirements}
                                    </Paragraph>
                                </div>
                            )}

                            {job.benefits && (
                                <div>
                                    <Title level={5}>Quyền lợi</Title>
                                    <Paragraph style={{ whiteSpace: "pre-wrap" }}>
                                        {job.benefits}
                                    </Paragraph>
                                </div>
                            )}
                        </Space>
                    </Card>
                </Col>

                {/* Form apply */}
                <Col xs={24} lg={10}>
                    <Card
                        title="Nộp hồ sơ ứng tuyển"
                        style={{
                            borderRadius: 12,
                            position: "sticky",
                            top: 80,
                        }}
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            requiredMark="optional"
                        >
                            <Form.Item
                                name="fullName"
                                label="Họ và tên"
                                rules={[
                                    { required: true, message: "Vui lòng nhập họ tên" },
                                    { min: 2, message: "Họ tên quá ngắn" },
                                ]}
                            >
                                <Input placeholder="Nguyễn Văn A" size="large" />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { required: true, message: "Vui lòng nhập email" },
                                    { type: "email", message: "Email không hợp lệ" },
                                ]}
                            >
                                <Input placeholder="email@example.com" size="large" />
                            </Form.Item>

                            <Form.Item name="phone" label="Số điện thoại">
                                <Input placeholder="0901234567" size="large" />
                            </Form.Item>

                            <Form.Item
                                label="File CV"
                                required
                                extra="PDF, DOC, DOCX — tối đa 5MB"
                            >
                                <Dragger {...uploadProps}>
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined />
                                    </p>
                                    <p className="ant-upload-text">
                                        Kéo thả hoặc bấm để chọn file CV
                                    </p>
                                </Dragger>
                            </Form.Item>

                            <Form.Item name="note" label="Ghi chú / Thư xin việc">
                                <TextArea
                                    rows={3}
                                    placeholder="Giới thiệu ngắn về bản thân (tuỳ chọn)"
                                    maxLength={1000}
                                    showCount
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SendOutlined />}
                                size="large"
                                block
                                loading={submitting}
                            >
                                Gửi hồ sơ
                            </Button>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}