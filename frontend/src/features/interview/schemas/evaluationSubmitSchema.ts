import { z } from "zod";

export const evaluationScoreSchema = z.object({
  criteriaId: z.number(),
  score: z.number().min(1, "Điểm từ 1-5").max(5, "Điểm từ 1-5"),
  comment: z.string().optional().nullable(),
});

export const evaluationSubmitSchema = z.object({
  overallRecommendation: z.enum(["STRONG_YES", "YES", "NO", "STRONG_NO"]),
  /** R46/H14: "Nhận xét chung *" bắt buộc khi nộp. */
  generalComment: z.string({ error: "Vui lòng viết nhận xét chung" }).trim().min(1, "Vui lòng viết nhận xét chung"),
  salaryProposed: z.number().optional().nullable(),
  salaryNote: z.string().optional().nullable(),
  scores: z.array(evaluationScoreSchema).min(1, "Phải chấm điểm ít nhất 1 tiêu chí"),
});

export type EvaluationSubmitFormValues = z.infer<typeof evaluationSubmitSchema>;
