import axiosClient from "./axiosClient";

/** Thư mục ảnh công khai trên S3 (auth-service ImageStorageService): careers · logo chỉ Quản trị; avatars mọi người dùng. */
export type ImageFolder = "careers" | "logo" | "avatars";

/** Tải một ảnh (JPG/PNG/WEBP/SVG, tối đa 5MB) lên S3 → trả đường dẫn công khai. */
export const uploadImage = (file: File, folder: ImageFolder = "careers") => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    return axiosClient.post<{ url: string }>("/auth/files/images", form, { headers: { "Content-Type": "multipart/form-data" } });
};
