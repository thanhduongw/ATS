import { useCallback, useEffect, useState } from "react";
import {
  Alert, Button, Card, Descriptions, Divider, Input, Modal, Progress, Space,
  Spin, Table, Tag, Tooltip, App,
} from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  ReloadOutlined, LikeOutlined, EditOutlined, WarningOutlined,
  RobotOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  Scorecard, CriterionScore, AiClassification, ScorecardResponse,
} from "../types";
import { getApplicationScore, rescoreApplication, submitAiFeedback } from "../aiApi";

const COLORS = {
  textPrimary: "#1A1A2E",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  borderLight: "#E2E8F0",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  primary: "#6366F1",
};

const STATUS_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PASS: { color: "success", icon: <CheckCircleOutlined />, label: "Đạt" },
  PARTIAL: { color: "warning", icon: <ExclamationCircleOutlined />, label: "Đạt một phần" },
  FAIL: { color: "error", icon: <CloseCircleOutlined />, label: "Chưa đạt" },
};

const CLASSIFICATION_META: Record<AiClassification, { color: string; label: string }> = {
  MATCH: { color: "#22C55E", label: "Phù hợp" },
  REVIEW: { color: "#F59E0B", label: "Cần xem xét" },
  NOT_MATCH: { color: "#EF4444", label: "Chưa phù hợp" },
};

interface Props {
  applicationId: number;
  /** If scorecard JSON is already available from ApplicationResponse, pass it here. */
  initialScorecard?: string | null;
  initialClassification?: AiClassification | null;
  initialScore?: number | null;
}

/**
 * Full AI Scorecard panel — can be used inside a tab or as a standalone section.
 * Fetches score data from ai-service API and displays criteria, evidence, and actions.
 */
