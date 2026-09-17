/**
 * BenchmarkEditor — Editable table for AI-generated benchmark criteria.
 *
 * Features:
 * - Display criteria: name, weight (slider), standardRequirement, category, isMustHave
 * - Auto-normalize weights so they always sum to 100%
 * - Allow manual add/remove criteria
 */

import { useCallback } from "react";
import { Table, Slider, Checkbox, Input, Select, Button, Tag, Typography, Space } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { BenchmarkCriterion, BenchmarkCategory } from "../types";

const { Text } = Typography;

const CATEGORY_OPTIONS: { value: BenchmarkCategory; label: string; color: string }[] = [
  { value: "TECHNICAL", label: "Kỹ thuật", color: "blue" },
  { value: "SOFT_SKILL", label: "Kỹ năng mềm", color: "green" },
  { value: "EDUCATION", label: "Học vấn", color: "purple" },
  { value: "EXPERIENCE", label: "Kinh nghiệm", color: "orange" },
  { value: "CERTIFICATION", label: "Chứng chỉ", color: "cyan" },
  { value: "LANGUAGE", label: "Ngôn ngữ", color: "magenta" },
  { value: "OTHER", label: "Khác", color: "default" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o]));

interface Props {
  criteria: BenchmarkCriterion[];
  onChange: (criteria: BenchmarkCriterion[]) => void;
  readonly?: boolean;
}

export default function BenchmarkEditor({ criteria, onChange, readonly = false }: Props) {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  /** Khi kéo slider 1 criterion, auto-adjust các criterion còn lại để tổng = 100 */
  const handleWeightChange = useCallback(
    (index: number, newWeight: number) => {
      const updated = [...criteria];
      const oldWeight = updated[index].weight;
      const diff = newWeight - oldWeight;

      updated[index] = { ...updated[index], weight: newWeight };

      // Distribute the diff among other criteria proportionally
      const others = updated.filter((_, i) => i !== index);
      const othersTotal = others.reduce((s, c) => s + c.weight, 0);

      if (othersTotal > 0 && diff !== 0) {
        let remaining = -diff;
        for (let i = 0; i < updated.length; i++) {
          if (i === index) continue;
          const proportion = updated[i].weight / othersTotal;
          const adjustment = Math.round(remaining * proportion);
          updated[i] = {
            ...updated[i],
            weight: Math.max(5, updated[i].weight + adjustment),
          };
        }

        // Fix any rounding issues
        const newTotal = updated.reduce((s, c) => s + c.weight, 0);
        if (newTotal !== 100) {
          const fixIdx = updated.findIndex((_, i) => i !== index);
          if (fixIdx >= 0) {
            updated[fixIdx] = {
              ...updated[fixIdx],
              weight: updated[fixIdx].weight + (100 - newTotal),
            };
          }
        }
      }

      onChange(updated);
    },
    [criteria, onChange],
  );

  const handleFieldChange = useCallback(
    (index: number, field: keyof BenchmarkCriterion, value: unknown) => {
      const updated = [...criteria];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [criteria, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updated = criteria.filter((_, i) => i !== index);
      // Re-normalize weights after removal
      if (updated.length > 0) {
        const total = updated.reduce((s, c) => s + c.weight, 0);
        if (total !== 100) {
          const scale = 100 / total;
          let runningTotal = 0;
          for (let i = 0; i < updated.length - 1; i++) {
            updated[i] = { ...updated[i], weight: Math.round(updated[i].weight * scale) };
            runningTotal += updated[i].weight;
          }
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            weight: 100 - runningTotal,
          };
        }
      }
      onChange(updated);
    },
    [criteria, onChange],
  );

  const handleAdd = useCallback(() => {
    const newCriterion: BenchmarkCriterion = {
      name: "Tiêu chí mới",
      weight: 10,
      standardRequirement: "",
      category: "OTHER",
      isMustHave: false,
    };
    const updated = [...criteria, newCriterion];
    // Re-normalize
    const total = updated.reduce((s, c) => s + c.weight, 0);
    if (total !== 100) {
      const scale = 100 / total;
      let runningTotal = 0;
      for (let i = 0; i < updated.length - 1; i++) {
        updated[i] = { ...updated[i], weight: Math.round(updated[i].weight * scale) };
        runningTotal += updated[i].weight;
      }
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        weight: 100 - runningTotal,
      };
    }
    onChange(updated);
  }, [criteria, onChange]);

  const columns = [
    {
      title: "Tiêu chí",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (val: string, _: BenchmarkCriterion, idx: number) =>
        readonly ? (
          <Text strong>{val}</Text>
        ) : (
          <Input
            value={val}
            size="small"
            onChange={(e) => handleFieldChange(idx, "name", e.target.value)}
          />
        ),
    },
    {
      title: "Trọng số (%)",
      dataIndex: "weight",
      key: "weight",
      width: 180,
      render: (val: number, _: BenchmarkCriterion, idx: number) =>
        readonly ? (
          <Text>{val}%</Text>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Slider
              min={5}
              max={50}
              value={val}
              onChange={(v) => handleWeightChange(idx, v)}
              style={{ flex: 1 }}
            />
            <Text style={{ minWidth: 36, textAlign: "right" }}>{val}%</Text>
          </div>
        ),
    },
    {
      title: "Yêu cầu chuẩn",
      dataIndex: "standardRequirement",
      key: "standardRequirement",
      render: (val: string, _: BenchmarkCriterion, idx: number) =>
        readonly ? (
          <Text>{val}</Text>
        ) : (
          <Input.TextArea
            value={val}
            size="small"
            autoSize={{ minRows: 1, maxRows: 3 }}
            onChange={(e) => handleFieldChange(idx, "standardRequirement", e.target.value)}
          />
        ),
    },
    {
      title: "Phân loại",
      dataIndex: "category",
      key: "category",
      width: 130,
      render: (val: BenchmarkCategory, _: BenchmarkCriterion, idx: number) => {
        const opt = CATEGORY_MAP[val];
        return readonly ? (
          <Tag color={opt?.color}>{opt?.label ?? val}</Tag>
        ) : (
          <Select
            value={val}
            size="small"
            style={{ width: "100%" }}
            options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => handleFieldChange(idx, "category", v)}
          />
        );
      },
    },
    {
      title: "Bắt buộc",
      dataIndex: "isMustHave",
      key: "isMustHave",
      width: 80,
      align: "center" as const,
      render: (val: boolean, _: BenchmarkCriterion, idx: number) => (
        <Checkbox
          checked={val}
          disabled={readonly}
          onChange={(e) => handleFieldChange(idx, "isMustHave", e.target.checked)}
        />
      ),
    },
    ...(!readonly
      ? [
          {
            title: "",
            key: "actions",
            width: 40,
            render: (_: unknown, __: BenchmarkCriterion, idx: number) => (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(idx)}
                disabled={criteria.length <= 3}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Table
        dataSource={criteria.map((c, i) => ({ ...c, key: i }))}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        footer={() => (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              {!readonly && (
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  disabled={criteria.length >= 7}
                >
                  Thêm tiêu chí
                </Button>
              )}
            </Space>
            <Text
              strong
              style={{ color: totalWeight === 100 ? "#52c41a" : "#ff4d4f" }}
            >
              Tổng: {totalWeight}%{totalWeight !== 100 && " ⚠️"}
            </Text>
          </div>
        )}
      />
    </div>
  );
}
