import { useState } from "react";
import { App, Button, Upload } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { uploadImage, type ImageFolder } from "../../services/imageApi";
import { COLORS } from "../../app/theme";

/**
 * Ô chọn ảnh dùng trong Form.Item (value = đường dẫn ảnh): xem trước, tải lên S3, xoá.
 * Dùng cho logo ở A08 (Thông tin doanh nghiệp).
 */
export default function ImageUploadField({ value, onChange, folder, previewSize = 64, accept = "image/png,image/svg+xml,image/jpeg,image/webp" }: {
    value?: string | null;
    onChange?: (url: string | null) => void;
    folder: ImageFolder;
    previewSize?: number;
    accept?: string;
}) {
    const { message } = App.useApp();
    const [busy, setBusy] = useState(false);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
                width: previewSize, height: previewSize, borderRadius: 14, background: COLORS.fill, flexShrink: 0, overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted,
            }}>
                {value ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <PictureOutlined style={{ fontSize: 22 }} />}
            </div>
            <Upload accept={accept} showUploadList={false} disabled={busy}
                customRequest={async ({ file }) => {
                    setBusy(true);
                    try {
                        const r = await uploadImage(file as File, folder);
                        onChange?.(r.data.url);
                    } catch (e) {
                        message.error((e as AxiosError<{ message?: string }>).response?.data?.message ?? "Không tải được ảnh");
                    } finally { setBusy(false); }
                }}>
                <Button size="small" loading={busy} icon={<PictureOutlined />}>{value ? "Đổi ảnh" : "Tải ảnh lên"}</Button>
            </Upload>
            {value && <Button size="small" type="text" danger disabled={busy} onClick={() => onChange?.(null)}>Xoá</Button>}
        </div>
    );
}
