/**
 * JdGeneratorPanel — AI-powered JD generation drawer.
 *
 * Flow:
 * 1. Auto-fills input from parent form (title, level, skills, experience)
 * 2. Click "Sinh JD" → calls AI API
 * 3. Preview JD in 4 tabs (overview, responsibilities, requirements, benefits)
 * 4. Preview + edit benchmark criteria with weight sliders
 * 5. Click "Áp dụng" → fills parent form fields
 */

import { useState, useEffect } from "react";
import {
  Drawer,
  Button,
  Input,
  Form,
  Tabs,
  Typography,
  Spin,
  Alert,
  Space,
  Tag,
} from "antd";
import {
  RobotOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  SafetyOutlined,
  GiftOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { generateJD } from "../aiApi";
import type { GeneratedJD, BenchmarkCriterion, JDProvenance } from "../types";
import BenchmarkEditor from "./BenchmarkEditor";

const { Text, Paragraph } = Typography;

export interface JdGeneratorInput {
  title: string;
  level?: string;
  skills?: string[];
  experience?: string;
}

export interface JdGeneratorResult {
  description: string;       // overview + responsibilities combined
  requirements: string;
  benefits: string;
  benchmarkCriteria: BenchmarkCriterion[];
}

interface Props {
  open: boolean;
  input: JdGeneratorInput;
  onClose: () => void;
  onApply: (result: JdGeneratorResult) => void;
}

export default function JdGeneratorPanel({ open, input, onClose, onApply }: Props) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedJD, setGeneratedJD] = useState<GeneratedJD | null>(null);
  const [criteria, setCriteria] = useState<BenchmarkCriterion[]>([]);
  const [provenance, setProvenance] = useState<JDProvenance | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setGeneratedJD(null);
      setCriteria([]);
      setError(null);
      setProvenance(null);
      setNotes("");
      setActiveTab("overview");
    }
  }, [open]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateJD({
        title: input.title,
        level: input.level || null,
        skills: input.skills && input.skills.length > 0 ? input.skills : null,
        experience: input.experience || null,
        notes: notes || null,
      });

      if (res.data.status === "success" && res.data.jd) {
        setGeneratedJD(res.data.jd);
        setCriteria(res.data.benchmarkCriteria ?? []);
        setProvenance(res.data.provenance);
        setActiveTab("overview");
      } else {
        setError(res.data.errorMessage ?? "Sinh JD thất bại. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối đến AI service";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedJD) return;

    // Combine overview + responsibilities into description
    const responsibilitiesList = generatedJD.responsibilities
      .map((r) => `• ${r}`)
      .join("\n");
    const description = `${generatedJD.overview}\n\nTrách nhiệm chính:\n${responsibilitiesList}`;

    onApply({
      description,
      requirements: generatedJD.requirements,
      benefits: generatedJD.benefits,
      benchmarkCriteria: criteria,
    });
    onClose();
  };

  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined style={{ color: "#722ED1" }} />
          <span>Sinh JD bằng AI</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={680}
      destroyOnClose
      styles={{
        body: { padding: "16px 24px", background: "#FAFBFC" },
        footer: { borderTop: "1px solid #f0f0f0", padding: "12px 24px" },
      }}
      footer={
        generatedJD ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => { setGeneratedJD(null); setCriteria([]); }}>
              Sinh lại
            </Button>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleApply}>
              Áp dụng vào form
            </Button>
          </div>
        ) : null
      }
    >
      {/* Input section */}
      {!generatedJD && (
        <div>
          <div
            style={{
              padding: 16,
              background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
              borderRadius: 8,
              marginBottom: 16,
              border: "1px solid #DDD6FE",
            }}
          >
            <Text strong style={{ color: "#5B21B6" }}>
              <ThunderboltOutlined /> Thông tin đầu vào
            </Text>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <InfoItem label="Vị trí" value={input.title} />
              <InfoItem label="Cấp bậc" value={input.level} />
              <InfoItem
                label="Kỹ năng"
                value={input.skills?.join(", ")}
                style={{ gridColumn: "1 / -1" }}
              />
              <InfoItem label="Kinh nghiệm" value={input.experience} />
            </div>
          </div>

          <Form layout="vertical">
            <Form.Item label="Ghi chú bổ sung cho AI" help="Ngành nghề, dự án cụ thể, văn hóa công ty...">
              <Input.TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                showCount
                placeholder="Ví dụ: Công ty fintech, làm việc với microservices, team Agile 8 người..."
              />
            </Form.Item>
          </Form>

          {error && (
            <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} closable onClose={() => setError(null)} />
          )}

          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleGenerate}
            loading={loading}
            block
            size="large"
            disabled={!input.title}
            style={{
              background: loading ? undefined : "linear-gradient(135deg, #7C3AED, #A855F7)",
              border: "none",
              height: 48,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {loading ? "Đang sinh JD..." : "✨ Sinh JD bằng AI"}
          </Button>

          {loading && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Spin size="large" />
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                AI đang phân tích và viết mô tả công việc...
              </Paragraph>
            </div>
          )}
        </div>
      )}

      {/* Result section */}
      {generatedJD && (
        <div>
          {provenance && (
            <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag color="purple">Model: {provenance.model_used}</Tag>
              <Tag color="blue">Thời gian: {(provenance.processing_time_ms / 1000).toFixed(1)}s</Tag>
              <Tag color="green">Chi phí: ${provenance.estimated_cost_usd.toFixed(4)}</Tag>
              {provenance.fallback_used && <Tag color="orange">Fallback used</Tag>}
            </div>
          )}

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            items={[
              {
                key: "overview",
                label: (
                  <span>
                    <FileTextOutlined /> Tổng quan
                  </span>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    <Paragraph style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                      {generatedJD.overview}
                    </Paragraph>
                  </div>
                ),
              },
              {
                key: "responsibilities",
                label: (
                  <span>
                    <UnorderedListOutlined /> Trách nhiệm ({generatedJD.responsibilities.length})
                  </span>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    {generatedJD.responsibilities.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                          padding: "8px 12px",
                          background: i % 2 === 0 ? "#FAFAFA" : "#fff",
                          borderRadius: 6,
                          marginBottom: 4,
                        }}
                      >
                        <Text type="secondary" style={{ flexShrink: 0 }}>
                          {i + 1}.
                        </Text>
                        <Text>{r}</Text>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "requirements",
                label: (
                  <span>
                    <SafetyOutlined /> Yêu cầu
                  </span>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    <Paragraph style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                      {generatedJD.requirements}
                    </Paragraph>
                  </div>
                ),
              },
              {
                key: "benefits",
                label: (
                  <span>
                    <GiftOutlined /> Quyền lợi
                  </span>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    <Paragraph style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                      {generatedJD.benefits}
                    </Paragraph>
                  </div>
                ),
              },
              {
                key: "benchmark",
                label: (
                  <span>
                    <BarChartOutlined /> Tiêu chí đánh giá ({criteria.length})
                  </span>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    <Alert
                      type="info"
                      showIcon
                      message="Kéo slider để điều chỉnh trọng số. Tổng luôn bằng 100%."
                      style={{ marginBottom: 12, borderRadius: 6 }}
                    />
                    <BenchmarkEditor criteria={criteria} onChange={setCriteria} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}

function InfoItem({
  label,
  value,
  style,
}: {
  label: string;
  value?: string | null;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
      <div>
        <Text strong>{value || "—"}</Text>
      </div>
    </div>
  );
}
