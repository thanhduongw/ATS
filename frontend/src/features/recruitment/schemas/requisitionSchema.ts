import { z } from "zod";

export const requisitionSchema = z.object({
    title: z.string().min(1, "Vui lòng nhập vị trí cần tuyển"),
    departmentId: z.number({ error: "Vui lòng chọn phòng ban" }),
    jobTitleId: z.number({ error: "Vui lòng chọn chức vụ" }),
    jobLevelId: z.number({ error: "Vui lòng chọn cấp bậc" }),
    quantity: z
        .number({ error: "Vui lòng nhập số lượng" })
        .positive("Số lượng phải lớn hơn 0"),
    employmentTypeId: z.number({ error: "Vui lòng chọn loại hình làm việc" }),
    workLocationId: z.number({ error: "Vui lòng chọn địa điểm làm việc" }),
    workArrangement: z.enum(["ONSITE", "HYBRID", "REMOTE"], { error: "Vui lòng chọn hình thức làm việc" }),
    experienceRequired: z.string().optional().nullable(),
    reason: z.enum(["NEW", "REPLACEMENT", "EXPANSION", "NEW_PROJECT", "OTHER"], {
        error: "Vui lòng chọn lý do tuyển dụng",
    }),
    priority: z.enum(["NORMAL", "HIGH", "URGENT"]).optional().nullable(),
    note: z.string().optional().nullable(),
    budget: z.number().optional().nullable(),
    expectedSalaryMin: z.number().optional().nullable(),
    expectedSalaryMax: z.number().optional().nullable(),
    expectedStartDate: z.string({ error: "Vui lòng chọn ngày dự kiến bắt đầu" }).min(1, "Vui lòng chọn ngày dự kiến bắt đầu"),
    description: z.string().min(1, "Vui lòng nhập mô tả công việc"),
    requirements: z.string().min(1, "Vui lòng nhập yêu cầu ứng viên"),
    benefits: z.string().optional().nullable(),
    skillIds: z.array(z.number()).optional(),
    approverId: z.number({ error: "Vui lòng chọn người duyệt" }),
});

export type RequisitionFormValues = z.infer<typeof requisitionSchema>;
