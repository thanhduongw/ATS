import { z } from "zod";

export const rejectSchema = z.object({
    reason: z.string().min(1, "Vui lòng nhập lý do từ chối"),
});

export type RejectFormValues = z.infer<typeof rejectSchema>;