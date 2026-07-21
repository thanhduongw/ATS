import { z } from "zod";

export const loginSchema = z.object({
    tenantCode: z.string().min(1, "Vui lòng nhập mã công ty"),
    email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
    password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;