import { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Input, Tag, Typography, App, Space, Alert } from "antd";
import { EditOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { CatalogConfig, CatalogItem, ApiMessageResponse } from "../types";
import { getCatalogItems, updateCatalogItem, deleteCatalogItem, activateCatalogItem } from "../masterdataApi";
import { getPublicCompany } from "../../public/publicApi";
import { useBrand } from "../../../app/BrandProvider";
import { COLORS, RADIUS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { PageToolbar, IconAction, ModalTitle } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";
import { EMAIL_TEMPLATE_META, EMAIL_TEMPLATE_ORDER, EMAIL_VARIABLES } from "./emailTemplateMeta";

const { Text } = Typography;

const metaOf = (code: unknown) => EMAIL_TEMPLATE_META[String(code ?? "").toUpperCase()];

/** Thay {{biến}} bằng giá trị mẫu — giống TemplateRenderer của notification-service. */
const render = (text: string, data: Record<string, string>) =>
    text.replace(/\{\{\s*(\w+)\s*}}/g, (m, k: string) => (k in data ? data[k] : m));

/** Nhãn nút cuối thư, giống EmailLinks của notification-service. */
const buttonLabel = (code: string) => {
    const c = code.toUpperCase();
    const candidate = metaOf(c)?.to === "Ứng viên";
    if (c.includes("OFFER")) return "Xem thư mời";
    if (c.includes("INTERVIEW") || c.includes("EVALUATION")) return "Xem lịch phỏng vấn";
    if (c.includes("REQUISITION")) return "Xem yêu cầu tuyển dụng";
    if (c.includes("APPLICATION")) return candidate ? "Xem hồ sơ của bạn" : "Xem hồ sơ";
    return "Mở hệ thống";
};

interface Props {
    config: CatalogConfig;
}

/**
 * Mẫu email gửi tự động theo sự kiện tuyển dụng. Bộ mẫu cố định (mỗi loại thông báo một mẫu, loại gửi cả ứng viên
 * lẫn nhân viên có hai mẫu): Quản trị chỉ sửa tiêu đề / nội dung, hoặc tắt mẫu để gửi nội dung mặc định.
 */
export default function EmailTemplatePanel({ config }: Props) {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<CatalogItem | null>(null);
    const [previewing, setPreviewing] = useState<CatalogItem | null>(null);
    const [company, setCompany] = useState<{ name: string; logoUrl: string | null }>({ name: "", logoUrl: null });
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const { palette } = useBrand();

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCatalogItems(config.endpoint);
            const rank = (c: unknown) => {
                const i = EMAIL_TEMPLATE_ORDER.indexOf(String(c ?? "").toUpperCase());
                return i < 0 ? 999 : i;
            };
            setItems([...res.data].sort((a, b) => rank(a.code) - rank(b.code)));
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [config.endpoint, message]);

    useEffect(() => {
        loadItems();
        getPublicCompany().then((r) => setCompany({ name: r.data.name, logoUrl: r.data.logoUrl })).catch(() => undefined);
    }, [loadItems]);

    const openEdit = (item: CatalogItem) => {
        setEditing(item);
        form.setFieldsValue({ subject: item.subject, body: item.body });
    };

    const save = async () => {
        if (!editing) return;
        try {
            const values = await form.validateFields();
            await updateCatalogItem(config.endpoint, editing.id, { code: editing.code, ...values });
            message.success("Đã lưu mẫu email");
            setEditing(null);
            loadItems();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            if (axiosErr.response?.data?.message) message.error(axiosErr.response.data.message);
        }
    };

    const toggle = async (item: CatalogItem) => {
        try {
            if (item.active) await deleteCatalogItem(config.endpoint, item.id);
            else await activateCatalogItem(config.endpoint, item.id);
            message.success(item.active ? "Đã tắt mẫu" : "Đã bật lại mẫu");
            loadItems();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không cập nhật được mẫu");
        }
    };

    const columns = [
        {
            title: "Email", key: "name",
            render: (_: unknown, r: CatalogItem) => {
                const m = metaOf(r.code);
                return (
                    <Space direction="vertical" size={0}>
                        <span style={{ fontWeight: 600 }}>{m?.name ?? String(r.code ?? "")}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>{m ? `Gửi khi: ${m.when}` : "Loại thông báo không còn dùng"}</Text>
                    </Space>
                );
            },
        },
        {
            title: "Người nhận", key: "to", width: 220,
            render: (_: unknown, r: CatalogItem) => {
                const m = metaOf(r.code);
                return m ? <Tag color={m.to === "Ứng viên" ? "blue" : "default"}>{m.to}</Tag> : "—";
            },
        },
        { title: "Tiêu đề email", dataIndex: "subject", key: "subject", ellipsis: true },
        {
            title: "Trạng thái", dataIndex: "active", key: "active", width: 110,
            render: (active: boolean) => (active ? <Tag color="green">Đang dùng</Tag> : <Tag>Đã tắt</Tag>),
        },
        {
            title: "", key: "actions", width: 120,
            render: (_: unknown, r: CatalogItem) => (
                <Space size={4}>
                    <IconAction title="Xem trước" icon={<EyeOutlined />} onClick={() => setPreviewing(r)} />
                    <IconAction title="Sửa nội dung" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    {r.active ? (
                        <IconAction title="Tắt mẫu" icon={<StopOutlined />} danger onClick={() => toggle(r)}
                            confirm={{
                                title: "Tắt mẫu email này?",
                                description: "Email vẫn được gửi, nhưng dùng nội dung mặc định của thông báo thay cho mẫu.",
                                okText: "Tắt",
                            }} />
                    ) : (
                        <IconAction title="Bật lại" icon={<CheckCircleOutlined />} onClick={() => toggle(r)} />
                    )}
                </Space>
            ),
        },
    ];

    const preview = useMemo(() => {
        if (!previewing) return null;
        const code = String(previewing.code ?? "");
        const m = metaOf(code);
        const companyName = company.name || "Công ty";
        const data: Record<string, string> = {
            recipientName: m?.to === "Ứng viên" ? "Nguyễn Văn An" : "Trần Thị Bình",
            title: m?.sampleTitle ?? "",
            message: m?.sampleMessage ?? "",
            companyName,
            link: `${window.location.origin}/...`,
            resourceType: "",
            resourceId: "",
        };
        const blocks = render(String(previewing.body ?? ""), data).trim().split(/\n\s*\n/);
        // Giống EmailLayout: đoạn cuối "Trân trọng…" là chữ ký, nút nằm trước chữ ký.
        const hasSignature = blocks.length > 1 && blocks[blocks.length - 1].trim().toLowerCase().startsWith("trân trọng");
        return {
            subject: render(String(previewing.subject ?? ""), data),
            paragraphs: hasSignature ? blocks.slice(0, -1) : blocks,
            signature: hasSignature ? blocks[blocks.length - 1] : null,
            companyName,
            button: buttonLabel(code),
        };
    }, [previewing, company.name]);

    const brandColor = palette.color;

    return (
        <div>
            <PageToolbar
                left={<span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>{config.title}</span>}
            />

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12, borderRadius: RADIUS.md }}
                title="Email gửi tự động khi có sự kiện tuyển dụng"
                description={
                    <span>
                        Nội dung dưới đây được đặt vào khung email mang tên, logo và màu của công ty; cuối thư có sẵn nút
                        dẫn tới trang liên quan. Tắt một mẫu thì email vẫn gửi với nội dung mặc định của thông báo.
                        Biến dùng được:{" "}
                        {EMAIL_VARIABLES.map((v) => (
                            <span key={v.key} style={{ marginRight: 8 }}><Text code>{`{{${v.key}}}`}</Text> {v.label};</span>
                        ))}
                    </span>
                }
            />

            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={columns}
                dataSource={items}
                pagination={{ pageSize: 12, ...listPagination("mẫu email") }}
                locale={{
                    emptyText: loading ? <span /> : (
                        <EmptyState title="Chưa có mẫu email nào" description="Khởi động lại masterdata-service để nạp bộ mẫu mặc định." />
                    ),
                }}
            />

            <Modal
                title={
                    <ModalTitle
                        icon={<EditOutlined />}
                        title={metaOf(editing?.code)?.name ?? "Sửa mẫu email"}
                        subtitle={metaOf(editing?.code) ? `Gửi khi: ${metaOf(editing?.code)?.when} · Người nhận: ${metaOf(editing?.code)?.to}` : undefined}
                    />
                }
                open={!!editing}
                onOk={save}
                onCancel={() => setEditing(null)}
                okText="Lưu"
                cancelText="Huỷ"
                width={680}
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="subject" label="Tiêu đề email" rules={[{ required: true, message: "Tiêu đề không được để trống" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="body" label="Nội dung" extra="Để một dòng trống giữa các đoạn. Nút xem chi tiết được thêm tự động cuối thư."
                        rules={[{ required: true, message: "Nội dung không được để trống" }]}>
                        <Input.TextArea rows={10} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Xem trước — ${metaOf(previewing?.code)?.name ?? ""}`}
                open={!!previewing}
                onCancel={() => setPreviewing(null)}
                footer={<Button onClick={() => setPreviewing(null)}>Đóng</Button>}
                width={680}
                destroyOnHidden
            >
                {preview && (
                    <div style={{ background: "#F3F4F6", padding: 16, borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                            Từ: {preview.companyName} · Tiêu đề: <b style={{ color: "#111827" }}>{preview.subject}</b>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB" }}>
                            <div style={{
                                padding: "16px 24px", borderBottom: `3px solid ${brandColor}`,
                                background: company.logoUrl ? "#fff" : brandColor,
                            }}>
                                {company.logoUrl
                                    ? <img src={company.logoUrl} alt={preview.companyName} style={{ height: 32 }} />
                                    : <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{preview.companyName}</span>}
                            </div>
                            <div style={{ padding: 24 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>{preview.subject}</div>
                                {preview.paragraphs.map((p, i) => (
                                    <p key={i} style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "#1F2937", whiteSpace: "pre-line" }}>{p}</p>
                                ))}
                                <span style={{
                                    display: "inline-block", marginTop: 4, padding: "10px 20px", borderRadius: 8,
                                    background: brandColor, color: "#fff", fontWeight: 600, fontSize: 14,
                                }}>{preview.button}</span>
                                {preview.signature && (
                                    <p style={{ margin: "20px 0 0", fontSize: 14, lineHeight: 1.6, color: "#1F2937", whiteSpace: "pre-line" }}>
                                        {preview.signature}
                                    </p>
                                )}
                            </div>
                            <div style={{ padding: "12px 24px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#6B7280" }}>
                                Email được gửi tự động từ hệ thống tuyển dụng của {preview.companyName}. Vui lòng không trả lời email này.
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
