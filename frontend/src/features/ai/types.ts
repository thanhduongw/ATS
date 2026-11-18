/**
 * Kiểu dữ liệu của module AI chấm CV (ai-service, theo nghiên cứu SSRC 2026).
 * `result` giữ nguyên tên trường snake_case của Python.
 * @see ai-service/app/schemas/ssrc.py
 */

// ============================================================
// Dữ kiện CV (GET /cv-extractions) — khối "Phân tích CV" ở trang chi tiết hồ sơ
// ============================================================

export type CvFactCategory = "WORK_EXPERIENCE" | "SKILLS" | "EDUCATION" | "CERTIFICATIONS" | "PROJECT" | "LANGUAGE";

export interface CvFact {
  category: CvFactCategory;
  /** Câu trích NGUYÊN VĂN từ CV (đã che thông tin cá nhân) */
  quote: string;
  /** Giải thích ngắn bằng tiếng Việt */
  note: string;
}

export interface CVFacts {
  facts: CvFact[];
  limitations: string[];
}

export interface CvFactsProvenance {
  model?: string;
  prompt_version?: string;
  prompt_hash?: string;
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_usd?: number;
  latency_ms?: number;
  retries?: number;
  validation_retries?: number;
}

export interface CVFactsResponse {
  status: "success" | "error";
  result: CVFacts | null;
  provenance: CvFactsProvenance | null;
  error_code: string | null;
  error_message: string | null;
  extraction_id?: number;
  updated_at?: string | null;
}

// ============================================================
// Chấm điểm hồ sơ (ai-service /scores)
// ============================================================

// 3 xếp loại gợi ý: Phù hợp (>= 70) / Chưa phân loại (60 – < 70) / Không phù hợp (< 60).
export type AiTier = "FIT" | "NOT_FIT" | "UNCLASSIFIED";
export type AiScoreStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type CriterionKey = "work_experience" | "skills" | "education" | "certifications";
export type CertPolicy = "REQUIRED" | "PREFERRED" | "NOT_SPECIFIED";

/** Một trong 4 tiêu chí: điểm 1–5 do AI chấm kèm lý do và hai nhóm câu trích. */
export interface ScoreCriterion {
  key: CriterionKey;
  label: string;
  /** 1–5; null khi không áp dụng (Chứng chỉ khi JD không nêu) */
  score: number | null;
  applicable: boolean;
  reason: string;
  cv_evidence: string[];
  jd_evidence: string[];
}

/** Kết quả chấm (ai_scores.result). */
export interface ScoreResult {
  /** 0–100 = trung bình các tiêu chí có điểm × 20 */
  total_score: number;
  tier: AiTier;
  tier_label: string;
  /** Luật xếp loại đã áp dụng, bằng tiếng Việt */
  tier_reason: string;
  cert_policy: CertPolicy;
  criteria: ScoreCriterion[];
  /** CV có đoạn văn nhằm điều khiển AI (prompt injection) */
  injection_detected: boolean;
  injection_patterns: string[];
  scored_on: string;
}

export interface ApplicationScoreResponse {
  applicationId: number;
  jobPostingId: number;
  status: AiScoreStatus;
  totalScore: number | null;
  tier: AiTier | null;
  /** null khi FAILED, hoặc khi ứng viên đã xoá dữ liệu cá nhân (COMPLETED vẫn giữ điểm và xếp loại) */
  result: ScoreResult | null;
  errorMessage: string | null;
  scoredAt: string | null;
  updatedAt: string | null;
}

export interface RescorePostingResponse {
  jobPostingId: number;
  total: number;
  queued: number;
  skipped: number;
}
