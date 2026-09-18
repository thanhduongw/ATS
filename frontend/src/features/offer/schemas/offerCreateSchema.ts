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

  /** Người quản lý trực tiếp của vị trí — in trên thư mời. */
  reportingManager: z.string().optional().nullable(),

  workLocationId: z.number().optional().nullable(),

  currency: z.string().optional().nullable(),

  /** Mức lương ở trên tính theo tháng hay theo năm. */
  payFrequency: z.string().optional().nullable(),

  /** Để dạng chữ vì thực tế hay thỏa thuận theo phần trăm, ví dụ "10–15% lương năm". */
  performanceBonus: z.string().optional().nullable(),

  annualLeaveDays: z.number().min(0, "Số ngày phép phải >= 0").optional().nullable(),

  benefits: z.string().optional().nullable(),

  allowance: z
    .number()
    .min(0, "Phụ cấp phải >= 0")
    .optional()
    .nullable(),

  /** Ghi chú nội bộ — ứng viên không bao giờ đọc được. */
  note: z.string().optional().nullable(),

  /** Ghi chú in trên thư mời gửi ứng viên. */
  candidateVisibleNote: z.string().optional().nullable(),

  approverId: z.number({
    error: "Vui lòng chọn người duyệt",
  }),

  responseDeadline: z.string().optional().nullable(),
});

export type OfferCreateFormValues = z.infer<typeof offerCreateSchema>;