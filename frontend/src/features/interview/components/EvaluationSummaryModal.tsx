import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Collapse,
  Tag,
  Descriptions,
  Typography,
  Spin,
  Empty,
  Alert,
  Rate,
  Space,
  Divider,
} from "antd";
import type { AxiosError } from "axios";
import { getEvaluations } from "../interviewApi";
import type { ApiMessageResponse, EvaluationResponse, RecommendationType } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS } from "../../../app/theme";

const { Text, Paragraph } = Typography;

interface Props {
  open: boolean;
  interviewId: number | null;
  onClose: () => void;
}

const RECOMMENDATION_LABEL: Record<RecommendationType | string, string> = {
  STRONG_YES: "Rất khuyến nghị nhận",
  YES: "Khuyến nghị nhận",
  NO: "Không khuyến nghị",
  STRONG_NO: "Kiên quyết không nhận",
};

const RECOMMENDATION_COLOR: Record<string, string> = {
  STRONG_YES: "green",
  YES: "blue",
  NO: "orange",
  STRONG_NO: "red",
};

function formatSalary(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Number(value).toLocaleString("vi-VN")} VND`;
}

export default function EvaluationSummaryModal({ open, interviewId, onClose }: Props) {
  const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
  const isHr = !!role && HR_ROLES.includes(role);

  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!interviewId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getEvaluations(interviewId);
      setEvaluations(res.data ?? []);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      setError(axiosErr.response?.data?.message ?? "Không tải được tổng hợp đánh giá");
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    if (!open || !interviewId) return;
    load();
  }, [open, interviewId, load]);

  const submitted = evaluations.filter((e) => e.submittedAt != null);
  const pending = evaluations.filter((e) => e.submittedAt == null);

  return (
    <Modal
      title="Tổng hợp đánh giá phỏng vấn"
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin tip="Đang tải đánh giá..." />
        </div>
      ) : error ? (
        <Alert type="error" showIcon message={error} />
      ) : evaluations.length === 0 ? (
        <Empty description="Chưa có dữ liệu đánh giá" />
      ) : (
        <>
          {!isHr && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Mức lương đề xuất chỉ HR được xem (theo quy định bảo mật nội bộ)."
            />
          )}

          <Space style={{ marginBottom: 12 }} wrap>
            <Tag color="blue">Đã nộp: {submitted.length}</Tag>
            {pending.length > 0 && <Tag color="default">Chưa nộp: {pending.length}</Tag>}
          </Space>

          <Collapse
            defaultActiveKey={submitted.map((e) => String(e.interviewerId))}
            items={evaluations.map((e) => {
              const hasSubmitted = e.submittedAt != null;
              const rec = e.overallRecommendation ?? "";

              return {
                key: String(e.interviewerId),
                label: (
                  <Space wrap>
                    <Text strong>{e.interviewerName || `Interviewer #${e.interviewerId}`}</Text>
                    {hasSubmitted ? (
                      <Tag color={RECOMMENDATION_COLOR[rec] ?? "default"}>
                        {RECOMMENDATION_LABEL[rec] ?? rec}
                      </Tag>
                    ) : (
                      <Tag color="default">Chưa nộp</Tag>
                    )}
                  </Space>
                ),
                children: hasSubmitted ? (
                  <div>
                    {/* Điểm theo tiêu chí */}
                    <Descriptions
                      column={1}
                      size="small"
                      bordered
                      title="Điểm theo tiêu chí"
                      style={{ marginBottom: 12 }}
                    >
                      {(e.scores ?? []).map((s) => (
                        <Descriptions.Item
                          label={s.criteriaName || `Tiêu chí #${s.criteriaId}`}
                          key={s.criteriaId}
                        >
                          <Space direction="vertical" size={0}>
                            <Space>
                              <Rate disabled value={s.score} count={5} style={{ fontSize: 14 }} />
                              <Text>
                                {s.score}/5
                              </Text>
                            </Space>
                            {s.comment ? (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {s.comment}
                              </Text>
                            ) : null}
                          </Space>
                        </Descriptions.Item>
                      ))}
                    </Descriptions>

                    {e.generalComment ? (
                      <div style={{ marginBottom: 12 }}>
                        <Text strong>Nhận xét chung</Text>
                        <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                          {e.generalComment}
                        </Paragraph>
                      </div>
                    ) : null}

                    <Divider style={{ margin: "12px 0" }} />

                    {/* Lương đề xuất — chỉ HR (hoặc API đã trả salary cho chính interviewer) */}
                    <div
                      style={{
                        background: isHr ? "#F0FDF4" : COLORS.borderLight,
                        border: `1px solid ${isHr ? "#BBF7D0" : COLORS.border}`,
                        borderRadius: 8,
                        padding: "10px 14px",
                      }}
                    >
                      <Text strong style={{ display: "block", marginBottom: 4 }}>
                        Đề xuất mức lương
                      </Text>
                      {isHr || e.salaryProposed != null ? (
                        <>
                          <Text style={{ fontSize: 16, color: COLORS.success, fontWeight: 600 }}>
                            {formatSalary(e.salaryProposed)}
                          </Text>
                          {e.salaryNote ? (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary">{e.salaryNote}</Text>
                            </div>
                          ) : null}
                          {!isHr && e.salaryProposed != null ? (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                (Đây là mức bạn đã đề xuất)
                              </Text>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <Text type="secondary">
                          Chỉ HR được xem mức lương do hội đồng đề xuất.
                        </Text>
                      )}
                    </div>

                    {e.submittedAt ? (
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Nộp lúc: {new Date(e.submittedAt).toLocaleString("vi-VN")}
                        </Text>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Text type="secondary">Người phỏng vấn này chưa nộp đánh giá.</Text>
                ),
              };
            })}
          />
        </>
      )}
    </Modal>
  );
}