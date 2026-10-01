import { apiClient } from "@/api/client";
import type { CandidateSelf, CandidateSelfUpdateRequest } from "@/types/api";

/** File chọn từ expo-document-picker. Trên web picker trả kèm `File` thật trong `webFile`. */
export type PickedFile = { uri: string; name: string; mimeType?: string; webFile?: Blob };

export const profileApi = {
  me: () => apiClient.get<CandidateSelf>("/candidate/me").then((r) => r.data),

  /**
   * PATCH nhưng backend GHI ĐÈ TOÀN BỘ hồ sơ, kể cả `skillIds` (xóa hết rồi gắn lại) — xem
   * `CandidateService.updateMyProfile`. Luôn gửi đủ các trường hiện có, đừng gửi một phần.
   */
  update: (body: CandidateSelfUpdateRequest) =>
    apiClient.patch<CandidateSelf>("/candidate/me", body).then((r) => r.data),

  /**
   * Ứng viên tự xóa hồ sơ. Backend XÓA MỀM NGAY (`deletedAt = now`) — sau đó `/candidate/me`
   * không còn trả hồ sơ. Giao diện bắt xác nhận trước và đăng xuất sau khi xóa.
   */
  requestDeletion: () => apiClient.post("/candidate/me/request-deletion").then((r) => r.data),

  /** multipart, part tên `file`. Backend nhận PDF/DOC/DOCX, tối đa 10 MB. */
  uploadResume: (file: PickedFile) => {
    const form = new FormData();
    if (file.webFile) {
      form.append("file", file.webFile, file.name);
    } else {
      // React Native gửi file trong FormData bằng object { uri, name, type }.
      form.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
    }
    return apiClient
      .post<CandidateSelf>("/candidate/me/resume", form, {
        headers: { "Content-Type": "multipart/form-data" },
        // Tải lên qua mạng di động có thể lâu hơn 15 giây mặc định.
        timeout: 60_000,
      })
      .then((r) => r.data);
  },
};
