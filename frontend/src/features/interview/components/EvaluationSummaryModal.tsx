import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal,
  Button,
  Tooltip,
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
import { ArrowLeftOutlined, FileAddOutlined, SwapOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getEvaluations } from "../interviewApi";
import type {
  ApiMessageResponse,
  EvaluationResponse,
  InterviewResponse,
  RecommendationType,
} from "../types";
import CandidateComparisonPanel from "../../offer/components/CandidateComparisonPanel";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS } from "../../../app/theme";

const { Text, Paragraph } = Typography;

interface Props {
  open: boolean;
  /** Cần cả hồ sơ và tin tuyển dụng của buổi này để tạo offer và so sánh. */
  interview: InterviewResponse | null;
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

export default function EvaluationSummaryModal({ open, interview, onClose }: Props) {
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
  const isHr = !!role && HR_ROLES.includes(role);
  const interviewId = interview?.id ?? null;

  /**
   * Hai chế độ trong cùng một modal thay vì mở modal lồng modal — xem đánh giá xong
   * so sánh ngay, rồi quay lại, mà màn hình không bị chồng nhiều lớp.
   */
  const [view, setView] = useState<"summary" | "compare">("summary");

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

  /** Lần mở sau phải bắt đầu lại từ bảng tổng hợp, không giữ chế độ so sánh cũ. */
  const handleClose = () => {
    setView("summary");
    onClose();
  };

  const comparing = view === "compare";
  const canCompare = interview?.jobPostingId != null;

  const footer = comparing ? (
    <Button icon={<ArrowLeftOutlined />} onClick={() => setView("summary")}>
      Quay lại tổng hợp đánh giá
    </Button>
  ) : isHr ? (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
      <Tooltip title={canCompare ? undefined : "Buổi phỏng vấn này chưa gắn với tin tuyển dụng nào"}>
        <Button icon={<SwapOutlined />} disabled={!canCompare} onClick={() => setView("compare")}>
          So sánh ứng viên khác
        </Button>
      </Tooltip>
      <Button
        type="primary"
        icon={<FileAddOutlined />}
        onClick={() => {
          if (!interview) return;
          handleClose();
          navigate(`/offers/create?applicationId=${interview.applicationId}`);
        }}
      >
        Tạo offer
      </Button>
    </div>
  ) : null;

  return (
    <Modal
      title={comparing ? "So sánh ứng viên" : "Tổng hợp đánh giá phỏng vấn"}
      open={open}
      onCancel={handleClose}
      footer={footer}
      // Bảng so sánh xếp tối đa 4 ứng viên cạnh nhau nên cần rộng hơn hẳn.
      // min() kẹp trực tiếp trong CSS; maxWidth qua prop style không ăn ở antd v6.
      width={comparing ? "min(2200px, 98vw)" : 960}
      // Dâng modal lên gần đỉnh để lấy thêm chiều cao, và cho phần thân tự cuộn
      // thay vì đẩy cả trang — như vậy chân modal luôn nằm trong tầm mắt.
      style={{ top: 16 }}
      styles={{
        body: {
          maxHeight: comparing ? "86vh" : "80vh",
          overflowY: "auto",
          // Bớt lề hai bên khi so sánh để bảng 8 cột có thêm chỗ nằm ngang.
          ...(comparing ? { paddingLeft: 12, paddingRight: 12 } : {}),
        },
      }}
      destroyOnHidden
    >
      {comparing && interview?.jobPostingId != null ? (
        <CandidateComparisonPanel jobPostingId={interview.jobPostingId} showHeader={false} />
      ) : loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin tip="Đang tải đánh giá..." />
        </div>
      ) : error ? (
        <Alert type="error" showIcon title={error} />
      ) : evaluations.length === 0 ? (
        <Empty description="Chưa có dữ liệu đánh giá" />
      ) : (
        <>
          {/* {!isHr && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title="Mức lương đề xuất chỉ HR được xem (theo quy định bảo mật nội bộ)."
            />
          )} */}

          <Space style={{ marginBottom: 12 }} wrap>
            <Tag color="blue">Đã nộp: {submitted.length}</Tag>
            {pending.length > 0 && <Tag color="default">Chưa nộp: {pending.length}</Tag>}
          </Space>

          <Collapse
            defaultActiveKey={submitted.map((e) => String(e.interviewerId))}
            items={evaluations.map((e) => {
              const hasSubmitted = e.submittedAt != null;
              const locked = hasSubmitted && !e.contentVisible;
              const rec = e.overallRecommendation ?? "";

              return {
                key: String(e.interviewerId),
                label: (
                  <Space wrap>
                    <Text strong>{e.interviewerName || `Người phỏng vấn #${e.interviewerId}`}</Text>
                    {!hasSubmitted ? (
                      <Tag color="default">Chưa nộp</Tag>
                    ) : locked ? (
                      <Tag color="warning">Đã nộp — chưa mở khóa</Tag>
                    ) : (
                      <Tag color={RECOMMENDATION_COLOR[rec] ?? "default"}>
                        {RECOMMENDATION_LABEL[rec] ?? rec}
                      </Tag>
                    )}
                  </Space>
                ),
                children: locked ? (
                  <Text type="secondary">
                    Bạn cần nộp đánh giá của mình trước, sau đó mới đọc được bài chấm
                    của người phỏng vấn khác.
                  </Text>
                ) : hasSubmitted ? (
                  <div>
                    {/* Điểm theo tiêu chí */}
                    {/* Hai cột trên màn rộng: tám tiêu chí còn bốn hàng thay vì tám. */}
                    <Descriptions
                      column={{ xs: 1, sm: 1, md: 2 }}
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
                          <Space orientation="vertical" size={0}>
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
