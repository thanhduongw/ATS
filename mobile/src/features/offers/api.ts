import { Directory, File, Paths } from "expo-file-system";
import { API_BASE_URL } from "@/config";
import { apiClient, freshAccessToken } from "@/api/client";
import type { CandidateOffer, OfferDeclineRequest } from "@/types/api";

export const offersApi = {
  myList: () => apiClient.get<CandidateOffer[]>("/offer/offers/my").then((r) => r.data),

  myDetail: (id: number) =>
    apiClient.get<CandidateOffer>(`/offer/offers/my/${id}`).then((r) => r.data),

  accept: (id: number) => apiClient.patch(`/offer/offers/${id}/accept`).then((r) => r.data),

  decline: (id: number, body: OfferDeclineRequest) =>
    apiClient.patch(`/offer/offers/${id}/decline`, body).then((r) => r.data),

  /**
   * PDF thư mời trả `byte[]` và cần Authorization → KHÔNG mở bằng Linking được. Tải bằng
   * expo-file-system kèm header vào thư mục cache, trả về uri để mở bằng app hệ thống.
   */
  downloadPdf: async (id: number): Promise<string> => {
    const token = await freshAccessToken();
    const target = new File(new Directory(Paths.cache), `thu-moi-${id}.pdf`);
    if (target.exists) target.delete();
    const file = await File.downloadFileAsync(`${API_BASE_URL}/offer/offers/${id}/pdf`, target, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return file.uri;
  },
};
