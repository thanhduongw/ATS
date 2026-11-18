/** Kho ứng viên (Talent Pool) — tìm kiếm ngữ nghĩa ở ai-service. */

export type TalentPoolFilter = "ALL" | "IN_POOL";

export interface TalentSearchRequest {
  query: string;
  /** Có giá trị thì thắng bộ lọc AI tách từ câu hỏi; 0 = gỡ bộ lọc số năm. */
  minYears?: number | null;
  /** Có giá trị (kể cả mảng rỗng) thì thắng bộ lọc AI tách từ câu hỏi. */
  skills?: string[] | null;
  poolStatus?: TalentPoolFilter;
  limit?: number;
}

export interface TalentMatchedChunk {
  type: string | null;
  text: string | null;
}

export interface TalentSearchResult {
  candidateId: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  currentPosition: string | null;
  poolStatus: "ACTIVE" | "IN_POOL" | null;
  tags: string[];
  /** Độ tương đồng 0–1 (cosine). Chỉ có nghĩa tương đối giữa các kết quả của cùng một lần tìm. */
  score: number;
  totalYears: number | null;
  skills: string[];
  titles: string[];
  matched: TalentMatchedChunk;
}

export interface TalentSearchResponse {
  query: string;
  /** Bộ lọc thực sự được áp dụng (sau khi gộp AI tách và lựa chọn của người dùng). */
  applied: { semanticQuery: string; minYears: number | null; skills: string[] };
  parsed: { semanticQuery: string; minYears: number | null; skills: string[] };
  /** Số ứng viên đã đồng ý lưu hồ sơ (trước khi lọc/xếp hạng). */
  eligibleTotal: number;
  results: TalentSearchResult[];
}

// ===== Ứng viên nghi trùng =====

export type DuplicateSignal = "SAME_FILE" | "SAME_EMAIL" | "SAME_PHONE" | "SIMILAR_PROFILE";
export type DuplicateStatus = "PENDING" | "DISMISSED" | "CONFIRMED";

export interface DuplicatePerson {
  candidateId: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  hasCv: boolean;
}

export interface DuplicatePair {
  id: number;
  status: DuplicateStatus;
  score: number;
  signals: DuplicateSignal[];
  /** Có tín hiệu chắc chắn (cùng file / email / SĐT). SIMILAR_PROFILE đơn lẻ chỉ là gợi ý cần người xem. */
  highConfidence: boolean;
  a: DuplicatePerson;
  b: DuplicatePerson;
  createdAt: string | null;
}

export interface TalentSuggestResponse {
  jobPostingId: number;
  eligibleTotal: number;
  alreadyApplied: number;
  results: TalentSearchResult[];
}

export interface PostingSimilarityItem {
  applicationId: number;
  candidateId: number;
  /** Độ tương đồng CV ↔ JD, 0–1. Chỉ để tham khảo và sắp xếp. */
  similarity: number;
}

export interface PostingSimilarityResponse {
  jobPostingId: number;
  total: number;
  indexed: number;
  items: PostingSimilarityItem[];
}
