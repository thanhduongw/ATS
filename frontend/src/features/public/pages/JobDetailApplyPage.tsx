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
    Descriptions,
} from "antd";
import {
    SendOutlined,
    DollarOutlined,
    ArrowLeftOutlined,
    InboxOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    GiftOutlined,
    MailOutlined,
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

function formatSalary(
    min: number | null,
    max: number | null
): string {
    if (min == null && max == null) {
        return "Thỏa thuận";
    }

    const fmt = (n: number): string => {
        if (n >= 1_000_000) {
            return `${(n / 1_000_000).toFixed(
                n % 1_000_000 === 0 ? 0 : 1
            )} triệu`;
        }

        return n.toLocaleString("vi-VN");
    };

    if (min != null && max != null) {
        return `${fmt(min)} – ${fmt(max)}`;
    }

    if (min != null) {
        return `Từ ${fmt(min)}`;
    }

    return `Đến ${fmt(max!)}`;
}

/** Lấy chữ cái đầu để làm avatar công ty khi không có logo */
function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

interface ApplyFormValues {
    fullName: string;
    email: string;
    phone?: string;
    note?: string;
}

const APPLY_FORM_ANCHOR_ID = "apply-form-card";

export default function JobDetailApplyPage() {
    const { tenantCode, jobId } = useParams<{
        tenantCode: string;
        jobId: string;
    }>();

    const navigate = useNavigate();
    const { message } = App.useApp();
    const [form] = Form.useForm<ApplyFormValues>();

    const [company, setCompany] =
        useState<PublicCompanyResponse | null>(null);

    const [job, setJob] =
        useState<PublicJobPosting | null>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [fileList, setFileList] =
        useState<UploadFile[]>([]);

    const [success, setSuccess] =
        useState<PublicApplyResponse | null>(null);

    /**
     * Load company + job detail
     */
    const load = useCallback(async () => {
        if (!tenantCode || !jobId) {
            setLoading(false);
            return;
        }

        const numericJobId = Number(jobId);

        if (Number.isNaN(numericJobId)) {
            setLoading(false);
            setJob(null);
            return;
        }

        setLoading(true);

        try {
            const [companyRes, jobRes] = await Promise.all([
                getPublicCompany(tenantCode),
                getPublicJobById(
                    tenantCode,
                    numericJobId
                ),
            ]);

            setCompany(companyRes.data);
            setJob(jobRes.data);
        } catch (err) {
            const e =
                err as AxiosError<ApiMessageResponse>;

            message.error(
                e.response?.data?.message ??
                "Không tải được tin tuyển dụng"
            );

            setCompany(null);
            setJob(null);
        } finally {
            setLoading(false);
        }
    }, [tenantCode, jobId, message]);

    useEffect(() => {
        load();
    }, [load]);

    /**
     * Upload CV configuration
     */
    const uploadProps: UploadProps = {
        multiple: false,
        maxCount: 1,
        accept: ".pdf,.doc,.docx",
        fileList,

        beforeUpload: (file) => {
            const isValidType =
                file.type === "application/pdf" ||
                file.type === "application/msword" ||
                file.type ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

            if (!isValidType) {
                message.error(
                    "Chỉ chấp nhận file PDF, DOC, DOCX"
                );

                return Upload.LIST_IGNORE;
            }

            const isLt5M =
                file.size / 1024 / 1024 < 5;

            if (!isLt5M) {
                message.error(
                    "File CV không được vượt quá 5MB"
                );

                return Upload.LIST_IGNORE;
            }

            setFileList([
                {
                    uid: file.uid,
                    name: file.name,
                    status: "done",
                    originFileObj: file,
                },
            ]);

            return false;
        },

        onRemove: () => {
            setFileList([]);
        },
    };

    /**
     * Submit application
     */
    const onFinish = async (
        values: ApplyFormValues
    ) => {
        if (!tenantCode || !jobId) {
            return;
        }

        if (fileList.length === 0) {
            message.warning(
                "Vui lòng đính kèm file CV"
            );
            return;
        }

        const file =
            fileList[0].originFileObj;

        if (!file) {
            message.warning(
                "Không thể đọc file CV. Vui lòng chọn lại file."
            );
            return;
        }

        setSubmitting(true);

        try {
            const response = await publicApply(
                tenantCode,
                Number(jobId),
                {
                    fullName:
                        values.fullName.trim(),

                    email:
                        values.email.trim(),

                    phone:
                        values.phone?.trim() ||
                        undefined,

                    note:
                        values.note?.trim() ||
                        undefined,

                    file: file as File,
                }
            );

            setSuccess(response.data);

            message.success(
                response.data.message ??
                "Nộp hồ sơ thành công"
            );
        } catch (err) {
            const e =
                err as AxiosError<ApiMessageResponse>;

            message.error(
                e.response?.data?.message ??
                "Nộp hồ sơ thất bại. Vui lòng thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Apply another job/application
     */
    const handleApplyAgain = () => {
        setSuccess(null);
        setFileList([]);
        form.resetFields();
    };

    /**
     * Scroll xuống form ứng tuyển — dùng trên mobile khi cột form
     * nằm dưới cùng, tránh người dùng phải tự cuộn tìm
     */
    const scrollToApplyForm = () => {
        document
            .getElementById(APPLY_FORM_ANCHOR_ID)
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
    };

    /**
     * Loading state
     */
    if (loading) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "120px 0",
                }}
            >
                <Spin size="large" tip="Đang tải tin tuyển dụng..." />
            </div>
        );
    }

    /**
     * Job not found
     */
    if (!job || !company) {
        return (
            <Empty
                style={{ padding: "80px 0" }}
                description="Tin tuyển dụng không tồn tại hoặc đã đóng"
            >
                <Button
                    type="primary"
                    onClick={() =>
                        navigate(
                            `/c/${tenantCode}`
                        )
                    }
                >
                    Quay lại danh sách
                </Button>
            </Empty>
        );
    }

    /**
     * Application success
     */
    if (success) {
        return (
            <Result
                status="success"
                title="Nộp hồ sơ thành công!"
                subTitle={success.message}
                extra={[
                    <Button
                        type="primary"
                        key="jobs"
                        size="large"
                        onClick={() =>
                            navigate(
                                `/c/${tenantCode}`
                            )
                        }
                    >
                        Xem thêm việc làm
                    </Button>,


                ]}
            >
                <Card
                    style={{
                        maxWidth: 480,
                        margin: "0 auto",
                        borderRadius: 12,
                        background: "#F8FAFC",
                    }}
                    styles={{ body: { padding: 20 } }}
                >
                    <Descriptions
                        column={1}
                        size="small"
                        items={[
                            {
                                key: "id",
                                label: "Mã hồ sơ",
                                children: (
                                    <Text strong>
                                        #{success.applicationId}
                                    </Text>
                                ),
                            },
                            {
                                key: "stage",
                                label: "Giai đoạn",
                                children: (
                                    <Tag color="green">
                                        {success.currentStageName}
                                    </Tag>
                                ),
                            },
                            {
                                key: "candidate",
                                label: "Ứng viên",
                                children: success.candidateName,
                            },
                            {
                                key: "email",
                                label: "Email",
                                children: (
                                    <Space size={6}>
                                        <MailOutlined
                                            style={{
                                                color: COLORS.textMuted,
                                            }}
                                        />
                                        {success.candidateEmail}
                                    </Space>
                                ),
                            },
                        ]}
                    />
                </Card>

                <Text
                    type="secondary"
                    style={{
                        display: "block",
                        textAlign: "center",
                        marginTop: 16,
                    }}
                >
                    HR sẽ liên hệ với bạn qua email trên nếu hồ sơ phù hợp.
                </Text>
            </Result>
        );
    }

    const salaryText = formatSalary(
        job.salaryMin,
        job.salaryMax
    );

    return (
        <div>
            {/* Back */}
            <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() =>
                    navigate(
                        `/c/${tenantCode}`
                    )
                }
                style={{
                    paddingLeft: 0,
                    marginBottom: 8,
                    fontWeight: 500,
                }}
            >
                Quay lại danh sách việc làm
            </Button>

            <Row gutter={[24, 24]}>
                {/* =========================
                    JOB DETAIL
                ========================== */}
                <Col xs={24} lg={14}>
                    <Card
                        style={{
                            borderRadius: 12,
                            overflow: "hidden",
                        }}
                        styles={{ body: { padding: 0 } }}
                    >
                        {/* Accent header strip — điểm nhấn thương hiệu */}
                        <div
                            style={{
                                padding: "24px 24px 20px",
                                borderBottom: `1px solid ${COLORS.borderLight}`,
                            }}
                        >
                            <Space
                                align="start"
                                size={16}
                                style={{ width: "100%" }}
                            >
                                {/* Company avatar (initials) */}
                                <div
                                    style={{
                                        width: 52,
                                        height: 52,
                                        minWidth: 52,
                                        borderRadius: 12,
                                        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
                                        color: "#fff",
                                        fontWeight: 700,
                                        fontSize: 18,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    {getInitials(company.name)}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: 12,
                                        }}
                                    >
                                        <Title
                                            level={3}
                                            style={{
                                                margin: 0,
                                                fontSize: 22,
                                            }}
                                        >
                                            {job.title}
                                        </Title>

                                        <Tag
                                            color="green"
                                            style={{
                                                flexShrink: 0,
                                                fontWeight: 500,
                                                marginTop: 4,
                                            }}
                                        >
                                            Đang mở
                                        </Tag>
                                    </div>

                                    <Text type="secondary">
                                        {company.name}
                                    </Text>
                                </div>
                            </Space>

                            <Tag
                                icon={<DollarOutlined />}
                                color="blue"
                                style={{
                                    marginTop: 16,
                                    padding: "4px 12px",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    borderRadius: 8,
                                }}
                            >
                                {salaryText}
                            </Tag>
                        </div>

                        {/* Nội dung mô tả */}
                        <div style={{ padding: "20px 24px 24px" }}>
                            <Space
                                direction="vertical"
                                size={24}
                                style={{ width: "100%" }}
                            >
                                {/* Description */}
                                {job.description && (
                                    <div>
                                        <Title
                                            level={5}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                color: COLORS.primaryDark,
                                            }}
                                        >
                                            <FileTextOutlined />
                                            Mô tả công việc
                                        </Title>

                                        <Paragraph
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                color: COLORS.textPrimary,
                                                marginBottom: 0,
                                            }}
                                        >
                                            {job.description}
                                        </Paragraph>
                                    </div>
                                )}

                                {/* Requirements */}
                                {job.requirements && (
                                    <div>
                                        <Title
                                            level={5}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                color: COLORS.primaryDark,
                                            }}
                                        >
                                            <CheckCircleOutlined />
                                            Yêu cầu ứng viên
                                        </Title>

                                        <Paragraph
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                color: COLORS.textPrimary,
                                                marginBottom: 0,
                                            }}
                                        >
                                            {job.requirements}
                                        </Paragraph>
                                    </div>
                                )}

                                {/* Benefits */}
                                {job.benefits && (
                                    <div>
                                        <Title
                                            level={5}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                color: COLORS.primaryDark,
                                            }}
                                        >
                                            <GiftOutlined />
                                            Quyền lợi
                                        </Title>

                                        <Paragraph
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                color: COLORS.textPrimary,
                                                marginBottom: 0,
                                            }}
                                        >
                                            {job.benefits}
                                        </Paragraph>
                                    </div>
                                )}
                            </Space>
                        </div>
                    </Card>

                    {/* CTA nổi trên mobile — cột form nằm rất xa phía dưới */}
                    <div
                        style={{
                            marginTop: 16,
                            display: "block",
                        }}
                        className="apply-mobile-cta"
                    >
                        <Button
                            type="primary"
                            block
                            size="large"
                            icon={<SendOutlined />}
                            onClick={scrollToApplyForm}
                        >
                            Ứng tuyển ngay
                        </Button>
                    </div>
                </Col>

                {/* =========================
                    APPLY FORM
                ========================== */}
                <Col xs={24} lg={10}>
                    <Card
                        id={APPLY_FORM_ANCHOR_ID}
                        title={
                            <Space>
                                <SendOutlined
                                    style={{ color: COLORS.primary }}
                                />
                                Nộp hồ sơ ứng tuyển
                            </Space>
                        }
                        style={{
                            borderRadius: 12,
                            position: "sticky",
                            top: 16,
                        }}
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            requiredMark="optional"
                        >
                            {/* Full name */}
                            <Form.Item
                                name="fullName"
                                label="Họ và tên"
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            "Vui lòng nhập họ tên",
                                    },
                                    {
                                        min: 2,
                                        message:
                                            "Họ tên quá ngắn",
                                    },
                                ]}
                            >
                                <Input
                                    placeholder="Nguyễn Văn A"
                                    size="large"
                                />
                            </Form.Item>

                            {/* Email */}
                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            "Vui lòng nhập email",
                                    },
                                    {
                                        type: "email",
                                        message:
                                            "Email không hợp lệ",
                                    },
                                ]}
                            >
                                <Input
                                    placeholder="email@example.com"
                                    size="large"
                                />
                            </Form.Item>

                            {/* Phone */}
                            <Form.Item
                                name="phone"
                                label="Số điện thoại"
                                rules={[
                                    {
                                        pattern:
                                            /^[0-9+\-\s()]{8,20}$/,
                                        message:
                                            "Số điện thoại không hợp lệ",
                                    },
                                ]}
                            >
                                <Input
                                    placeholder="0901234567"
                                    size="large"
                                />
                            </Form.Item>

                            {/* CV */}
                            <Form.Item
                                label="File CV"
                                required
                                extra="PDF, DOC, DOCX — tối đa 5MB"
                            >
                                <Dragger
                                    {...uploadProps}
                                    style={{
                                        background: "#F8FAFC",
                                        borderColor: COLORS.border,
                                    }}
                                >
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined
                                            style={{
                                                color: COLORS.primary,
                                            }}
                                        />
                                    </p>

                                    <p className="ant-upload-text">
                                        Kéo thả hoặc bấm để
                                        chọn file CV
                                    </p>

                                    <p className="ant-upload-hint">
                                        CV của bạn sẽ được
                                        gửi trực tiếp đến
                                        hệ thống tuyển dụng.
                                    </p>
                                </Dragger>
                            </Form.Item>

                            {/* Note */}
                            <Form.Item
                                name="note"
                                label="Ghi chú / Thư xin việc"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="Giới thiệu ngắn về bản thân (tuỳ chọn)"
                                    maxLength={1000}
                                    showCount
                                />
                            </Form.Item>

                            <Divider style={{ margin: "8px 0 20px" }} />

                            {/* Submit */}
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={
                                    <SendOutlined />
                                }
                                size="large"
                                block
                                loading={submitting}
                            >
                                {submitting
                                    ? "Đang gửi hồ sơ..."
                                    : "Gửi hồ sơ"}
                            </Button>

                            <Text
                                type="secondary"
                                style={{
                                    display: "block",
                                    textAlign: "center",
                                    marginTop: 12,
                                    fontSize: 12,
                                }}
                            >
                                Bằng việc nộp hồ sơ, bạn đồng ý để{" "}
                                {company.name} liên hệ về cơ hội
                                việc làm này.
                            </Text>
                        </Form>
                    </Card>
                </Col>
            </Row>

            {/* Ẩn CTA mobile trên màn hình rộng — form đã sticky bên cạnh */}
            <style>{`
                @media (min-width: 992px) {
                    .apply-mobile-cta {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}