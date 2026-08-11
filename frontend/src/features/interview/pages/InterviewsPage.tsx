import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, Descriptions, Input, InputNumber, List, Row, Space, Tag } from "antd";
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
import { useI18n } from "../../../i18n/I18nProvider";

const schema = z.object({
  proposedSalary: z.number().min(0, "invalid"),
  comment: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function InterviewResultPage() {
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

  const load = () => {
    getInterviewById(id).then((r) => {
      setInterview(r.data);
      getEvaluations(id).then((e) => setEvals(e.data));
      if (isHR) getSalaryProposals(r.data.applicationId).then((p) => setProposals(p.data));
    });
  };
  useEffect(load, [id]);

  const onProposal = handleSubmit(async (v) => {
    await submitSalaryProposal({ applicationId: interview!.applicationId, interviewId: id, ...v });
    message.success(t("result.submit") + " ✓");
  });

  const onApprove = async (proposalId: number) => {
    const p = proposals.find((x) => x.id === proposalId)!;
    await approveSalaryProposal(proposalId);
    message.success("OK");
    // Sang màn tạo Offer, prefill lương đã chốt
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
          <List dataSource={evals} renderItem={(e) => (
            <List.Item>
              <List.Item.Meta
                title={`${e.interviewerName} — ${e.overallRecommendation ?? "pending"}`}
                description={e.generalComment ?? "-"} />
            </List.Item>
          )} />
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        {isDept && (
          <Card title={t("result.title")}>
            <form onSubmit={onProposal}>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
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
              </Space>
            </form>
          </Card>
        )}

        {isHR && (
          <Card title={<>{t("result.proposedSalary")} <Tag icon={<LockOutlined />} color="warning">{t("result.hrOnly")}</Tag></>}>
            <List dataSource={proposals} locale={{ emptyText: "—" }} renderItem={(p) => (
              <List.Item actions={p.status === "PENDING" ? [
                <Button key="a" type="primary" size="small" onClick={() => onApprove(p.id)}>
                  {t("result.approve")}
                </Button>] : []}>
                <List.Item.Meta
                  title={`${p.proposedByName}: ${p.proposedSalary.toLocaleString("vi-VN")} VND`}
                  description={p.comment ?? "-"} />
              </List.Item>
            )} />
          </Card>
        )}
      </Col>
    </Row>
  );
}