import { z } from "zod";

export const offerRejectSchema = z.object({
  reason: z.string().min(1, "Vui lòng nhập lý do từ chối phê duyệt"),
});

export type OfferRejectFormValues = z.infer<typeof offerRejectSchema>;
