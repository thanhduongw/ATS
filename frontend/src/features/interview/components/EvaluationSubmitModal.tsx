import { useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Select, Input, Rate, message, Divider, Typography } from "antd";
import type { AxiosError } from "axios";
import { evaluationSubmitSchema, type EvaluationSubmitFormValues } from "../schemas/evaluationSubmitSchema";
import { submitEvaluation } from "../interviewApi";
import type { ApiMessageResponse } from "../types";
import type { CatalogItem } from "../../masterdata/types";

const { Text } = Typography;

interface Props {
  open: boolean;
  interviewId: number | null;
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

export default function EvaluationSubmitModal({ open, interviewId, criteria, onClose, onSuccess }: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EvaluationSubmitFormValues>({ resolver: zodResolver(evaluationSubmitSchema) });

  const { fields } = useFieldArray({ control, name: "scores" });

  useEffect(() => {
    if (!open) return;
    reset({
      overallRecommendation: "YES",
      generalComment: "",
      scores: criteria.map((c) => ({ criteriaId: c.id, score: 3, comment: "" })),
    });
  }, [open, criteria, reset]);

  const onSubmit = async (data: EvaluationSubmitFormValues) => {
    if (!interviewId) return;
    try {
      await submitEvaluation(interviewId, data);
      message.success("Nộp đánh giá thành công");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Nộp đánh giá thất bại");
    }
  };

  return (
    <Modal
      title="Đánh giá phỏng vấn"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Nộp đánh giá"
      cancelText="Hủy"
      width={600}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item
          label="Đề xuất tổng thể"
          validateStatus={errors.overallRecommendation ? "error" : ""}
          help={errors.overallRecommendation?.message}
        >
          <Controller
            name="overallRecommendation"
            control={control}
            render={({ field }) => <Select {...field} options={RECOMMENDATION_OPTIONS} />}
          />
        </Form.Item>

        <Divider plain>
          Chấm điểm theo tiêu chí (1-5)
        </Divider>

        {fields.map((field, index) => (
          <Form.Item key={field.id} label={criteria[index]?.name as string}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Controller
                name={`scores.${index}.score`}
                control={control}
                render={({ field: scoreField }) => (
                  <Rate count={5} value={scoreField.value} onChange={scoreField.onChange} />
                )}
              />
              <Controller
                name={`scores.${index}.comment`}
                control={control}
                render={({ field: commentField }) => (
                  <Input
                    {...commentField}
                    value={commentField.value ?? ""}
                    placeholder="Nhận xét (không bắt buộc)"
                    style={{ flex: 1 }}
                  />
                )}
              />
            </div>
            {errors.scores?.[index]?.score && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {errors.scores[index]?.score?.message}
              </Text>
            )}
          </Form.Item>
        ))}

        <Form.Item label="Nhận xét chung (không bắt buộc)">
          <Controller
            name="generalComment"
            control={control}
            render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} />}
          />
        </Form.Item>

        <Form.Item label="Đề xuất mức lương (VNĐ) & Ghi chú đãi ngộ">
          <div style={{ display: "flex", gap: 12 }}>
            <Controller
              name="salaryProposed"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  placeholder="Lương đề xuất (VD: 15000000)"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  style={{ width: "50%" }}
                />
              )}
            />
            <Controller
              name="salaryNote"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="Ghi chú thêm về lương/thưởng"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  style={{ width: "50%" }}
                />
              )}
            />
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
