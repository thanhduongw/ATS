import { z } from "zod";

/** C05 · Đăng ký ứng viên: họ tên, email, mật khẩu (1 ô, có thanh độ mạnh) và ô đồng ý chính sách dữ liệu. */
export const registerSchema = z.object({
    fullName: z.string().trim().min(1, "Họ tên không được để trống").max(150),
    email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").max(72, "Mật khẩu tối đa 72 ký tự"),
    consent: z.boolean().refine((v) => v, "Bạn cần đồng ý với chính sách bảo mật dữ liệu"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
