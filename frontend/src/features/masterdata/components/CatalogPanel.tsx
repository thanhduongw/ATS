import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { App, Button, Form, Input, InputNumber, Select, Switch, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { CatalogConfig, CatalogItem, ApiMessageResponse } from "../types";
import {
    activateCatalogItem, createCatalogItem, deleteCatalogItem, getCatalogItems, updateCatalogItem,
} from "../masterdataApi";
import { getApplications } from "../../candidate/applicationApi";
import { getUserDirectory } from "../../auth/authApi";
import type { UserDirectoryResponse } from "../../auth/types";
import { COLORS } from "../../../app/theme";
import ListPage, { ListFilters } from "../../../components/ui/listKit";
import { Avatar, SmallDialog } from "../../../components/ui/designKit";

/**
 * R36 · R37 · R38 — một danh mục: tìm kiếm, lọc trạng thái, bảng có công tắc "Đang dùng".
 * Backend không xoá hẳn mục nào: tắt công tắc = ẩn khỏi danh sách chọn, bật lại được.
 * Cột riêng: Lý do từ chối có "Đã dùng" (đếm hồ sơ bị từ chối với lý do đó);
 * Phòng ban có "Đại diện phòng ban" và "Tài khoản" (đếm tài khoản nội bộ thuộc phòng).
 */
type StatusFilter = "ALL" | "ACTIVE" | "HIDDEN";

interface Props {
    config: CatalogConfig;
    /** Dải breadcrumb đặt trên tiêu đề. */
    breadcrumb?: ReactNode;
}

function useExtraColumns(key: string): ColumnsType<CatalogItem> {
    const [usage, setUsage] = useState<Map<number, number>>(new Map());
    const [people, setPeople] = useState<UserDirectoryResponse[]>([]);

    useEffect(() => {
        if (key === "rejectionReasons") {
            getApplications({ size: 5000 }).then((r) => {
                const m = new Map<number, number>();
                r.data.content.forEach((a) => {
                    if (a.rejectionReasonId != null) m.set(a.rejectionReasonId, (m.get(a.rejectionReasonId) ?? 0) + 1);
                });
                setUsage(m);
            }).catch(() => setUsage(new Map()));
        }
        if (key === "departments") {
            getUserDirectory().then((r) => setPeople(r.data)).catch(() => setPeople([]));
        }
    }, [key]);

    if (key === "rejectionReasons") {
        return [{
            title: "Đã dùng", key: "usage", width: 100, align: "right",
            render: (_, item) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{usage.get(item.id) ?? 0}</span>,
        }];
    }
    if (key === "departments") {
        return [
            {
                title: "Đại diện phòng ban", key: "reps", width: 240,
                render: (_, item) => {
                    const reps = people.filter((p) => p.departmentId === item.id && p.role === "HIRING_MANAGER");
                    if (reps.length === 0) return <span style={{ color: COLORS.textMuted }}>Chưa có</span>;
                    return (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Avatar name={reps[0].fullName} colorKey={reps[0].id} size={24} />
                            {reps[0].fullName}
                            {reps.length > 1 && <span style={{ color: COLORS.textSecondary }}>+{reps.length - 1}</span>}
                        </span>
                    );
                },
            },
            {
                title: "Tài khoản", key: "accounts", width: 100, align: "right",
                render: (_, item) => people.filter((p) => p.departmentId === item.id).length,
            },
        ];
    }
    return [];
}

export default function CatalogPanel({ config, breadcrumb }: Props) {
    const { message } = App.useApp();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState<StatusFilter>("ALL");
    const [editing, setEditing] = useState<CatalogItem | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState<number | null>(null);
    const [form] = Form.useForm();
    const extraColumns = useExtraColumns(config.key);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCatalogItems(config.endpoint);
            setItems(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [config.endpoint, message]);

    useEffect(() => { void load(); }, [load]);

    const rows = useMemo(() => {
        const k = keyword.trim().toLowerCase();
        return items.filter((it) => {
            if (status === "ACTIVE" && !it.active) return false;
            if (status === "HIDDEN" && it.active) return false;
            if (!k) return true;
            return config.fields.some((f) => String(it[f.name] ?? "").toLowerCase().includes(k));
        });
    }, [items, keyword, status, config.fields]);

    const openDialog = (item: CatalogItem | null) => {
        setEditing(item);
        form.resetFields();
        if (item) form.setFieldsValue(item);
        setDialogOpen(true);
    };

    const submit = async () => {
        let values: Record<string, unknown>;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await updateCatalogItem(config.endpoint, editing.id, values);
                message.success("Đã lưu");
            } else {
                await createCatalogItem(config.endpoint, values);
                message.success(`Đã thêm vào ${config.title.toLowerCase()}`);
            }
            setDialogOpen(false);
            void load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const toggle = async (item: CatalogItem, next: boolean) => {
        setToggling(item.id);
        try {
            if (next) await activateCatalogItem(config.endpoint, item.id);
            else await deleteCatalogItem(config.endpoint, item.id);
            setItems((list) => list.map((x) => (x.id === item.id ? { ...x, active: next } : x)));
            message.success(next ? `Đã bật lại "${item[config.primaryField]}"` : `Đã ẩn "${item[config.primaryField]}" khỏi danh sách chọn`);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không đổi được trạng thái");
        } finally {
            setToggling(null);
        }
    };

    const primaryLabel = config.fields.find((f) => f.name === config.primaryField)?.label ?? config.title;
    const otherFields = config.fields.filter((f) =>
        !f.hideInTable && f.name !== config.primaryField && f.name !== config.secondaryField);

    const columns: ColumnsType<CatalogItem> = [
        {
            title: primaryLabel, key: "primary",
            render: (_, it) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, opacity: it.active ? 1 : 0.55 }}>
                    <span style={{ fontWeight: 600 }}>{String(it[config.primaryField] ?? "")}</span>
                    {config.secondaryField && it[config.secondaryField] && (
                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{String(it[config.secondaryField])}</span>
                    )}
                </div>
            ),
        },
        ...otherFields.map((f) => ({
            title: f.label, key: f.name, width: 140,
            render: (_: unknown, it: CatalogItem) => (it[f.name] == null || it[f.name] === "" ? "—" : String(it[f.name])),
        })),
        ...extraColumns,
        {
            title: "Đang dùng", key: "active", width: 110, align: "center",
            render: (_, it) => (
                <span onClick={(e) => e.stopPropagation()}>
                    <Switch
                        size="small"
                        checked={it.active}
                        loading={toggling === it.id}
                        onChange={(v) => void toggle(it, v)}
                    />
                </span>
            ),
        },
    ];

    const wide = config.fields.some((f) => f.type === "textarea");

    return (
        <>
            {breadcrumb}
            <ListPage
                title={config.title}
                actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDialog(null)}>{config.addLabel}</Button>}
                filters={
                    <ListFilters>
                        <Input
                            allowClear
                            prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                            placeholder="Tìm trong danh mục"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            style={{ width: 280 }}
                        />
                        <Select<StatusFilter>
                            value={status}
                            onChange={setStatus}
                            style={{ width: 160 }}
                            options={[
                                { value: "ALL", label: "Mọi trạng thái" },
                                { value: "ACTIVE", label: "Đang dùng" },
                                { value: "HIDDEN", label: "Đã ẩn" },
                            ]}
                        />
                    </ListFilters>
                }
                footnote={`${rows.length} mục`}
            >
                <Table<CatalogItem>
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={rows}
                    pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                    rowClassName={() => "row-clickable"}
                    onRow={(it) => ({ onClick: () => openDialog(it) })}
                    locale={{ emptyText: keyword || status !== "ALL" ? "Không có mục nào khớp" : `Chưa có mục nào — bấm "${config.addLabel}"` }}
                />
            </ListPage>
            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 12 }}>
                {config.footnote ? `${config.footnote} ` : ""}
                Mục trong danh mục không xoá hẳn được, chỉ tắt để ẩn khỏi danh sách chọn.
            </div>

            <SmallDialog
                open={dialogOpen}
                title={editing ? `Sửa ${config.title.toLowerCase()}` : config.addLabel}
                onCancel={() => setDialogOpen(false)}
                onOk={() => void submit()}
                okText={editing ? "Lưu" : "Thêm"}
                okLoading={saving}
                width={wide ? 520 : 420}
            >
                <Form form={form} layout="vertical" requiredMark style={{ marginTop: 8 }}>
                    {config.fields.map((f) => (
                        <Form.Item
                            key={f.name}
                            name={f.name}
                            label={f.label}
                            rules={f.required ? [{ required: true, message: `Nhập ${f.label.toLowerCase()}` }] : []}
                        >
                            {f.type === "number" ? <InputNumber style={{ width: "100%" }} min={0} />
                                : f.type === "textarea" ? <Input.TextArea rows={3} />
                                    : <Input />}
                        </Form.Item>
                    ))}
                </Form>
            </SmallDialog>
        </>
    );
}
