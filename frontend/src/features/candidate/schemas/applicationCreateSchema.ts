import { z } from "zod";

export const applicationCreateSchema = z.object({
  candidateId: z.number({ error: "Vui lòng chọn ứng viên" }),
  jobPostingId: z.number({ error: "Vui lòng chọn tin tuyển dụng" }),
  recruitmentSourceId: z.number({ error: "Vui lòng chọn nguồn tuyển dụng" }),
  assignedRecruiterId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

export type ApplicationCreateFormValues = z.infer<typeof applicationCreateSchema>;
