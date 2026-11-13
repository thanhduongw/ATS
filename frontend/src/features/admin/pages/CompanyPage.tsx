import { useEffect, useState } from "react";
import { App, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Spin } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { getCompany, getUsers, updateCompany } from "../../auth/authApi";
import type { ApiMessageResponse, CompanyResponse, UpdateCompanyRequest, UserSummaryResponse } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { COLORS, RADIUS } from "../../../app/theme";
import ImageUploadField from "../../../components/ui/ImageUploadField";
import { Panel, ScreenTitle } from "../../../components/ui/designKit";

interface Benefit { title: string; description?: string }

type FormValues = Omit<UpdateCompanyRequest, "foundedDate" | "benefits"> & {
    foundedDate?: Dayjs | null;
    benefitList?: Benefit[];
};

const SIZE_OPTIONS = ["Dưới 50 nhân sự", "50 – 100 nhân sự", "100 – 200 nhân sự", "200 – 500 nhân sự", "Trên 500 nhân sự"];

function parseBenefits(json?: string | null): Benefit[] {
    if (!json) return [];
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.filter((b) => b && typeof b.title === "string") : [];
    } catch {
        return [];
    }
}

/**
 * A08 · MÀN CHÍNH · Thông tin doanh nghiệp: Thông tin pháp lý · Nhận diện · Văn phòng · Bảo vệ dữ liệu ứng viên.
 * Thêm khối "Trang tuyển dụng" (khẩu hiệu, phúc lợi) vì trình chỉnh A09–A10 đã bỏ (quyết định C5, Q7).
 * Văn phòng lấy từ danh mục "Địa điểm làm việc" (do Chuyên viên tuyển dụng quản lý), không hiện số nhân sự (Q5).
 */
