import axiosClient from "../../services/axiosClient";
import type {
  PostingSimilarityResponse, TalentSearchRequest, TalentSearchResponse, TalentSuggestResponse,
} from "./types";

/**
 * Tìm ứng viên đã đồng ý lưu hồ sơ bằng ngôn ngữ tự nhiên. Chỉ Admin / Recruiter.
 * Chậm hơn tìm thường (AI tách câu hỏi + embedding, thường 3–10 giây) nên timeout dài.
 */
export const searchTalentPool = (body: TalentSearchRequest) =>
  axiosClient.post<TalentSearchResponse>("/v1/ai/talent/search", body, { timeout: 60_000 });

/** Gợi ý ứng viên trong kho cho một tin tuyển dụng (lần đầu có thể chậm vì embed JD). */
export const suggestForPosting = (jobPostingId: number, limit = 10) =>
  axiosClient.get<TalentSuggestResponse>("/v1/ai/talent/suggest", { params: { jobPostingId, limit }, timeout: 60_000 });

/** Độ tương đồng CV ↔ JD của các hồ sơ trong một tin. */
export const getPostingSimilarity = (jobPostingId: number) =>
  axiosClient.get<PostingSimilarityResponse>(`/v1/ai/postings/${jobPostingId}/similarity`, { timeout: 60_000 });
