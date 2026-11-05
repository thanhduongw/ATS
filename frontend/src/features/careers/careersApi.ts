import axiosClient from "../../services/axiosClient";
import { publicClient } from "../public/publicApi";

/** Trang tuyển dụng — auth-service `CareersPageController` (A09/A10) và bản công khai (C01). */
export interface CareersPageResponse {
    draftConfig: string | null;
    publishedConfig: string | null;
    draftUpdatedAt: string | null;
    publishedAt: string | null;
    hasUnpublishedChanges: boolean;
}

export const getCareersPage = () => axiosClient.get<CareersPageResponse>("/auth/careers-page");

export const saveCareersDraft = (config: string) =>
    axiosClient.put<CareersPageResponse>("/auth/careers-page/draft", { config });

export const publishCareersPage = () => axiosClient.post<CareersPageResponse>("/auth/careers-page/publish");

export const getPublicCareersPage = () => publicClient.get<CareersPageResponse>("/auth/public/careers-page");

/** Tải một ảnh công khai lên S3 → trả đường dẫn. `folder`: careers · logo · avatars. */
export const uploadImage = (file: File, folder: "careers" | "logo" | "avatars" = "careers") => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    return axiosClient.post<{ url: string }>("/auth/files/images", form, { headers: { "Content-Type": "multipart/form-data" } });
};
