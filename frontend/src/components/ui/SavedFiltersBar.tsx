import { useState } from "react";
import { Button, Input, Popconfirm, Popover, Select, Space, Tooltip } from "antd";
import { SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import { useSavedFilters } from "../../app/useSavedFilters";

interface Props<F> {
    storageKey: string;
    currentFilters: F;
    onApply: (filters: F) => void;
}

export default function SavedFiltersBar<F>({ storageKey, currentFilters, onApply }: Props<F>) {
    const { savedFilters, saveFilter, deleteFilter } = useSavedFilters<F>(storageKey);
    const [newName, setNewName] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selected, setSelected] = useState<string | undefined>();

    const handleSave = () => {
        if (!newName.trim()) return;
        saveFilter(newName, currentFilters);
        setNewName("");
        setPopoverOpen(false);
    };

    return (
        <Space>
            <Select
                placeholder="Bộ lọc đã lưu"
                style={{ width: 170 }}
                allowClear
                value={selected}
                options={savedFilters.map((f) => ({ value: f.name, label: f.name }))}
                onChange={(name) => {
                    setSelected(name);
                    if (!name) return;
                    const found = savedFilters.find((f) => f.name === name);
                    if (found) onApply(found.filters);
                }}
            />
            {selected && (
                <Popconfirm
                    title="Xóa bộ lọc đã lưu này?"
                    onConfirm={() => { deleteFilter(selected); setSelected(undefined); }}
                >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )}
            <Popover
                open={popoverOpen}
                onOpenChange={setPopoverOpen}
                trigger="click"
                content={
                    <Space>
                        <Input
                            placeholder="Tên bộ lọc"
                            size="small"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onPressEnter={handleSave}
                        />
                        <Button size="small" type="primary" onClick={handleSave}>Lưu</Button>
                    </Space>
                }
            >
                <Tooltip title="Lưu bộ lọc hiện tại">
                    <Button icon={<SaveOutlined />} />
                </Tooltip>
            </Popover>
        </Space>
    );
}
