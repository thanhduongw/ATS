import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, Descriptions, Input, InputNumber, Row, Tag, Flex, Divider } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../../app/roles";
import { getInterviewById, getEvaluations } from "../interviewApi";
import { approveSalaryProposal, getSalaryProposals, submitSalaryProposal } from "../schedulingApi";
import type { EvaluationResponse, InterviewResponse } from "../types";
import type { SalaryProposalResponse } from "../schedulingTypes";
import { useI18n } from "../../../i18n/useI18n";

const schema = z.object({
  proposedSalary: z.number().min(0, "invalid"),
  comment: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function InterviewsPage() {
  const { interviewId } = useParams();
  const id = Number(interviewId);
  const { message } = App.useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const isHR = !!user && HR_ROLES.includes(user.role);
  const isDept = !!user && DEPARTMENT_ROLES.includes(user.role);

  const [interview, setInterview] = useState<InterviewResponse | null>(null);
  const [evals, setEvals] = useState<EvaluationResponse[]>([]);
  const [proposals, setProposals] = useState<SalaryProposalResponse[]>([]);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = useCallback(() => {
    // [FIX 1] Chặn gọi API khi ID là NaN hoặc undefined
    if (!interviewId || isNaN(id)) {
      navigate("/interviews"); // Điều hướng về trang danh sách
      return;
    }

    getInterviewById(id).then((r) => {
      setInterview(r.data);
      getEvaluations(id).then((e) => setEvals(e.data));
      if (isHR && r.data.applicationId) getSalaryProposals(r.data.applicationId).then((p) => setProposals(p.data));
    }).catch(() => message.error("Không thể tải dữ liệu phỏng vấn"));
  }, [id, interviewId, isHR, message, navigate]);

  useEffect(() => { load(); }, [load]);

  const onProposal = handleSubmit(async (v) => {
    if (!interview) return;
    await submitSalaryProposal({ applicationId: interview.applicationId, interviewId: id, ...v });
    message.success(t("result.submit") + " ✓");
  });

  const onApprove = async (proposalId: number) => {
    const p = proposals.find((x) => x.id === proposalId)!;
    await approveSalaryProposal(proposalId);
    message.success("Đã duyệt ✓");
    navigate(`/offers?applicationId=${p.applicationId}&salary=${p.proposedSalary}`);
  };

  return (
    <Row gutter={16}>
      <Col xs={24} lg={14}>
        <Card title={t("result.evaluations")}>
          <Descriptions size="small" column={2} style={{ marginBottom: 16 }}
            items={[
              { key: "c", label: "Candidate", children: interview?.candidateName },
              { key: "s", label: "Status", children: <Tag>{interview?.status}</Tag> },
            ]} />

          {/* [FIX 2] Thay thế <List> (đã deprecated) bằng Flex và Card */}
          <Flex vertical gap="middle">
            {evals.length === 0 ? (
              <Card size="small" style={{ textAlign: "center", color: "#999" }}>Chưa có đánh giá nào</Card>
            ) : (
              evals.map((e, idx) => (
                <Card key={idx} size="small" style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}>
                  <Flex justify="space-between" align="center">
                    <div style={{ fontWeight: 600 }}>{e.interviewerName}</div>
                    <Tag color="blue">{e.overallRecommendation ?? "pending"}</Tag>
                  </Flex>
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ color: "#666", fontSize: 13 }}>{e.generalComment ?? "-"}</div>
                </Card>
              ))
            )}
          </Flex>
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        {isDept && (
          <Card title={t("result.title")}>
            <form onSubmit={onProposal}>
              {/* [FIX 3] Thay Space direction="vertical" bằng Flex vertical */}
              <Flex vertical gap="middle" style={{ width: "100%" }}>
                <Controller name="proposedSalary" control={control}
                  render={({ field }) => (
                    <InputNumber style={{ width: "100%" }} size="large"
                      addonAfter="VND" placeholder={t("result.proposedSalary")}
                      value={field.value ?? null} onChange={(v) => field.onChange(v)} />
                  )} />
                <Controller name="comment" control={control}
                  render={({ field }) => (
                    <Input.TextArea rows={3} placeholder={t("result.comment")} {...field} />
                  )} />
                <Button block type="primary" htmlType="submit" loading={isSubmitting}>
                  {t("result.submit")} <Tag icon={<LockOutlined />} color="warning">{t("result.hrOnly")}</Tag>
                </Button>
              </Flex>
            </form>
          </Card>
        )}

        {isHR && (
          <Card title={<>{t("result.proposedSalary")} <Tag icon={<LockOutlined />} color="warning">{t("result.hrOnly")}</Tag></>}>
            <Flex vertical gap="middle">
              {proposals.length === 0 ? (
                <div style={{ textAlign: "center", color: "#999", padding: 20 }}>—</div>
              ) : (
                proposals.map((p) => (
                  <Card key={p.id} size="small" style={{ background: "#fafafa" }}>
                    <Flex justify="space-between" align="start" gap="middle">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{p.proposedByName}</div>
                        <div style={{ color: "#1677ff", fontWeight: 500 }}>
                          {p.proposedSalary?.toLocaleString("vi-VN")} VND
                        </div>
                        <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{p.comment ?? "-"}</div>
                      </div>
                      {p.status === "PENDING" && (
                        <Button type="primary" size="small" onClick={() => onApprove(p.id)}>
                          {t("result.approve")}
                        </Button>
                      )}
                    </Flex>
                  </Card>
                ))
              )}
            </Flex>
          </Card>
        )}
      </Col>
    </Row>
  );
}