import axiosClient from "../../services/axiosClient";
import type {
  CVExtractionResponse,
  JDGenerateRequest,
  JDGenerateResponse,
  BenchmarkGenerateRequest,
  BenchmarkGenerateResponse,
  ApplicationScoreResponse,
  RescorePostingResponse,
} from "./types";

/**
 * Upload a CV file and extract structured data via AI.
 *
 * Supported file types: PDF, DOCX, PNG, JPEG
 * Timeout: 120s (LLM processing can be slow)
 */
export const extractCvFromUpload = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return axiosClient.post<CVExtractionResponse>(
    "/v1/ai/extract-cv/upload",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    },
  );
};

/**
 * Kết quả trích xuất CV của một hồ sơ ứng tuyển (lưu ở ai-service, dùng chung cho mọi người xem).
 * Chưa có thì ai-service trích xuất ngay (10–60 giây) — timeout dài.
 */
export const getCvExtraction = (applicationId: number) =>
  axiosClient.get<CVExtractionResponse>("/v1/ai/cv-extractions", {
    params: { applicationId },
    timeout: 120_000,
  });

/** Trích xuất lại CV, bỏ qua kết quả đã lưu (chỉ Admin / Recruiter). */
export const reExtractCv = (applicationId: number) =>
  axiosClient.post<CVExtractionResponse>("/v1/ai/cv-extractions/re-extract", null, {
    params: { applicationId },
    timeout: 120_000,
  });

/**
 * Generate JD + benchmark criteria from basic input.
 * Target response time: < 10s
 */
export const generateJD = (input: JDGenerateRequest) =>
  axiosClient.post<JDGenerateResponse>("/v1/ai/jd/generate", input, {
    timeout: 30_000,
  });

/**
 * Generate benchmark criteria from existing JD text.
 */
export const generateBenchmark = (input: BenchmarkGenerateRequest) =>
  axiosClient.post<BenchmarkGenerateResponse>("/v1/ai/benchmark/generate", input, {
    timeout: 30_000,
  });

/** Điểm AI + nhận xét của một hồ sơ. 404 = hồ sơ chưa được chấm. */
// [GIẢI THÍCH] 3 API chấm điểm của ai-service (đi qua API Gateway, tự gắn token đăng nhập):
// lấy điểm một hồ sơ / chấm lại một hồ sơ (chờ tối đa 2 phút) / chấm nền mọi hồ sơ chưa có điểm của một tin.
export const getApplicationScore = (applicationId: number) =>
  axiosClient.get<ApplicationScoreResponse>(`/v1/ai/scores/${applicationId}`);

/** Chấm lại ngay (chờ kết quả, ~10–40 giây). Chỉ Admin / Recruiter; 409 nếu đang được chấm. */
export const rescoreApplication = (applicationId: number) =>
  axiosClient.post<ApplicationScoreResponse>(`/v1/ai/scores/${applicationId}/rescore`, null, {
    timeout: 120_000,
  });

/** Chấm nền mọi hồ sơ chưa có điểm / chấm lỗi của một tin. Chỉ Admin / Recruiter. */
export const rescorePosting = (jobPostingId: number) =>
  axiosClient.post<RescorePostingResponse>("/v1/ai/scores/rescore-posting", null, {
    params: { jobPostingId },
  });
