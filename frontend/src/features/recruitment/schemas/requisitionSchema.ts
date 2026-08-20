import { z } from "zod";

export const requisitionSchema = z.object({
    title: z.string().min(1, "Tiêu đề không được để trống"),
    departmentId: z.number({ error: "Vui lòng chọn phòng ban" }),
    jobTitleId: z.number({ error: "Vui lòng chọn chức vụ" }),
    jobLevelId: z.number().optional().nullable(),
    quantity: z
        .number({ error: "Vui lòng nhập số lượng" })
        .positive("Số lượng phải lớn hơn 0"),
    budget: z.number().optional().nullable(),
    expectedSalaryMin: z.number().optional().nullable(),
    expectedSalaryMax: z.number().optional().nullable(),
    expectedStartDate: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    requirements: z.string().optional().nullable(),
    benefits: z.string().optional().nullable(),
    skillIds: z.array(z.number()).optional(),
    approverId: z.number({ error: "Vui lòng chọn người duyệt" }),
});

export type RequisitionFormValues = z.infer<typeof requisitionSchema>;