export default function CompanyPage() {
    const { message } = App.useApp();
    const [form] = Form.useForm<FormValues>();
    const [company, setCompany] = useState<CompanyResponse | null>(null);
    const [offices, setOffices] = useState<CatalogItem[]>([]);
    const [staff, setStaff] = useState<UserSummaryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyDraft, setPolicyDraft] = useState("");
    const brandColor = Form.useWatch("brandColor", form);

    useEffect(() => {
        Promise.allSettled([getCompany(), getCatalogItems("/masterdata/work-locations"), getUsers()])
            .then(([c, o, u]) => {
                if (c.status === "fulfilled") {
                    const data = c.value.data;
                    setCompany(data);
                    form.setFieldsValue({
                        ...data,
                        foundedDate: data.foundedDate ? dayjs(data.foundedDate) : null,
                        benefitList: parseBenefits(data.benefits),
                    });
                } else {
                    message.error("Không tải được thông tin doanh nghiệp");
                }
                if (o.status === "fulfilled") setOffices(o.value.data.filter((x) => x.active));
                if (u.status === "fulfilled") setStaff(u.value.data.filter((x) => x.role !== "CANDIDATE"));
            })
            .finally(() => setLoading(false));
    }, [form, message]);

    const save = async () => {
        const v = await form.validateFields();
        setSaving(true);
        try {
            const { benefitList, foundedDate, ...rest } = v;
            const body: UpdateCompanyRequest = {
                ...rest,
                name: rest.name,
                foundedDate: foundedDate ? foundedDate.format("YYYY-MM-DD") : null,
                benefits: JSON.stringify((benefitList ?? []).filter((b) => b?.title?.trim())),
                privacyPolicy: company?.privacyPolicy ?? null,
            };
            const res = await updateCompany(body);
            setCompany(res.data);
            message.success("Đã lưu thông tin doanh nghiệp");
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const savePolicy = async () => {
        if (!company) return;
        setSaving(true);
        try {
            const v = form.getFieldsValue(true) as FormValues;
            const { benefitList, foundedDate, ...rest } = v;
            const res = await updateCompany({
                ...rest,
                name: rest.name ?? company.name,
                foundedDate: foundedDate ? foundedDate.format("YYYY-MM-DD") : company.foundedDate ?? null,
                benefits: JSON.stringify((benefitList ?? []).filter((b) => b?.title?.trim())),
                privacyPolicy: policyDraft,
            });
            setCompany(res.data);
            setPolicyOpen(false);
            message.success("Đã cập nhật chính sách bảo mật dữ liệu ứng viên");
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spin /></div>;

    const two = { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 12 } as const;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle
                title="Thông tin doanh nghiệp"
                actions={<Button type="primary" loading={saving} onClick={save}>Lưu thay đổi</Button>}
            />
            {/* A08 theo mẫu: hàng trên "Thông tin pháp lý" | "Nhận diện" + "Trang tuyển dụng"; hàng dưới Văn phòng, Bảo vệ dữ liệu. */}
            <Form form={form} layout="vertical" requiredMark={false} className="compact-form">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 16, alignItems: "start" }}>
                    <Panel title="Thông tin pháp lý" bodyGap={0}>
                        <div style={two}>
                            <Form.Item name="legalName" label="Tên đầy đủ *" rules={[{ required: true, message: "Vui lòng nhập tên đầy đủ" }]}><Input /></Form.Item>
                            <Form.Item name="name" label="Tên hiển thị *" rules={[{ required: true, message: "Vui lòng nhập tên hiển thị" }]}><Input /></Form.Item>
                            <Form.Item name="taxCode" label="Mã số thuế"><Input /></Form.Item>
                            <Form.Item name="foundedDate" label="Ngày thành lập"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                            <Form.Item name="website" label="Trang tuyển dụng"><Input /></Form.Item>
                            <Form.Item name="sizeRange" label="Quy mô">
                                <Select allowClear options={SIZE_OPTIONS.map((s) => ({ value: s, label: s }))} />
                            </Form.Item>
                            <Form.Item name="recruitingEmail" label="Email tuyển dụng" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input /></Form.Item>
                            <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
                        </div>
                        <Form.Item name="address" label="Trụ sở"><Input /></Form.Item>
                        <Form.Item name="description" label="Giới thiệu ngắn" style={{ marginBottom: 0 }}><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
                    </Panel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    <Panel title="Nhận diện" bodyGap={0}>
                        <div>
                            <Form.Item name="logoUrl" label="Logo" extra="PNG/SVG vuông, tối thiểu 256 px · bấm Lưu để áp dụng"><ImageUploadField folder="logo" /></Form.Item>
                            <Form.Item
                                name="brandColor"
                                label="Màu thương hiệu"
                                rules={[{ pattern: /^#[0-9A-Fa-f]{6}$/, message: "Dạng #RRGGBB" }]}
                            >
                                <Input
                                    placeholder="#0A59F7"
                                    prefix={<span style={{ width: 16, height: 16, borderRadius: 4, background: brandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : COLORS.fill }} />}
                                />
                            </Form.Item>
                        </div>
                    </Panel>

                    <Panel title="Trang tuyển dụng" subtitle="Hiện trên trang tuyển dụng công khai" bodyGap={0}>
                        <Form.Item name="tagline" label="Khẩu hiệu"><Input maxLength={255} /></Form.Item>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 }}>Phúc lợi</span>
                        <Form.List name="benefitList">
                            {(fields, { add, remove }) => (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {fields.map((f) => (
                                        <div key={f.key} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 34px", gap: 8 }}>
                                            <Form.Item name={[f.name, "title"]} style={{ margin: 0 }} rules={[{ required: true, message: "Nhập tên phúc lợi" }]}>
                                                <Input placeholder="Tên phúc lợi" />
                                            </Form.Item>
                                            <Form.Item name={[f.name, "description"]} style={{ margin: 0 }}>
                                                <Input placeholder="Mô tả ngắn" />
                                            </Form.Item>
                                            <Button aria-label="Xoá phúc lợi" icon={<DeleteOutlined />} onClick={() => remove(f.name)} />
                                        </div>
                                    ))}
                                    <Button icon={<PlusOutlined />} style={{ alignSelf: "flex-start", color: COLORS.primary }} onClick={() => add({ title: "" })}>
                                        Thêm phúc lợi
                                    </Button>
                                </div>
                            )}
                        </Form.List>
                    </Panel>
                    </div>
                    </div>

                    <Panel title="Văn phòng" subtitle="Lấy từ danh mục Địa điểm làm việc — Chuyên viên tuyển dụng cập nhật ở Danh mục">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                        {offices.length === 0 ? (
                            <span style={{ color: COLORS.textSecondary }}>Chưa có văn phòng nào trong danh mục.</span>
                        ) : offices.map((o) => (
                            <div key={o.id} style={{ display: "flex", flexDirection: "column", padding: "10px 14px", borderRadius: 14, background: COLORS.fill }}>
                                <span style={{ fontWeight: 600 }}>{String(o.name)}</span>
                                {o.address ? <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{String(o.address)}</span> : null}
                            </div>
                        ))}
                        </div>
                    </Panel>


                    <Panel title="Bảo vệ dữ liệu ứng viên" bodyGap={0}>
                        <div style={two}>
                            <Form.Item
                                name="dataRetentionMonths"
                                label="Thời gian lưu hồ sơ ứng viên (tháng)"
                                extra="Tính từ lần ứng tuyển gần nhất, sau đó tự ẩn danh"
                            >
                                <InputNumber min={1} style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item name="dataProtectionOfficerId" label="Người phụ trách dữ liệu cá nhân">
                                <Select allowClear showSearch optionFilterProp="label" options={staff.map((u) => ({ value: u.id, label: u.fullName }))} />
                            </Form.Item>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: RADIUS.md, background: COLORS.fill }}>
                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                <span style={{ fontWeight: 600 }}>Chính sách bảo mật dữ liệu ứng viên</span>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                    {company?.privacyPolicyUpdatedAt ? `Cập nhật ${dayjs(company.privacyPolicyUpdatedAt).format("DD/MM/YYYY")}` : "Chưa có nội dung"}
                                </span>
                            </div>
                            <Button style={{ color: COLORS.primary }} onClick={() => { setPolicyDraft(company?.privacyPolicy ?? ""); setPolicyOpen(true); }}>
                                Sửa nội dung
                            </Button>
                        </div>
                    </Panel>
                </div>
            </Form>

            {/* Nội dung dài → hộp thoại rộng có ô văn bản; vẫn chỉ 1 trường (DS06). */}
            <Modal
                open={policyOpen}
                title="Chính sách bảo mật dữ liệu ứng viên"
                okText="Lưu"
                cancelText="Huỷ"
                confirmLoading={saving}
                onOk={savePolicy}
                onCancel={() => setPolicyOpen(false)}
                width={720}
                destroyOnHidden
            >
                <Input.TextArea rows={14} value={policyDraft} onChange={(e) => setPolicyDraft(e.target.value)} />
            </Modal>
        </div>
    );
}
