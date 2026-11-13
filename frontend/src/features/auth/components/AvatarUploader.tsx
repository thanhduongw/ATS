import { useState } from "react";
import { App, Button, Upload } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { updateMyAvatar } from "../authApi";
import { setUserProfile } from "../authSlice";
import type { UserProfileResponse } from "../types";
import { uploadImage } from "../../../services/imageApi";
import { useAppDispatch } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { Avatar } from "../../../components/ui/designKit";

/**
 * C17 / R32 · Ảnh đại diện của chính mình: tải ảnh lên S3 (thư mục avatars) rồi gắn vào tài khoản;
 * "Gỡ ảnh" quay về chữ cái đầu. Cập nhật luôn ảnh ở thanh trên cùng (authSlice).
 */
export default function AvatarUploader({ profile, size = 56, onChange }: {
    profile: UserProfileResponse | null | undefined;
    size?: number;
    onChange?: (p: UserProfileResponse) => void;
}) {
    const { message } = App.useApp();
    const dispatch = useAppDispatch();
    const [busy, setBusy] = useState(false);

    const apply = async (url: string | null) => {
        const r = await updateMyAvatar(url);
        dispatch(setUserProfile(r.data));
        onChange?.(r.data);
    };
    const run = async (fn: () => Promise<void>, ok: string) => {
        setBusy(true);
        try { await fn(); message.success(ok); } catch (e) {
            message.error((e as AxiosError<{ message?: string }>).response?.data?.message ?? "Không cập nhật được ảnh đại diện");
        } finally { setBusy(false); }
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={profile?.fullName || profile?.email || "?"} colorKey={profile?.id ?? 0} size={size} src={profile?.avatarUrl} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 4 }}>
                    <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} disabled={busy}
                        customRequest={({ file }) => run(async () => {
                            const r = await uploadImage(file as File, "avatars");
                            await apply(r.data.url);
                        }, "Đã cập nhật ảnh đại diện")}>
                        <Button size="small" icon={<CameraOutlined />} loading={busy}>{profile?.avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}</Button>
                    </Upload>
                    {profile?.avatarUrl && (
                        <Button size="small" type="text" danger disabled={busy} onClick={() => run(() => apply(null), "Đã gỡ ảnh đại diện")}>Gỡ ảnh</Button>
                    )}
                </div>
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>JPG, PNG hoặc WEBP · tối đa 5MB</span>
            </div>
        </div>
    );
}
