import { useCallback, useEffect, useState } from "react";
import { Button, Card, Empty, Segmented, Spin, Tag, message } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getInterviews } from "../interviewApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, InterviewResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import EvaluationSubmitModal from "./EvaluationSubmitModal";

export default function MyEvaluationsList() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [criteria, setCriteria] = useState<CatalogItem[]>([]);
  const [filterMode, setFilterMode] = useState<"pending" | "submitted">("pending");
  const [loading, setLoading] = useState(false);

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [targetInterviewId, setTargetInterviewId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [interviewRes, criteriaRes] = await Promise.all([
        getInterviews(),
        getCatalogItems("/masterdata/interview-criteria"),
      ]);
      setInterviews(interviewRes.data);
      setCriteria(criteriaRes.data.filter((c) => c.active));
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const myAssignments = interviews
    .filter((iv) => iv.status !== "CANCELLED")
    .flatMap((iv) =>
      iv.interviewers
        .filter((i) => String(i.interviewerId) === currentUser?.userId)
        .map((i) => ({ interview: iv, submitted: i.evaluationSubmitted }))
    );

  const displayed = myAssignments.filter((a) => (filterMode === "pending" ? !a.submitted : a.submitted));

  return (
    <div>
      <Segmented
        value={filterMode}
        onChange={(v) => setFilterMode(v as "pending" | "submitted")}
        options={[
          { label: "Chưa đánh giá", value: "pending" },
          { label: "Đã đánh giá", value: "submitted" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin />
        </div>
      ) : displayed.length === 0 ? (
        <Empty description="Không có lịch phỏng vấn phù hợp" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayed.map(({ interview, submitted }) => (
            <Card key={interview.id} size="small">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{interview.candidateName}</div>
                  <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
                    {`${dayjs(interview.scheduledAt).format("HH:mm DD/MM/YYYY")} · ${
                      interview.format === "ONLINE" ? "Online" : "Offline"
                    }`}
                  </div>
                </div>
                {submitted ? (
                  <Tag color="green" style={{ margin: 0 }}>Đã nộp</Tag>
                ) : (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      setTargetInterviewId(interview.id);
                      setSubmitModalOpen(true);
                    }}
                  >
                    Nộp đánh giá
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <EvaluationSubmitModal
        open={submitModalOpen}
        target={targetInterviewId != null ? { kind: "interview", interviewId: targetInterviewId } : null}
        criteria={criteria}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
