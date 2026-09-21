import {
  Descriptions,
  Card,
  Collapse,
  Progress,
  Tag,
  Space,
  Statistic,
  Alert,
  List,
  Typography,
} from "antd";
import {
  UserOutlined,
  TrophyOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  ProjectOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  GithubOutlined,
  LinkedinOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { CVExtractionResult, ExtractionProvenance, CompletenessLevel } from "../types";
import FieldConfidenceBadge from "./FieldConfidenceBadge";
import SkillTagsDisplay from "./SkillTagsDisplay";
import WorkExperienceTimeline from "./WorkExperienceTimeline";
import { COLORS } from "../../../app/theme";

const { Text } = Typography;

interface Props {
  result: CVExtractionResult;
  provenance: ExtractionProvenance;
}

const COMPLETENESS_PERCENT: Record<CompletenessLevel, number> = {
  COMPLETE: 100,
  PARTIAL: 60,
  MINIMAL: 25,
};

const COMPLETENESS_COLOR: Record<CompletenessLevel, string> = {
  COMPLETE: "#10B981",
  PARTIAL: "#F59E0B",
  MINIMAL: "#EF4444",
};

const COMPLETENESS_LABEL: Record<CompletenessLevel, string> = {
  COMPLETE: "Đầy đủ",
  PARTIAL: "Một phần",
  MINIMAL: "Tối thiểu",
};

const PROFICIENCY_LABEL: Record<string, string> = {
  NATIVE: "Bản ngữ",
  FLUENT: "Thành thạo",
  INTERMEDIATE: "Trung cấp",
  BASIC: "Cơ bản",
};

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>
      {icon}
      {title}
    </div>
  );
}

