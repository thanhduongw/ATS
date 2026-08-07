import { useEffect, useState } from "react";
import { Modal, Collapse, Tag, Descriptions, Typography, Spin } from "antd";
import { getEvaluations } from "../interviewApi";
import type { EvaluationResponse } from "../types";

const { Text } = Typography;

interface Props {
  open: boolean;
  interviewId: number | null;
  onClose: () => void;
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_YES: "Rất khuyến nghị nhận",
  YES: "Khuyến nghị nhận",
  NO: "Không khuyến nghị",
  STRONG_NO: "Kiên quyết không nhận",
};

export default function EvaluationSummaryModal({ open, interviewId, onClose }: Props) {
  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !interviewId) return;
    setLoading(true);
    getEvaluations(interviewId)
      .then((res) => setEvaluations(res.data))
      .finally(() => setLoading(false));
  }, [open, interviewId]);

  return (
    <Modal title="Tổng hợp đánh giá" open={open} onCancel={onClose} footer={null} width={640}>
      {loading ? (
        <Spin />
      ) : (
        <Collapse
          items={evaluations.map((e) => ({
            key: e.interviewerId,
            label: (
              <>
                {e.interviewerName}{" "}
                {e.submittedAt ? (
                  <Tag color="blue">{RECOMMENDATION_LABEL[e.overallRecommendation ?? ""] ?? ""}</Tag>
                ) : (
                  <Tag color="default">Chưa nộp</Tag>
                )}
              </>
            ),
            children: e.submittedAt ? (
              <>
                <Descriptions column={1} size="small" bordered>
                  {e.scores.map((s) => (
                    <Descriptions.Item label={s.criteriaName} key={s.criteriaId}>
                      {s.score}/5 {s.comment && <Text type="secondary"> — {s.comment}</Text>}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
                {e.generalComment && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>Nhận xét chung: </Text>
                    {e.generalComment}
                  </div>
                )}
              </>
            ) : (
              <Text type="secondary">Chưa nộp đánh giá</Text>
            ),
          }))}
        />
      )}
    </Modal>
  );
}
