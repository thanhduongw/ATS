import { useEffect } from "react";
import { App, Divider, Form, Input, Modal, Radio, Rate, Typography } from "antd";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AxiosError } from "axios";

import { submitApplicationEvaluation, submitEvaluation } from "../interviewApi";
import {
  evaluationSubmitSchema,
  type EvaluationSubmitFormValues,
} from "../schemas/evaluationSubmitSchema";
import type { ApiMessageResponse } from "../types";
import type { CatalogItem } from "../../masterdata/types";
import { COLORS, RADIUS } from "../../../app/theme";

const { Text } = Typography;

/**
 * Bai cham gan vao mot buoi phong van, hoac gan thang vao ho so khi vong hien tai
 * khong co buoi phong van nao (vi du HR cham o vong Sang loc CV).
 */
export type EvaluationTarget =
  | { kind: "interview"; interviewId: number; roundName?: string }
  | { kind: "application"; applicationId: number; roundName?: string };

interface Props {
  open: boolean;
  target: EvaluationTarget | null;
  criteria: CatalogItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const RECOMMENDATION_OPTIONS = [
  { value: "STRONG_YES", label: "Rất khuyến nghị nhận" },
  { value: "YES", label: "Khuyến nghị nhận" },
  { value: "NO", label: "Không khuyến nghị" },
  { value: "STRONG_NO", label: "Kiên quyết không nhận" },
];

/** Tiêu đề mục, đánh số theo đúng thứ tự người phỏng vấn điền. */
function SectionTitle({ index, children }: { index: number; children: string }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, margin: "4px 0 12px" }}>
      {index}. {children}
    </div>
  );
}

export default function EvaluationSubmitModal({
  open,
  target,
  criteria,
  onClose,
  onSuccess,
}: Props) {
  const { message } = App.useApp();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EvaluationSubmitFormValues>({ resolver: zodResolver(evaluationSubmitSchema) });

  const { fields } = useFieldArray({ control, name: "scores" });
  const watchedScores = watch("scores");

  useEffect(() => {
    if (!open) return;
    reset({
      overallRecommendation: "YES",
      generalComment: "",
      salaryProposed: undefined,
      salaryNote: "",
      scores: criteria.map((c) => ({ criteriaId: c.id, score: 3, comment: "" })),
    });
  }, [open, criteria, reset]);

  const onSubmit = async (data: EvaluationSubmitFormValues) => {
    if (!target) return;
    try {
      if (target.kind === "interview") {
        await submitEvaluation(target.interviewId, data);
      } else {
        await submitApplicationEvaluation(target.applicationId, data);
      }
      message.success("Đã nộp đánh giá");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Nộp đánh giá thất bại");
    }
  };

  return (
    <Modal
      title={target?.roundName ? `Đánh giá — ${target.roundName}` : "Đánh giá ứng viên"}
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Nộp đánh giá"
      cancelText="Hủy"
      width={720}
      destroyOnHidden
    >
      <Form layout="vertical" style={{ marginTop: 8 }}>
        <SectionTitle index={1}>Bảng chấm điểm</SectionTitle>

        <div
          style={{
            border: `1px solid ${COLORS.borderLight}`,
            borderRadius: RADIUS.md,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {fields.map((field, index) => (
            <div
              key={field.id}
              style={{
                padding: "12px 14px",
                borderBottom:
                  index < fields.length - 1 ? `1px solid ${COLORS.borderLight}` : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ flex: "1 1 190px", fontWeight: 600, fontSize: 14 }}>
                  {criteria[index]?.name as string}
                </span>
                <Controller
                  name={`scores.${index}.score`}
                  control={control}
                  render={({ field: scoreField }) => (
                    <Rate count={5} value={scoreField.value} onChange={scoreField.onChange} />
                  )}
                />
                <span
                  style={{
                    minWidth: 28,
                    textAlign: "right",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: COLORS.primary,
                  }}
                >
                  {watchedScores?.[index]?.score ?? 0}
                </span>
              </div>

              <Controller
                name={`scores.${index}.comment`}
                control={control}
                render={({ field: commentField }) => (
                  <Input
                    {...commentField}
                    value={commentField.value ?? ""}
                    placeholder="Nhận xét cho tiêu chí này (không bắt buộc)"
                    variant="borderless"
                    style={{ paddingLeft: 0, marginTop: 2 }}
                  />
                )}
              />

              {errors.scores?.[index]?.score && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {errors.scores[index]?.score?.message}
                </Text>
              )}
            </div>
          ))}
        </div>

        <Form.Item label="Nhận xét chung">
          <Controller
            name="generalComment"
            control={control}
            render={({ field }) => (
              <Input.TextArea
                {...field}
                value={field.value ?? ""}
                rows={3}
                placeholder="Nhận xét tổng quan về ứng viên sau buổi phỏng vấn"
              />
            )}
          />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item label="Mức lương đề xuất (gửi HR)">
            <Controller
              name="salaryProposed"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  placeholder="VD: 15000000"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Ghi chú về lương, đãi ngộ">
            <Controller
              name="salaryNote"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </Form.Item>
        </div>

        <Divider style={{ margin: "4px 0 16px" }} />

        <SectionTitle index={2}>Đề xuất của người phỏng vấn</SectionTitle>

        <Form.Item
          validateStatus={errors.overallRecommendation ? "error" : ""}
          help={errors.overallRecommendation?.message}
        >
          <Controller
            name="overallRecommendation"
            control={control}
            render={({ field }) => (
              <Radio.Group {...field} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {RECOMMENDATION_OPTIONS.map((option) => (
                  <Radio.Button key={option.value} value={option.value}>
                    {option.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            )}
          />
        </Form.Item>
        {/* 
        <div
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: RADIUS.md,
            padding: "10px 14px",
            fontSize: 13,
            color: "#92400E",
          }}
        >
          Đánh giá đã nộp sẽ được khóa lại và không sửa được. Hãy kiểm tra kỹ trước khi nộp.
        </div> */}
      </Form>
    </Modal>
  );
}
