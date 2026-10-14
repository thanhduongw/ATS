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
 * Extract CV from a file already stored in AWS S3 (production path).
 *
 * Sends the resumeUrl as-is; ai-service resolves it to an object key and only
 * accepts the configured bucket — no file re-upload needed.
 */
export const extractCvFromUrl = (resumeUrl: string) =>
  axiosClient.post<CVExtractionResponse>(
    "/v1/ai/extract-cv",
    { storage_key: resumeUrl },
    { timeout: 120_000 },
  );

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

