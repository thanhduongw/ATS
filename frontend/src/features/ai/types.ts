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
  name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
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
}

// ============================================================
// Phase 3: JD Generation & Benchmark
// ============================================================

export type BenchmarkCategory =
  | "TECHNICAL"
  | "SOFT_SKILL"
  | "EDUCATION"
  | "EXPERIENCE"
  | "CERTIFICATION"
  | "LANGUAGE"
  | "OTHER";

export interface GeneratedJD {
  overview: string;
  responsibilities: string[];
  requirements: string;
  benefits: string;
}

export interface BenchmarkCriterion {
  name: string;
  weight: number;
  standardRequirement: string;
  category: BenchmarkCategory;
  isMustHave: boolean;
}

export interface JDGenerateRequest {
  title: string;
  level?: string | null;
  skills?: string[] | null;
  experience?: string | null;
  notes?: string | null;
}

export interface BenchmarkGenerateRequest {
  jobDescription: string;
}

export interface JDProvenance {
  model_used: string;
  prompt_version: string;
  fallback_used: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  processing_time_ms: number;
}

export interface JDGenerateResponse {
  status: string;
  jd: GeneratedJD | null;
  benchmarkCriteria: BenchmarkCriterion[] | null;
  provenance: JDProvenance;
  errorMessage?: string | null;
}

export interface BenchmarkGenerateResponse {
  status: string;
  criteria: BenchmarkCriterion[] | null;
  provenance: JDProvenance;
  errorMessage?: string | null;
}
