import { useEffect, useState } from "react";
import {
    App, Button, Card, Col, DatePicker, Form, Input, Row, Select,
    Space, Spin, Typography, Upload,
} from "antd";
import { FilePdfOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import type { UploadProps } from "antd";
import {
    getMyCandidateProfile,
    updateMyCandidateProfile,
    uploadMyCandidateResume,
} from "../candidateApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type {
    ApiMessageResponse, CandidateSelfResponse, CandidateSelfUpdateRequest,
} from "../types";
import { COLORS, RADIUS } from "../../../app/theme";

const { Text, Title } = Typography;
type ProfileForm = Omit<CandidateSelfUpdateRequest, "dateOfBirth"> & {
    dateOfBirth?: ReturnType<typeof dayjs> | null;
};

export default function CandidateProfilePage() {
    const { message } = App.useApp();
    const [form] = Form.useForm<ProfileForm>();
    const [profile, setProfile] = useState<CandidateSelfResponse | null>(null);
    const [educationLevels, setEducationLevels] = useState<CatalogItem[]>([]);
    const [skills, setSkills] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const applyProfile = (value: CandidateSelfResponse) => {
        setProfile(value);
        form.setFieldsValue({
            fullName: value.fullName,
            phone: value.phone,
            dateOfBirth: value.dateOfBirth ? dayjs(value.dateOfBirth) : null,
            gender: value.gender,
            address: value.address,
            currentPosition: value.currentPosition,
            educationLevelId: value.educationLevelId,
            skillIds: value.skillIds,
        });
    };

    useEffect(() => {
        Promise.all([
            getMyCandidateProfile(),
            getCatalogItems("/masterdata/education-levels"),
            getCatalogItems("/masterdata/skills"),
        ])
            .then(([profileResponse, educationResponse, skillResponse]) => {
                applyProfile(profileResponse.data);
                setEducationLevels(educationResponse.data);
                setSkills(skillResponse.data);
            })
            .catch((error: AxiosError<ApiMessageResponse>) => {
                message.error(error.response?.data?.message ?? "Không tải được hồ sơ ứng viên");
            })
            .finally(() => setLoading(false));
    }, [form, message]);

    const saveProfile = async (values: ProfileForm) => {
        setSaving(true);
        try {
            const response = await updateMyCandidateProfile({
                ...values,
                dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD") ?? null,
            });
            applyProfile(response.data);
            message.success("Đã cập nhật hồ sơ");
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không thể cập nhật hồ sơ");
        } finally {
            setSaving(false);
        }
    };

    const uploadProps: UploadProps = {
        accept: ".pdf,.doc,.docx",
        maxCount: 1,
        showUploadList: false,
        beforeUpload: async (file) => {
            setUploading(true);
            try {
                const response = await uploadMyCandidateResume(file);
                applyProfile(response.data);
                message.success("Đã tải CV lên");
            } catch (error) {
                const apiError = error as AxiosError<ApiMessageResponse>;
                message.error(apiError.response?.data?.message ?? "Không thể tải CV lên");
            } finally {
                setUploading(false);
            }
            return Upload.LIST_IGNORE;
        },
    };

    if (loading) {
        return <div style={{ padding: 96, textAlign: "center" }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ maxWidth: 920, margin: "0 auto", padding: 24 }}>
            <Title level={2} style={{ marginTop: 0 }}>Hồ sơ của tôi</Title>
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: RADIUS.lg }}>
                        <Form form={form} layout="vertical" onFinish={saveProfile}>
                            <Row gutter={12}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item label="Email"><Input value={profile?.email} disabled /></Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="dateOfBirth" label="Ngày sinh">
                                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="gender" label="Giới tính">
                                        <Select allowClear options={[
                                            { value: "MALE", label: "Nam" },
                                            { value: "FEMALE", label: "Nữ" },
                                            { value: "OTHER", label: "Khác" },
                                        ]} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="currentPosition" label="Vị trí hiện tại"><Input /></Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="educationLevelId" label="Trình độ học vấn">
                                        <Select allowClear options={educationLevels.map((item) => ({
                                            value: item.id, label: item.name,
                                        }))} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="skillIds" label="Kỹ năng">
                                        <Select mode="multiple" allowClear options={skills.map((item) => ({
                                            value: item.id, label: item.name,
                                        }))} />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
                                </Col>
                            </Row>
                            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                                Lưu hồ sơ
                            </Button>
                        </Form>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: RADIUS.lg }}>
                        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                            <FilePdfOutlined style={{ fontSize: 32, color: COLORS.primary }} />
                            <div>
                                <Text strong>CV ứng tuyển</Text><br />
                                <Text type={profile?.resumeUploaded ? "success" : "secondary"}>
                                    {profile?.resumeUploaded ? "Đã tải lên" : "Chưa có CV"}
                                </Text>
                            </div>
                            <Upload {...uploadProps}>
                                <Button icon={<UploadOutlined />} loading={uploading}>
                                    {profile?.resumeUploaded ? "Thay CV" : "Tải CV"}
                                </Button>
                            </Upload>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
