import { useCallback, useEffect, useState } from "react";
import { List, Tag, Button, Segmented, message } from "antd";
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

      <List
        loading={loading}
        bordered
        dataSource={displayed}
        renderItem={({ interview, submitted }) => (
          <List.Item
            actions={[
              submitted ? (
                <Tag color="green">Đã nộp</Tag>
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
              ),
            ]}
          >
            <List.Item.Meta
              title={interview.candidateName}
              description={`${dayjs(interview.scheduledAt).format("HH:mm DD/MM/YYYY")} · ${
                interview.format === "ONLINE" ? "Online" : "Offline"
              }`}
            />
          </List.Item>
        )}
      />

      <EvaluationSubmitModal
        open={submitModalOpen}
        interviewId={targetInterviewId}
        criteria={criteria}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
