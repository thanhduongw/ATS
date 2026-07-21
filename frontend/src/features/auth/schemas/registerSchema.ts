import { z } from "zod";

export const registerSchema = z.object({
    tenantCode: z.string().min(1, "Mã công ty không được để trống"),
    companyName: z.string().min(1, "Tên công ty không được để trống"),
    adminEmail: z
        .string()
        .min(1, "Email không được để trống")
        .email("Email không hợp lệ"),
    adminPassword: z.string().min(8, "Mật khẩu phải từ 8 ký tự"),
    adminFullName: z.string().min(1, "Họ tên không được để trống"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;