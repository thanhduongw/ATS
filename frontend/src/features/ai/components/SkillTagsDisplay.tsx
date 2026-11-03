import { Tag, Space } from "antd";

/**
 * Deterministic color palette — same skill always gets the same color.
 */
const SKILL_PALETTE = [
  "#0A59F7",
  "#0A59F7",
  "#7C4DFF",
  "#FF7500",
  "#FA2A2D",
  "#00A06B",
  "#E40078",
  "#3F56EA",
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
  if (!skills.length) return <span style={{ color: "#18243166" }}>—</span>;

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
            background: "#1824311A",
            color: "#18243199",
            border: "1px dashed #18243166",
          }}
        >
          +{remaining} khác
        </Tag>
      )}
    </Space>
  );
}
