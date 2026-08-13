import { z } from "zod";

export const offerCreateSchema = z.object({
  applicationId: z.number({
    error: "Vui lòng chọn hồ sơ ứng tuyển",
  }),

  salaryOffered: z.number().positive("Mức lương phải lớn hơn 0"),

  contractTypeId: z.number({
    error: "Vui lòng chọn loại hợp đồng",
  }),

  startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),

  probationMonths: z.number().min(0, "Số tháng thử việc phải >= 0"),

  benefits: z.string().optional().nullable(),

  allowance: z
    .number()
    .min(0, "Phụ cấp phải >= 0")
    .optional()
    .nullable(),

  note: z.string().optional().nullable(),

  approverId: z.number({
    error: "Vui lòng chọn người duyệt",
  }),

  responseDeadline: z.string().optional().nullable(),
});

export type OfferCreateFormValues = z.infer<typeof offerCreateSchema>;