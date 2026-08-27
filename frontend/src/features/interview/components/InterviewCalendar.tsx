import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, Badge, Card, App } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getInterviews } from "../interviewApi";
import type { ApiMessageResponse, InterviewResponse } from "../types";
import InterviewDetailModal from "./InterviewDetailModal";
import { COLORS } from "../../../app/theme";

const STATUS_BADGE: Record<string, "success" | "processing" | "default" | "error"> = {
  SCHEDULED: "processing",
  CONFIRMED: "processing",
  COMPLETED: "success",
  CANCELLED: "default",
};

export default function InterviewCalendar() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<InterviewResponse | null>(null);
  const [panelDate, setPanelDate] = useState<Dayjs | undefined>(undefined);

  const applicationIdParam = searchParams.get("applicationId");

  const loadInterviews = useCallback(async () => {
    try {
      const res = await getInterviews(applicationIdParam ? Number(applicationIdParam) : undefined);
      setInterviews(res.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được lịch phỏng vấn");
    }
  }, [applicationIdParam, message]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  // Tự mở đúng buổi phỏng vấn khi đến từ thông báo (?highlightId=) hoặc từ 1 hồ sơ cụ thể (?applicationId=)
  useEffect(() => {
    if (interviews.length === 0) return;
    const highlightId = searchParams.get("highlightId");
    const target = highlightId
      ? interviews.find((i) => i.id === Number(highlightId))
      : applicationIdParam
        ? interviews[0]
        : null;
    if (target) {
      setSelected(target);
      setDetailOpen(true);
      setPanelDate(dayjs(target.scheduledAt));
      if (highlightId) {
        const next = new URLSearchParams(searchParams);
        next.delete("highlightId");
        setSearchParams(next, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviews]);

  const getDayInterviews = (date: Dayjs) =>
    interviews.filter((i) => dayjs(i.scheduledAt).format("YYYY-MM-DD") === date.format("YYYY-MM-DD"));

  return (
    <div className="page-shell animate-fade-in">
      <Card
        className="table-card-fill"
        style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, flex: 1, minHeight: 0 }}
        styles={{ body: { flex: 1, minHeight: 0, overflowY: "auto" } }}
      >
        <Calendar
          value={panelDate}
          onPanelChange={(date) => setPanelDate(date)}
          cellRender={(current, info) => {
            if (info.type !== "date") return info.originNode;
            const dayInterviews = getDayInterviews(current as Dayjs);
            if (dayInterviews.length === 0) return null;
            return (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {dayInterviews.map((iv) => (
                  <li
                    key={iv.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(iv);
                      setDetailOpen(true);
                    }}
                  >
                    <Badge status={STATUS_BADGE[iv.status] ?? "default"} text={`${dayjs(iv.scheduledAt).format("HH:mm")} ${iv.candidateName}`} />
                  </li>
                ))}
              </ul>
            );
          }}
        />
      </Card>

      <InterviewDetailModal open={detailOpen} interview={selected} onClose={() => setDetailOpen(false)} onChanged={loadInterviews} />
    </div>
  );
}
