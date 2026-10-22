/**
 * TypeScript types — 1:1 mapping with Pydantic schemas
 * @see ai-service/app/schemas/cv_extraction.py
 */

// ============================================================
// Enums
// ============================================================

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type CompletenessLevel = "COMPLETE" | "PARTIAL" | "MINIMAL";
export type LanguageProficiency = "NATIVE" | "FLUENT" | "INTERMEDIATE" | "BASIC";

// ============================================================
// CV Sub-models
// ============================================================

export interface CandidateInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  summary: string | null;
}

export interface WorkExperience {
  company: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  technologies: string[];
  source_text: string | null;
}

export interface Education {
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: string | null;
  source_text: string | null;
}

export interface Certification {
  name: string | null;
  issuer: string | null;
  date_obtained: string | null;
  expiry_date: string | null;
  credential_id: string | null;
}

export interface Project {
  name: string | null;
  description: string | null;
  technologies: string[];
  url: string | null;
  role: string | null;
  source_text: string | null;
}

export interface LanguageSkill {
  language: string;
  proficiency: LanguageProficiency | null;
}

export interface FieldConfidence {
  field_name: string;
  confidence: ConfidenceLevel;
  evidence: string | string[] | null;
}

// ============================================================
// Main models
// ============================================================

export interface ExtractedCV {
  candidate: CandidateInfo;
  skills: string[];
  work_experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  languages: LanguageSkill[];
  years_of_experience_claimed: number | null;
  field_confidences: FieldConfidence[];
}

export interface CVExtractionResult {
  extracted_cv: ExtractedCV;
  years_of_experience_calculated: number | null;
  overall_confidence: ConfidenceLevel;
  completeness: CompletenessLevel;
  completeness_details: Record<string, boolean>;
}

export interface ExtractionProvenance {
  model_used: string;
  prompt_version: string;
  fallback_used: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  processing_time_ms: number;
  retries: number;
}

// ============================================================
// API Response
// ============================================================

export interface CVExtractionResponse {
  status: string;
  result: CVExtractionResult | null;
  provenance: ExtractionProvenance;
  error_code: string | null;
  error_message: string | null;
  /** Có khi lấy từ /cv-extractions (kết quả đã lưu). */
  extraction_id?: number;
  updated_at?: string | null;
}

// ============================================================
// Chấm điểm hồ sơ (ai-service /scores) — `result` giữ nguyên tên trường snake_case của Python
// ============================================================

// [GIẢI THÍCH] 3 xếp loại gợi ý (docs/DE_XUAT_CHAM_DIEM_CV.md, Bước 6): Phù hợp / Không phù hợp / Chưa phân loại.
export type AiTier = "FIT" | "NOT_FIT" | "UNCLASSIFIED";
export type AiScoreStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
/** Ai chấm tiêu chí / kiểm tra yêu cầu: quy tắc code, AI, hay code kết hợp AI. */
export type ScoredBy = "CODE" | "LLM" | "CODE_AND_LLM";
export type RequirementStatus = "MET" | "UNMET" | "UNKNOWN";
export type RequirementCategory = "SKILL" | "CERTIFICATION" | "DOMAIN" | "EXPERIENCE_YEARS" | "EDUCATION_LEVEL";

/** Một tiêu chí — khớp ScoredDimension trong ai-service/app/schemas/scoring.py. */
export interface ScoredDimension {
  dimension: string;
  label: string;
  /** false: tin tuyển dụng không nhắc tiêu chí này, không tính vào điểm */
  applicable: boolean;
  /** Mức 0–4; null nếu không áp dụng hoặc không xác định được */
  level: number | null;
  /** 0–100; null nếu không tính */
  score: number | null;
  /** Trọng số thực tế = 1 / số tiêu chí được tính (trọng số bằng nhau); 0 nếu không tính */
  weight: number;
  /** Có từ cách chấm v2; kết quả cũ không có */
  scored_by?: ScoredBy;
  evidence?: string[];
  reason: string;
}

/** Một yêu cầu bắt buộc của JD và trạng thái (Bước 4). */
export interface RequirementResult {
  requirement: string;
  category: RequirementCategory;
  status: RequirementStatus;
  status_label: string;
  checked_by: ScoredBy;
  evidence: string | null;
}

/** Kết quả chấm (ai_scores.result). Các trường v2 để tùy chọn: kết quả chấm theo cách cũ vẫn đọc được. */
export interface ScoreResult {
  /** null = không tính được điểm (Chưa phân loại) */
  total_score: number | null;
  tier: AiTier;
  tier_label: string;
  /** Lý do xếp loại (quy tắc nào của Bước 6 được áp dụng) */
  tier_reason?: string;
  dimensions: ScoredDimension[];
  requirements?: RequirementResult[];
  /** Ngưỡng T và độ rộng vùng không chắc chắn δ dùng khi xếp loại */
  threshold?: number;
  uncertainty?: number;
  /** Câu mở đầu do code ghép (gợi ý + lý do) + tóm tắt của AI */
  comment: string;
  summary: string;
  years_calculated: number | null;
  years_claimed: number | null;
  scored_on: string;
}

export interface ApplicationScoreResponse {
  applicationId: number;
  jobPostingId: number;
  status: AiScoreStatus;
  totalScore: number | null;
  tier: AiTier | null;
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
