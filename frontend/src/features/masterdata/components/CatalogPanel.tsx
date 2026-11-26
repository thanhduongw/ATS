import { matchesKeyword } from "../../../app/text";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { App, Button, Form, Input, InputNumber, Select, Switch} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { CatalogConfig, CatalogItem, ApiMessageResponse } from "../types";
import {
    activateCatalogItem, createCatalogItem, deleteCatalogItem, getCatalogItems, updateCatalogItem,
} from "../masterdataApi";
import { COLORS } from "../../../app/theme";
import ListPage, { ListFilters } from "../../../components/ui/listKit";
import FitTable from "../../../components/ui/FitTable";
import { SmallDialog } from "../../../components/ui/designKit";

/**
 * R36 · R37 · R38 — một danh mục: tìm kiếm, lọc trạng thái, bảng có công tắc "Đang dùng".
 * Backend không xoá hẳn mục nào: tắt công tắc = ẩn khỏi danh sách chọn, bật lại được.
 * Đã bỏ các cột phụ (đại diện / số tài khoản của phòng ban, số lần dùng lý do từ chối) — 26/11/2026:
 * chúng tải dữ liệu bất đồng bộ và làm bảng render lặp vô hạn, treo trình duyệt.
 */
type StatusFilter = "ALL" | "ACTIVE" | "HIDDEN";

interface Props {
    config: CatalogConfig;
    /** Dải breadcrumb đặt trên tiêu đề. */
    breadcrumb?: ReactNode;
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
            return matchesKeyword(k, ...config.fields.map((f) => it[f.name]));
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
                <FitTable<CatalogItem>
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={rows}
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
