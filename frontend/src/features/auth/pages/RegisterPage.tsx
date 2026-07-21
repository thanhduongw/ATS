import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { registerSchema, type RegisterFormValues } from "../schemas/registerSchema";
import { registerCompany } from "../authApi";
import type { ApiMessageResponse } from "../types";

const { Title } = Typography;

export default function RegisterPage() {
    const navigate = useNavigate();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            tenantCode: "",
            companyName: "",
            adminEmail: "",
            adminPassword: "",
            adminFullName: "",
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            await registerCompany(data);
            message.success("Đăng ký thành công, vui lòng kiểm tra email để lấy mã OTP");
            navigate("/verify-email", {
                state: { tenantCode: data.tenantCode, email: data.adminEmail },
            });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Đăng ký thất bại");
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
            <Card style={{ width: 420 }}>
                <Title level={3} style={{ textAlign: "center" }}>
                    Đăng ký công ty
                </Title>
                <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                    <Form.Item
                        label="Mã công ty (Tenant Code)"
                        validateStatus={errors.tenantCode ? "error" : ""}
                        help={errors.tenantCode?.message}
                    >
                        <Controller
                            name="tenantCode"
                            control={control}
                            render={({ field }) => <Input {...field} placeholder="vd: iuhtech" />}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Tên công ty"
                        validateStatus={errors.companyName ? "error" : ""}
                        help={errors.companyName?.message}
                    >
                        <Controller
                            name="companyName"
                            control={control}
                            render={({ field }) => <Input {...field} />}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Email quản trị"
                        validateStatus={errors.adminEmail ? "error" : ""}
                        help={errors.adminEmail?.message}
                    >
                        <Controller
                            name="adminEmail"
                            control={control}
                            render={({ field }) => <Input {...field} />}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu"
                        validateStatus={errors.adminPassword ? "error" : ""}
                        help={errors.adminPassword?.message}
                    >
                        <Controller
                            name="adminPassword"
                            control={control}
                            render={({ field }) => <Input.Password {...field} />}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Họ tên"
                        validateStatus={errors.adminFullName ? "error" : ""}
                        help={errors.adminFullName?.message}
                    >
                        <Controller
                            name="adminFullName"
                            control={control}
                            render={({ field }) => <Input {...field} />}
                        />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block loading={isSubmitting}>
                        Đăng ký
                    </Button>
                </Form>

                <div style={{ textAlign: "center", marginTop: 12 }}>
                    Đã có tài khoản? <a onClick={() => navigate("/login")}>Đăng nhập</a>
                </div>
            </Card>
        </div>
    );
}