import { Tag, Space } from "antd";

/**
 * Deterministic color palette — same skill always gets the same color.
 */
const SKILL_PALETTE = [
  "#0E7A5F",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#EC4899",
  "#6366F1",
];

const getSkillColor = (skill: string): string => {
  let hash = 0;
  for (let i = 0; i < skill.length; i++) {
    hash = skill.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SKILL_PALETTE[Math.abs(hash) % SKILL_PALETTE.length];
};

interface Props {
  skills: string[];
  /** Max number of tags to show; rest collapsed into "+N more" */
  maxVisible?: number;
}

export default function SkillTagsDisplay({ skills, maxVisible }: Props) {
  if (!skills.length) return <span style={{ color: "#9CA3AF" }}>—</span>;

  const visible = maxVisible ? skills.slice(0, maxVisible) : skills;
  const remaining = maxVisible ? skills.length - maxVisible : 0;

  return (
    <Space wrap size={4}>
      {visible.map((skill) => (
        <Tag
          key={skill}
          color={getSkillColor(skill)}
          style={{ borderRadius: 6, margin: 0, fontWeight: 500 }}
        >
          {skill}
        </Tag>
      ))}
      {remaining > 0 && (
        <Tag
          style={{
            borderRadius: 6,
            margin: 0,
            background: "#F3F4F6",
            color: "#6B7280",
            border: "1px dashed #D1D5DB",
          }}
        >
          +{remaining} khác
        </Tag>
      )}
    </Space>
  );
}
