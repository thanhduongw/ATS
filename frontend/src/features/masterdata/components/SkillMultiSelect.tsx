import { useEffect, useMemo, useState } from "react";
import { Select, Button, App } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getCatalogItems, createCatalogItem } from "../masterdataApi";
import type { CatalogItem, ApiMessageResponse } from "../types";

interface SkillMultiSelectProps {
    value: number[];
    onChange: (ids: number[]) => void;
    placeholder?: string;
}

/** Chọn nhiều kỹ năng, cho phép thêm nhanh kỹ năng mới nếu bộ kỹ năng có sẵn chưa đủ. */
export default function SkillMultiSelect({ value, onChange, placeholder }: SkillMultiSelectProps) {
    const { message } = App.useApp();
    const [skills, setSkills] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        setLoading(true);
        getCatalogItems("/masterdata/skills")
            .then((res) => setSkills(res.data))
            .finally(() => setLoading(false));
    }, []);

    const options = useMemo(
        () => skills.map((s) => ({ value: s.id, label: s.name as string })),
        [skills],
    );

    const trimmedSearch = searchValue.trim();
    const isDuplicate = skills.some((s) => (s.name as string).toLowerCase() === trimmedSearch.toLowerCase());
    const canQuickAdd = trimmedSearch.length > 0 && !isDuplicate;

    const handleCreateSkill = async () => {
        if (!canQuickAdd) return;
        setCreating(true);
        try {
            const res = await createCatalogItem("/masterdata/skills", { name: trimmedSearch });
            const created = res.data;
            setSkills((prev) => [...prev, created]);
            onChange([...value, created.id]);
            setSearchValue("");
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không thêm được kỹ năng mới");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Select
            mode="multiple"
            allowClear
            showSearch
            loading={loading}
            placeholder={placeholder ?? "Chọn hoặc thêm kỹ năng yêu cầu..."}
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
                                onClick={handleCreateSkill}
                                style={{ width: "100%", textAlign: "left" }}
                            >
                                Thêm kỹ năng mới &quot;{trimmedSearch}&quot;
                            </Button>
                        </div>
                    )}
                </>
            )}
        />
    );
}
