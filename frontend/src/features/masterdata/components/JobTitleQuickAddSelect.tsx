import { useEffect, useMemo, useState } from "react";
import { Select, Button, App } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getCatalogItems, createCatalogItem } from "../masterdataApi";
import type { CatalogItem, ApiMessageResponse } from "../types";

interface JobTitleQuickAddSelectProps {
    value: number | undefined;
    onChange: (id: number | undefined) => void;
    placeholder?: string;
}

/** Chọn chức vụ, cho phép thêm nhanh chức vụ mới nếu danh mục có sẵn chưa đủ. */
export default function JobTitleQuickAddSelect({ value, onChange, placeholder }: JobTitleQuickAddSelectProps) {
    const { message } = App.useApp();
    const [jobTitles, setJobTitles] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        setLoading(true);
        getCatalogItems("/masterdata/job-titles")
            .then((res) => setJobTitles(res.data))
            .finally(() => setLoading(false));
    }, []);

    const options = useMemo(
        () => jobTitles.map((t) => ({ value: t.id, label: t.name as string })),
        [jobTitles],
    );

    const trimmedSearch = searchValue.trim();
    const isDuplicate = jobTitles.some((t) => (t.name as string).toLowerCase() === trimmedSearch.toLowerCase());
    const canQuickAdd = trimmedSearch.length > 0 && !isDuplicate;

    const handleCreate = async () => {
        if (!canQuickAdd) return;
        setCreating(true);
        try {
            const res = await createCatalogItem("/masterdata/job-titles", { name: trimmedSearch });
            const created = res.data;
            setJobTitles((prev) => [...prev, created]);
            onChange(created.id);
            setSearchValue("");
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không thêm được chức vụ mới");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Select
            allowClear
            showSearch
            loading={loading}
            placeholder={placeholder ?? "Chọn hoặc thêm chức vụ..."}
            value={value}
            onChange={onChange}
            options={options}
            optionFilterProp="label"
            searchValue={searchValue}
            onSearch={setSearchValue}
            dropdownRender={(menu) => (
                <>
                    {menu}
                    {canQuickAdd && (
                        <div style={{ padding: "4px 8px", borderTop: "1px solid #f0f0f0" }}>
                            <Button
                                type="text"
                                size="small"
                                icon={<PlusOutlined />}
                                loading={creating}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={handleCreate}
                                style={{ width: "100%", textAlign: "left" }}
                            >
                                Thêm chức vụ mới &quot;{trimmedSearch}&quot;
                            </Button>
                        </div>
                    )}
                </>
            )}
        />
    );
}
