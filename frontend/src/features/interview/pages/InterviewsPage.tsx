import { Card, Tabs } from "antd";
import InterviewCalendar from "../components/InterviewCalendar";
import MyEvaluationsList from "../components/MyEvaluationsList";

export default function InterviewsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Tabs
          items={[
            { key: "calendar", label: "Lịch phỏng vấn", children: <InterviewCalendar /> },
            { key: "my-evaluations", label: "Đánh giá của tôi", children: <MyEvaluationsList /> },
          ]}
        />
      </Card>
    </div>
  );
}