export default function CvParseResultPanel({ result, provenance }: Props) {
  const { extracted_cv: cv } = result;
  const { candidate } = cv;

  const yoeCalc = result.years_of_experience_calculated;
  const yoeClaimed = cv.years_of_experience_claimed;
  const yoeDiff = yoeCalc != null && yoeClaimed != null ? Math.abs(yoeCalc - yoeClaimed) : null;

  const completenessEntries = Object.entries(result.completeness_details);
  const filledCount = completenessEntries.filter(([, v]) => v).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Header: candidate info ── */}
      <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <SectionTitle icon={<UserOutlined />} title="Thông tin ứng viên" />
          <FieldConfidenceBadge level={result.overall_confidence} />
        </div>
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          size="small"
          labelStyle={{ color: COLORS.textMuted, fontSize: 12 }}
          contentStyle={{ fontSize: 13, fontWeight: 500 }}
        >
          <Descriptions.Item label="Họ tên">{candidate.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{candidate.email ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{candidate.phone ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">{candidate.date_of_birth ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Giới tính">
            {candidate.gender === "MALE" ? "Nam" : candidate.gender === "FEMALE" ? "Nữ" : candidate.gender === "OTHER" ? "Khác" : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{candidate.location ?? "—"}</Descriptions.Item>
        </Descriptions>

        {/* Social links */}
        {(candidate.linkedin_url || candidate.github_url || candidate.portfolio_url) && (
          <Space size={12} style={{ marginTop: 8 }}>
            {candidate.linkedin_url && (
              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                <LinkedinOutlined /> LinkedIn
              </a>
            )}
            {candidate.github_url && (
              <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                <GithubOutlined /> GitHub
              </a>
            )}
            {candidate.portfolio_url && (
              <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                <LinkOutlined /> Portfolio
              </a>
            )}
          </Space>
        )}

        {/* Summary */}
        {candidate.summary && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#F8FAFC", border: `1px solid ${COLORS.borderLight}` }}>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              {candidate.summary}
            </Text>
          </div>
        )}
      </Card>

      {/* ── Experience stats ── */}
      <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
        <SectionTitle icon={<ClockCircleOutlined />} title="Kinh nghiệm" />
        <div style={{ display: "flex", gap: 32, marginTop: 12 }}>
          <Statistic
            title={<span style={{ fontSize: 12 }}>Tính toán từ lịch sử</span>}
            value={yoeCalc ?? "—"}
            suffix={yoeCalc != null ? "năm" : ""}
            valueStyle={{ fontSize: 20, fontWeight: 700, color: COLORS.primary }}
          />
          <Statistic
            title={<span style={{ fontSize: 12 }}>Ứng viên tự khai</span>}
            value={yoeClaimed ?? "—"}
            suffix={yoeClaimed != null ? "năm" : ""}
            valueStyle={{ fontSize: 20, fontWeight: 700, color: COLORS.textSecondary }}
          />
        </div>
        {yoeDiff != null && yoeDiff > 0.5 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 10, borderRadius: 8 }}
            message={`Chênh lệch ${yoeDiff.toFixed(1)} năm giữa kinh nghiệm tính toán và tự khai`}
          />
        )}
      </Card>

      {/* ── Skills ── */}
      {cv.skills.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
          <SectionTitle icon={<TrophyOutlined />} title="Kỹ năng" />
          <div style={{ marginTop: 10 }}>
            <SkillTagsDisplay skills={cv.skills} />
          </div>
        </Card>
      )}

      {/* ── Work Experience ── */}
      {cv.work_experience.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
          <SectionTitle icon={<ClockCircleOutlined />} title="Lịch sử làm việc" />
          <div style={{ marginTop: 12 }}>
            <WorkExperienceTimeline items={cv.work_experience} />
          </div>
        </Card>
      )}

      {/* ── Education ── */}
      {cv.education.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
          <SectionTitle icon={<BookOutlined />} title="Học vấn" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {cv.education.map((edu, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#F8FAFC",
                  border: `1px solid ${COLORS.borderLight}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>
                  {edu.institution ?? "Trường không rõ"}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                  {[edu.degree, edu.field_of_study].filter(Boolean).join(" — ") || "—"}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                  {(edu.start_date || edu.end_date) && (
                    <span>{[edu.start_date, edu.end_date].filter(Boolean).join(" → ")}</span>
                  )}
                  {edu.gpa && <span>GPA: {edu.gpa}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Certifications ── */}
      {cv.certifications.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
          <SectionTitle icon={<SafetyCertificateOutlined />} title="Chứng chỉ" />
          <List
            size="small"
            style={{ marginTop: 8 }}
            dataSource={cv.certifications}
            renderItem={(cert) => (
              <List.Item style={{ padding: "8px 0" }}>
                <List.Item.Meta
                  title={<span style={{ fontSize: 13, fontWeight: 600 }}>{cert.name ?? "—"}</span>}
                  description={
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                      {[cert.issuer, cert.date_obtained].filter(Boolean).join(" · ") || "—"}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* ── Projects ── */}
      {cv.projects.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
          <SectionTitle icon={<ProjectOutlined />} title="Dự án" />
          <Collapse
            ghost
            style={{ marginTop: 8 }}
            items={cv.projects.map((proj, i) => ({
              key: i,
              label: (
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {proj.name ?? `Dự án ${i + 1}`}
                  {proj.role && (
                    <Tag style={{ marginLeft: 8, borderRadius: 4, fontSize: 11 }} color="blue">
                      {proj.role}
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <div>
                  {proj.description && (
                    <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>
                      {proj.description}
                    </div>
                  )}
                  {proj.technologies.length > 0 && (
                    <Space wrap size={4}>
                      {proj.technologies.map((tech) => (
                        <Tag
                          key={tech}
                          style={{
                            borderRadius: 4,
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
                  {proj.url && (
                    <div style={{ marginTop: 6 }}>
                      <a href={proj.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                        <LinkOutlined /> {proj.url}
                      </a>
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        </Card>
      )}

      {/* ── Languages ── */}
      {cv.languages.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
          <SectionTitle icon={<GlobalOutlined />} title="Ngôn ngữ" />
          <Space wrap size={8} style={{ marginTop: 10 }}>
            {cv.languages.map((lang) => (
              <Tag
                key={lang.language}
                style={{ borderRadius: 6, fontSize: 13, padding: "4px 10px" }}
                color="blue"
              >
                {lang.language}
                {lang.proficiency && (
                  <span style={{ marginLeft: 6, opacity: 0.75 }}>
                    ({PROFICIENCY_LABEL[lang.proficiency] ?? lang.proficiency})
                  </span>
                )}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* ── Completeness ── */}
      <Card size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
        <SectionTitle icon={<InfoCircleOutlined />} title="Độ đầy đủ hồ sơ" />
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Progress
              percent={COMPLETENESS_PERCENT[result.completeness]}
              strokeColor={COMPLETENESS_COLOR[result.completeness]}
              style={{ flex: 1 }}
              format={() => COMPLETENESS_LABEL[result.completeness]}
            />
          </div>
          {completenessEntries.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {completenessEntries.map(([field, present]) => (
                <Tag
                  key={field}
                  color={present ? "success" : "default"}
                  style={{ borderRadius: 4, fontSize: 11, margin: 0 }}
                >
                  {present ? "✓" : "✗"} {field}
                </Tag>
              ))}
              <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>
                ({filledCount}/{completenessEntries.length} trường)
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Field Confidences ── */}
      {cv.field_confidences.length > 0 && (
        <Collapse
          ghost
          items={[{
            key: "field-confidences",
            label: <span style={{ fontSize: 13, fontWeight: 500 }}>Chi tiết độ tin cậy từng trường</span>,
            children: (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cv.field_confidences.map((fc) => (
                  <div
                    key={fc.field_name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "#FAFBFC",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{fc.field_name}</span>
                    <FieldConfidenceBadge level={fc.confidence} />
                  </div>
                ))}
              </div>
            ),
          }]}
        />
      )}

      {/* ── Provenance (developer info, collapsible) ── */}
      <Collapse
        ghost
        items={[{
          key: "provenance",
          label: <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted }}>Thông tin xử lý (dành cho developer)</span>,
          children: (
            <Descriptions
              column={2}
              size="small"
              labelStyle={{ color: COLORS.textMuted, fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            >
              <Descriptions.Item label="Model">{provenance.model_used}</Descriptions.Item>
              <Descriptions.Item label="Prompt version">{provenance.prompt_version}</Descriptions.Item>
              <Descriptions.Item label="Thời gian">{(provenance.processing_time_ms / 1000).toFixed(1)}s</Descriptions.Item>
              <Descriptions.Item label="Tokens">{provenance.input_tokens + provenance.output_tokens}</Descriptions.Item>
              <Descriptions.Item label="Chi phí">${provenance.estimated_cost_usd.toFixed(4)}</Descriptions.Item>
              <Descriptions.Item label="Fallback">{provenance.fallback_used ? "Có" : "Không"}</Descriptions.Item>
              <Descriptions.Item label="Retries">{provenance.retries}</Descriptions.Item>
            </Descriptions>
          ),
        }]}
      />
    </div>
  );
}
