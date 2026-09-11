/**
 * AI-service API client — routes through API Gateway.
 *
 * Gateway route (api-gateway/application.yml):
 *   Path=/api/v1/ai/** → http://localhost:8088
 *
 * axiosClient baseURL = "/api", so we use "/v1/ai/..." paths.
 */

import axiosClient from "../../services/axiosClient";
import type { CVExtractionResponse } from "./types";

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
