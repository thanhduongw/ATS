import { useCallback, useEffect, useState } from "react";
import { App, Button, DatePicker, Form, Input, Select, Spin, Upload } from "antd";
import { FilePdfOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import type { UploadProps } from "antd";
import { getMyCandidateProfile, updateMyCandidateProfile, uploadMyCandidateResume } from "../candidateApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, CandidateSelfResponse, CandidateSelfUpdateRequest } from "../types";
import { COLORS } from "../../../app/theme";
import { InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";

/**
 * C17 · Hồ sơ của tôi: thông tin cá nhân · kỹ năng · CV (chỉ 1 CV — "Tải CV mới" thay CV cũ, quyết định G7).
 * Khác HTML: chưa có ảnh đại diện (tài khoản chưa có trường ảnh) và chưa hiện tên file / ngày tải CV
 * (API chỉ trả "đã có CV hay chưa").
 */
type ProfileForm = Omit<CandidateSelfUpdateRequest, "dateOfBirth"> & {
    dateOfBirth?: ReturnType<typeof dayjs> | null;
};
const MAX_CV_MB = 5;

export default function CandidateProfilePage() {
    const { message } = App.useApp();
    const [form] = Form.useForm<ProfileForm>();
    const [profile, setProfile] = useState<CandidateSelfResponse | null>(null);
    const [educationLevels, setEducationLevels] = useState<CatalogItem[]>([]);
    const [skills, setSkills] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const applyProfile = useCallback((value: CandidateSelfResponse) => {
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
    }, [form]);

    useEffect(() => {
        Promise.all([
            getMyCandidateProfile(),
            getCatalogItems("/masterdata/education-levels").catch(() => null),
            getCatalogItems("/masterdata/skills").catch(() => null),
        ])
            .then(([p, edu, sk]) => {
                applyProfile(p.data);
                setEducationLevels(edu?.data.filter((x) => x.active) ?? []);
                setSkills(sk?.data.filter((x) => x.active) ?? []);
            })
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, [applyProfile]);

    const saveProfile = async (values: ProfileForm) => {
        setSaving(true);
        try {
            const response = await updateMyCandidateProfile({
                ...values,
                dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD") ?? null,
            });
            applyProfile(response.data);
            message.success("Đã lưu thay đổi");
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không lưu được hồ sơ");
        } finally {
            setSaving(false);
        }
    };

    const uploadProps: UploadProps = {
        accept: ".pdf,.doc,.docx",
        maxCount: 1,
        showUploadList: false,
        beforeUpload: async (file) => {
            if (file.size > MAX_CV_MB * 1024 * 1024) {
                message.error(`CV tối đa ${MAX_CV_MB} MB`);
                return Upload.LIST_IGNORE;
            }
            setUploading(true);
            try {
                const response = await uploadMyCandidateResume(file);
                applyProfile(response.data);
                message.success("Đã tải CV mới");
            } catch (error) {
                const apiError = error as AxiosError<ApiMessageResponse>;
                message.error(apiError.response?.data?.message ?? "Không tải được CV");
            } finally {
                setUploading(false);
            }
            return Upload.LIST_IGNORE;
        },
    };

    if (loading) return <div style={{ padding: 96, textAlign: "center" }}><Spin /></div>;
    if (failed) {
        return <InlineNotice tone="danger" action={<Button onClick={() => window.location.reload()}>Thử lại</Button>}>
            Không tải được hồ sơ. Kiểm tra kết nối mạng rồi thử lại.
        </InlineNotice>;
    }

    const grid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 16 } as const;

    return (
        <Form form={form} layout="vertical" onFinish={saveProfile} requiredMark={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
                <ScreenTitle
                    title="Hồ sơ của tôi"
                    actions={<Button type="primary" htmlType="submit" loading={saving}>Lưu thay đổi</Button>}
                />

                <Panel title="Thông tin cá nhân">
                    <div style={grid}>
                        <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, whitespace: true, message: "Nhập họ và tên" }]}>
                            <Input maxLength={150} />
                        </Form.Item>
                        <Form.Item label="Email"><Input value={profile?.email} disabled /></Form.Item>
                        <Form.Item name="phone" label="Số điện thoại"
                            rules={[{ pattern: /^[0-9+ .()-]{8,20}$/, message: "Số điện thoại không hợp lệ" }]}>
                            <Input maxLength={20} />
                        </Form.Item>
                        <Form.Item name="dateOfBirth" label="Ngày sinh">
                            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày"
                                disabledDate={(d) => d.isAfter(dayjs())} />
                        </Form.Item>
                        <Form.Item name="gender" label="Giới tính">
                            <Select allowClear placeholder="Chọn" options={[
                                { value: "MALE", label: "Nam" },
                                { value: "FEMALE", label: "Nữ" },
                                { value: "OTHER", label: "Khác" },
                            ]} />
                        </Form.Item>
                        <Form.Item name="educationLevelId" label="Trình độ học vấn">
                            <Select allowClear placeholder="Chọn" options={educationLevels.map((i) => ({ value: i.id, label: String(i.name) }))} />
                        </Form.Item>
                        <Form.Item name="currentPosition" label="Vị trí hiện tại">
                            <Input placeholder="Ví dụ: Lập trình viên Backend tại …" maxLength={200} />
                        </Form.Item>
                        <Form.Item name="address" label="Địa chỉ"><Input maxLength={300} /></Form.Item>
                    </div>
                </Panel>

                <Panel title="Kỹ năng">
                    <Form.Item name="skillIds" style={{ marginBottom: 0 }}>
                        <Select mode="multiple" allowClear placeholder="Thêm kỹ năng" optionFilterProp="label"
                            options={skills.map((i) => ({ value: i.id, label: String(i.name) }))} />
                    </Form.Item>
                </Panel>

                <Panel title="CV" subtitle="Mỗi hồ sơ giữ 1 CV. Tải CV mới sẽ thay CV cũ cho các lần ứng tuyển sau.">
                    <div style={{
                        display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 14,
                        boxShadow: `inset 0 0 0 1px ${COLORS.border}`,
                    }}>
                        <FilePdfOutlined style={{ fontSize: 28, color: profile?.resumeUploaded ? COLORS.error : COLORS.textMuted }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600 }}>{profile?.resumeUploaded ? "CV đã tải lên" : "Chưa có CV"}</span>
                            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>PDF, DOC, DOCX · tối đa {MAX_CV_MB} MB</span>
                        </div>
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />} loading={uploading}>
                                {profile?.resumeUploaded ? "Tải CV mới" : "Tải CV"}
                            </Button>
                        </Upload>
                    </div>
                </Panel>
            </div>
        </Form>
    );
}
