import { useCallback, useEffect, useState } from "react";
import { Calendar, Badge, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getInterviews } from "../interviewApi";
import type { ApiMessageResponse, InterviewResponse } from "../types";
import InterviewDetailDrawer from "./InterviewDetailDrawer";

const STATUS_BADGE: Record<string, "success" | "processing" | "default"> = {
  SCHEDULED: "processing",
  COMPLETED: "success",
  CANCELLED: "default",
};

export default function InterviewCalendar() {
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<InterviewResponse | null>(null);

  const loadInterviews = useCallback(async () => {
    try {
      const res = await getInterviews();
      setInterviews(res.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được lịch phỏng vấn");
    }
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  const getDayInterviews = (date: Dayjs) =>
    interviews.filter((i) => dayjs(i.scheduledAt).format("YYYY-MM-DD") === date.format("YYYY-MM-DD"));

  return (
    <>
      <Calendar
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
                  <Badge status={STATUS_BADGE[iv.status]} text={`${dayjs(iv.scheduledAt).format("HH:mm")} ${iv.candidateName}`} />
                </li>
              ))}
            </ul>
          );
        }}
      />

      <InterviewDetailDrawer open={detailOpen} interview={selected} onClose={() => setDetailOpen(false)} onChanged={loadInterviews} />
    </>
  );
}
