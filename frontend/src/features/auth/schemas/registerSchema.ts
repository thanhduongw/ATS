import { z } from "zod";

export const registerSchema = z.object({
    fullName: z.string().min(1, "Họ tên không được để trống"),
    email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
    phone: z.string().optional(),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu").max(72),
}).refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
