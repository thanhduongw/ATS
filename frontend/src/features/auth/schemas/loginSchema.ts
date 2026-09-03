import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
    password: z.string().min(1, "Vui lòng nhập mật khẩu").max(72, "Mật khẩu tối đa 72 ký tự"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