export default function ScorecardPanel({
  applicationId,
  initialScorecard,
  initialClassification,
  initialScore,
}: Props) {
  const { message } = App.useApp();
  const [scorecard, setScorecard] = useState<Scorecard | null>(() => {
    if (initialScorecard) {
      try { return JSON.parse(initialScorecard); } catch { return null; }
    }
    return null;
  });
  const [status, setStatus] = useState<string>(
    initialScorecard ? "completed" : "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialScorecard);
  const [rescoring, setRescoring] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackAction, setFeedbackAction] = useState<string>("");
  const [feedbackComment, setFeedbackComment] = useState("");

  const fetchScore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApplicationScore(applicationId);
      const data: ScorecardResponse = res.data;
      setStatus(data.status);
      setScorecard(data.scorecard ?? null);
      setCurrentStage(data.currentStage ?? null);
      setErrorMsg(data.errorMessage ?? null);
    } catch {
      setStatus("failed");
      setErrorMsg("Không thể kết nối đến AI Service");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (!initialScorecard) fetchScore();
  }, [fetchScore, initialScorecard]);

  // Polling when processing
  useEffect(() => {
    if (status !== "processing") return;
    const interval = setInterval(fetchScore, 5000);
    return () => clearInterval(interval);
  }, [status, fetchScore]);

  const handleRescore = async () => {
    setRescoring(true);
    try {
      await rescoreApplication(applicationId);
      message.success("Đã gửi yêu cầu chấm lại. AI đang xử lý...");
      setStatus("processing");
      setCurrentStage("QUEUED");
    } catch {
      message.error("Không thể gửi yêu cầu chấm lại");
    } finally {
      setRescoring(false);
    }
  };

  const handleFeedback = async (action: string) => {
    if (action === "ACCEPT") {
      try {
        await submitAiFeedback({
          applicationId,
          action: "ACCEPT",
          originalScore: scorecard?.totalScore ?? 0,
          comment: null,
        });
        message.success("Đã ghi nhận phản hồi: Đồng ý với kết quả AI");
      } catch {
        message.error("Không thể gửi phản hồi");
      }
      return;
    }
    setFeedbackAction(action);
    setFeedbackComment("");
    setFeedbackOpen(true);
  };

  const submitFeedbackModal = async () => {
    try {
      await submitAiFeedback({
        applicationId,
        action: feedbackAction as "OVERRIDE_SCORE" | "REPORT_ISSUE",
        originalScore: scorecard?.totalScore ?? 0,
        comment: feedbackComment || null,
      });
      message.success("Đã ghi nhận phản hồi");
      setFeedbackOpen(false);
    } catch {
      message.error("Không thể gửi phản hồi");
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: COLORS.textSecondary }}>
          Đang tải kết quả AI...
        </div>
      </div>
    );
  }

  // ── Processing state ──
  if (status === "processing") {
    return (
      <div style={{
        background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: "24px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI</Tag>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>Đang chấm điểm ứng viên...</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pulse 1.5s ease-in-out infinite",
          }}>
            <RobotOutlined style={{ fontSize: 28, color: "#fff" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>
              AI đang phân tích và chấm điểm...
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 4 }}>
              {currentStage ? `Giai đoạn: ${currentStage}` : "Quá trình này có thể mất 30–60 giây"}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.85; }
          }
        `}</style>
      </div>
    );
  }

  // ── Not found ──
  if (status === "not_found") {
    return (
      <div style={{
        background: "#F8FAFC", border: `1px solid ${COLORS.borderLight}`, borderRadius: 12,
        padding: "24px 20px", textAlign: "center",
      }}>
        <InfoCircleOutlined style={{ fontSize: 40, color: COLORS.textMuted, marginBottom: 12 }} />
        <div style={{ fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>
          Chưa có kết quả AI
        </div>
        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
          {errorMsg ?? "Ứng viên chưa được AI chấm điểm. Hệ thống sẽ tự động chấm khi CV được upload."}
        </div>
      </div>
    );
  }

  // ── Pending benchmark ──
  if (status === "pending_benchmark") {
    return (
      <Alert
        type="warning"
        showIcon
        message="Chưa có tiêu chí benchmark"
        description="Job posting cần có benchmark criteria trước khi AI có thể chấm điểm. Vui lòng tạo benchmark trong tab Tuyển dụng."
        style={{ borderRadius: 10 }}
      />
    );
  }

  // ── Failed ──
  if (status === "failed") {
    return (
      <div style={{
        background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "18px 20px",
      }}>
        <Alert
          type="error"
          showIcon
          message="AI chấm điểm thất bại"
          description={errorMsg ?? "Có lỗi xảy ra trong quá trình chấm điểm. Bạn có thể thử lại."}
          style={{ borderRadius: 10, marginBottom: 12 }}
        />
        <Button icon={<ReloadOutlined />} onClick={handleRescore} loading={rescoring} block>
          Thử chấm lại
        </Button>
      </div>
    );
  }

  // ── Completed with scorecard ──
  if (!scorecard) return null;

  const cls = CLASSIFICATION_META[scorecard.classification] ?? CLASSIFICATION_META.NOT_MATCH;

  const criteriaColumns: ColumnsType<CriterionScore> = [
    {
      title: "Tiêu chí",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (text: string, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>
            Trọng số: {r.weight}% {r.isMustHave ? "· Bắt buộc" : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Điểm",
      key: "score",
      width: 100,
      align: "center" as const,
      render: (_: unknown, r: CriterionScore) => (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{r.rawScore}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>/ 100</div>
        </div>
      ),
    },
    {
      title: "Kết quả",
      key: "status",
      width: 120,
      align: "center" as const,
      render: (_: unknown, r: CriterionScore) => {
        const meta = STATUS_META[r.status] ?? STATUS_META.FAIL;
        return <Tag icon={meta.icon} color={meta.color} style={{ borderRadius: 6, margin: 0 }}>{meta.label}</Tag>;
      },
    },
    {
      title: "Bằng chứng",
      key: "evidence",
      render: (_: unknown, r: CriterionScore) => (
        <div>
          <div style={{
            fontSize: 13, fontStyle: "italic", color: COLORS.textSecondary,
            background: "#F8FAFC", padding: "8px 12px", borderRadius: 8,
            borderLeft: `3px solid ${COLORS.primary}`, marginBottom: 6,
          }}>
            "{r.evidence}"
          </div>
          {r.gapAnalysis && r.gapAnalysis !== "Đáp ứng đầy đủ yêu cầu" && (
            <div style={{ fontSize: 12, color: COLORS.warning }}>
              <WarningOutlined /> {r.gapAnalysis}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Header with score circle ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, padding: "16px 20px",
        background: "#FAFBFF", border: `1px solid ${COLORS.borderLight}`, borderRadius: 12,
      }}>
        <div style={{ flexShrink: 0 }}>
          <Progress
            type="circle"
            size={80}
            percent={scorecard.totalScore}
            strokeColor={cls.color}
            format={() => (
              <span style={{ fontSize: 20, fontWeight: 700, color: cls.color }}>
                {Math.round(scorecard.totalScore)}
              </span>
            )}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>AI Score</Tag>
            <Tag
              color={cls.color === "#22C55E" ? "success" : cls.color === "#F59E0B" ? "warning" : "error"}
              style={{ margin: 0, borderRadius: 12, fontWeight: 500 }}
            >
              {cls.label}
            </Tag>
          </div>
          <div style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 1.6 }}>
            {scorecard.summary}
          </div>
        </div>
      </div>

      {/* ── Hard filter warnings ── */}
      {scorecard.hardFilterFlags.some((f) => !f.passed) && (
        <Alert
          type="warning"
          showIcon
          message="Cảnh báo: Thiếu tiêu chí bắt buộc"
          description={
            <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
              {scorecard.hardFilterFlags
                .filter((f) => !f.passed)
                .map((f, i) => (
                  <li key={i}><strong>{f.criterionName}</strong>: {f.reason}</li>
                ))}
            </ul>
          }
          style={{ borderRadius: 10 }}
        />
      )}

      {/* ── Criteria detail table ── */}
      <Card
        size="small"
        title={
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            Chi tiết từng tiêu chí ({scorecard.criteriaScores.length})
          </span>
        }
        style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="name"
          size="small"
          dataSource={scorecard.criteriaScores}
          columns={criteriaColumns}
          pagination={false}
          scroll={{ x: 700 }}
        />
      </Card>

      {/* ── Meta info ── */}
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 3 }}
        style={{ marginTop: 4 }}
        items={[
          { label: "Model", children: scorecard.scoringModel },
          { label: "Prompt version", children: scorecard.promptVersion },
          { label: "Chấm lúc", children: new Date(scorecard.scoredAt).toLocaleString("vi-VN") },
        ]}
      />

      {/* ── Guardrail warnings ── */}
      {scorecard.guardrailWarnings.length > 0 && (
        <Alert
          type="info"
          showIcon
          message="Cảnh báo chất lượng"
          description={
            <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
              {scorecard.guardrailWarnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          }
          style={{ borderRadius: 10 }}
        />
      )}

      <Divider style={{ margin: "4px 0" }} />

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Tooltip title="Đồng ý với kết quả AI">
          <Button icon={<LikeOutlined />} onClick={() => handleFeedback("ACCEPT")}>
            Đồng ý
          </Button>
        </Tooltip>
        <Tooltip title="Ghi chú điều chỉnh score">
          <Button icon={<EditOutlined />} onClick={() => handleFeedback("OVERRIDE_SCORE")}>
            Điều chỉnh
          </Button>
        </Tooltip>
        <Tooltip title="Báo cáo kết quả không chính xác">
          <Button danger icon={<WarningOutlined />} onClick={() => handleFeedback("REPORT_ISSUE")}>
            Báo lỗi
          </Button>
        </Tooltip>
        <Tooltip title="Yêu cầu AI chấm lại từ đầu">
          <Button icon={<ReloadOutlined />} loading={rescoring} onClick={handleRescore}>
            Chấm lại
          </Button>
        </Tooltip>
      </div>

      {/* ── Feedback modal ── */}
      <Modal
        title={feedbackAction === "OVERRIDE_SCORE" ? "Điều chỉnh kết quả AI" : "Báo lỗi kết quả AI"}
        open={feedbackOpen}
        onOk={submitFeedbackModal}
        onCancel={() => setFeedbackOpen(false)}
        okText="Gửi phản hồi"
        cancelText="Hủy"
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>
            Điểm AI hiện tại: <strong>{Math.round(scorecard.totalScore)} / 100</strong> — {cls.label}
          </div>
        </div>
        <Input.TextArea
          rows={3}
          placeholder={
            feedbackAction === "OVERRIDE_SCORE"
              ? "Mô tả lý do điều chỉnh và score bạn cho rằng phù hợp..."
              : "Mô tả vấn đề bạn phát hiện với kết quả AI..."
          }
          value={feedbackComment}
          onChange={(e) => setFeedbackComment(e.target.value)}
        />
      </Modal>
    </div>
  );
}
