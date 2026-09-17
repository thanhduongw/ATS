import axiosClient from "../../services/axiosClient";
import type {
  CVExtractionResponse,
  JDGenerateRequest,
  JDGenerateResponse,
  BenchmarkGenerateRequest,
  BenchmarkGenerateResponse,
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
 * Extract CV from a file already stored in MinIO (production path).
 *
 * Parses the resumeUrl to derive the MinIO storage_key, then calls
 * POST /v1/ai/extract-cv which downloads directly from MinIO — no
 * file re-upload needed.
 *
 * resumeUrl format: http://host:port/ats-bucket/resumes/uuid-file.pdf
 * storage_key:      resumes/uuid-file.pdf
 */
export const extractCvFromUrl = (resumeUrl: string) => {
  // Extract storage_key: everything after "/ats-bucket/"
  const match = resumeUrl.match(/\/ats-bucket\/(.+)$/);
  const storageKey = match ? match[1] : resumeUrl;
  return axiosClient.post<CVExtractionResponse>(
    "/v1/ai/extract-cv",
    { storage_key: storageKey },
    { timeout: 120_000 },
  );
};

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

