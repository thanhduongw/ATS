import { useState } from "react";
import { Timeline, Tag, Space, Typography } from "antd";
import {
  ClockCircleOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import type { WorkExperience } from "../types";
import { COLORS } from "../../../app/theme";

const { Text, Paragraph } = Typography;

interface Props {
  items: WorkExperience[];
}

export default function WorkExperienceTimeline({ items }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());

  if (!items.length) {
    return (
      <div style={{ color: COLORS.textMuted, textAlign: "center", padding: "12px 0" }}>
        Không có thông tin kinh nghiệm làm việc
      </div>
    );
  }

  const toggleExpand = (index: number) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Timeline
      items={items.map((exp, index) => {
        const expanded = expandedKeys.has(index);
        const dateRange = [exp.start_date, exp.is_current ? "Hiện tại" : exp.end_date]
          .filter(Boolean)
          .join(" → ");

        return {
          dot: (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: exp.is_current ? COLORS.primary : "#D1D5DB",
                border: exp.is_current ? `2px solid ${COLORS.primaryLight}` : "none",
              }}
            />
          ),
          children: (
            <div style={{ paddingBottom: 4 }}>
              {/* Company + Title */}
              <div style={{ marginBottom: 4 }}>
                <Text strong style={{ fontSize: 14, color: COLORS.textPrimary }}>
                  {exp.company ?? "Công ty không rõ"}
                </Text>
                {exp.title && (
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 8 }}>
                    — {exp.title}
                  </Text>
                )}
              </div>

              {/* Date range */}
              {dateRange && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginBottom: 6,
                  }}
                >
                  <ClockCircleOutlined />
                  <span>{dateRange}</span>
                  {exp.is_current && (
                    <Tag
                      color="green"
                      style={{ borderRadius: 4, margin: 0, fontSize: 11, lineHeight: "18px" }}
                    >
                      Đang làm
                    </Tag>
                  )}
                </div>
              )}

              {/* Description (truncated, expand on click) */}
              {exp.description && (
                <div style={{ marginBottom: 6 }}>
                  <Paragraph
                    style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 }}
                    ellipsis={expanded ? false : { rows: 2 }}
                  >
                    {exp.description}
                  </Paragraph>
                  <span
                    onClick={() => toggleExpand(index)}
                    style={{
                      fontSize: 12,
                      color: COLORS.primary,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {expanded ? (
                      <>Thu gọn <UpOutlined style={{ fontSize: 10 }} /></>
                    ) : (
                      <>Xem thêm <DownOutlined style={{ fontSize: 10 }} /></>
                    )}
                  </span>
                </div>
              )}

              {/* Technologies */}
              {exp.technologies.length > 0 && (
                <Space wrap size={4}>
                  {exp.technologies.map((tech) => (
                    <Tag
                      key={tech}
                      style={{
                        borderRadius: 4,
                        margin: 0,
                        fontSize: 11,
                        background: "#EEF2FF",
                        color: "#4338CA",
                        border: "1px solid #C7D2FE",
                      }}
                    >
                      {tech}
                    </Tag>
                  ))}
                </Space>
              )}
            </div>
          ),
        };
      })}
    />
  );
}
