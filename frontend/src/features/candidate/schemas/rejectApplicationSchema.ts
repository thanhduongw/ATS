import { z } from "zod";

export const rejectApplicationSchema = z.object({
  rejectionReasonId: z.number({ error: "Vui lòng chọn lý do từ chối" }),
  note: z.string().optional().nullable(),
});

export type RejectApplicationFormValues = z.infer<typeof rejectApplicationSchema>;
