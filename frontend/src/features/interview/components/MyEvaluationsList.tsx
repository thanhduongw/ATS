import { useCallback, useEffect, useState } from "react";
import { Button, Card, Empty, Segmented, Spin, Tag, message } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getInterviews } from "../interviewApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { INTERVIEW_HELD, type ApiMessageResponse, type InterviewResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import EvaluationSubmitModal from "./EvaluationSubmitModal";
import { EVALUATION_DUE_HOURS, evaluationDueAt } from "../evaluationDeadline";

export default function MyEvaluationsList() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [criteria, setCriteria] = useState<CatalogItem[]>([]);
  const [filterMode, setFilterMode] = useState<"pending" | "submitted">("pending");
  const [loading, setLoading] = useState(true);

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
    .flatMap((iv) =>
      iv.interviewers
        .filter((i) => String(i.interviewerId) === currentUser?.userId)
        .map((i) => ({ interview: iv, submitted: i.evaluationSubmitted }))
    )
    .filter((assignment) => assignment.submitted || INTERVIEW_HELD.has(assignment.interview.status));

  const displayed = myAssignments.filter((a) => (filterMode === "pending" ? !a.submitted : a.submitted));

  return (
    <div>
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginBottom: 10 }}>
        Hạn nộp đánh giá là {EVALUATION_DUE_HOURS} giờ sau buổi phỏng vấn. Quá hạn mà chưa nộp,
        hệ thống sẽ gửi thông báo nhắc.
      </div>

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
                      interview.format === "ONLINE" ? "Trực tuyến" : "Trực tiếp"
                    }`}
                  </div>
                  {!submitted && (() => {
                    const due = evaluationDueAt(interview.scheduledAt);
                    const overdue = due.isBefore(dayjs());
                    return (
                      <div style={{ fontSize: 12, color: overdue ? "#B91C1C" : "#B45309", marginTop: 2 }}>
                        {overdue
                          ? `Quá hạn nộp ${due.fromNow(true)}`
                          : `Hạn nộp ${due.format("HH:mm DD/MM")}`}
                      </div>
                    );
                  })()}
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
