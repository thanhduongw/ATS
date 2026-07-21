import { z } from "zod";

export const verifySchema = z.object({
    tenantCode: z.string().min(1, "Mã công ty không được để trống"),
    email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
    otpCode: z.string().length(6, "OTP phải gồm 6 chữ số"),
});

export type VerifyFormValues = z.infer<typeof verifySchema>;