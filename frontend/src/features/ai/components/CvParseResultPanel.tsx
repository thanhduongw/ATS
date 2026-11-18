import { Alert, Tag } from "antd";
import {
  BookOutlined,
  GlobalOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import type { CVFacts, CvFact, CvFactCategory, CvFactsProvenance } from "../types";
import { COLORS } from "../../../app/theme";

interface Props {
  result: CVFacts;
  provenance?: CvFactsProvenance | null;
}

// 6 nhóm dữ kiện, theo thứ tự hiển thị.
const GROUPS: { category: CvFactCategory; title: string; icon: ReactNode }[] = [
  { category: "WORK_EXPERIENCE", title: "Kinh nghiệm làm việc", icon: <TrophyOutlined /> },
  { category: "SKILLS", title: "Kỹ năng", icon: <ToolOutlined /> },
  { category: "EDUCATION", title: "Học vấn", icon: <BookOutlined /> },
  { category: "CERTIFICATIONS", title: "Chứng chỉ", icon: <SafetyCertificateOutlined /> },
  { category: "PROJECT", title: "Dự án", icon: <ProjectOutlined /> },
  { category: "LANGUAGE", title: "Ngoại ngữ", icon: <GlobalOutlined /> },
];

function SectionTitle({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>
      {icon}
      {title}
      <span style={{ color: COLORS.textMuted, fontWeight: 400, fontSize: 12.5 }}>({count})</span>
    </div>
  );
}

// Một dữ kiện: ghi chú của AI, bên dưới là câu trích nguyên văn từ CV (in nghiêng).
function FactItem({ fact }: { fact: CvFact }) {
  return (
    <li style={{ marginBottom: 8, lineHeight: 1.55 }}>
      <div style={{ fontSize: 13.5, color: COLORS.textPrimary }}>{fact.note}</div>
      <div style={{ fontSize: 12.5, color: COLORS.textMuted, fontStyle: "italic" }}>“{fact.quote}”</div>
    </li>
  );
}

/**
 * Khối "Phân tích CV": dữ kiện AI trích từ CV (đã che thông tin cá nhân), gom theo 6 nhóm. Mỗi dữ kiện kèm câu trích
 * nguyên văn để HR đối chiếu với CV; phần "Hạn chế" ghi những gì AI không lấy được.
 */
export default function CvParseResultPanel({ result, provenance }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {GROUPS.map(({ category, title, icon }) => {
        const facts = result.facts.filter((f) => f.category === category);
        if (facts.length === 0) return null;
        return (
          <section key={category}>
            <SectionTitle icon={icon} title={title} count={facts.length} />
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {facts.map((f, i) => <FactItem key={`${category}-${i}`} fact={f} />)}
            </ul>
          </section>
        );
      })}

      {result.limitations.length > 0 && (
        <Alert
          type="info"
          showIcon
          title="Hạn chế của bản phân tích"
          description={(
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {result.limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        />
      )}

      {provenance?.model && (
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>
          Phân tích bởi <Tag style={{ margin: "0 4px" }}>{provenance.model}</Tag>
          {provenance.prompt_version && `· ${provenance.prompt_version}`}
        </div>
      )}
    </div>
  );
}
