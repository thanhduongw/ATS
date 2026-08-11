import { z } from "zod";

export const postingSchema = z.object({
    requisitionId: z.number({ error: "Vui lòng chọn yêu cầu tuyển dụng" }),
    title: z.string().min(1, "Tiêu đề không được để trống"),
    employmentTypeId: z.number({ error: "Vui lòng chọn loại hình làm việc" }),
    workLocationId: z.number({ error: "Vui lòng chọn địa điểm làm việc" }),
    pipelineId: z.number({ error: "Vui lòng chọn quy trình tuyển dụng" }),
    salaryMin: z.number().optional().nullable(),
    salaryMax: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
    requirements: z.string().optional().nullable(),
    benefits: z.string().optional().nullable(),
});

export type PostingFormValues = z.infer<typeof postingSchema>;