/** Kho ứng viên (Talent Pool) — tìm kiếm ngữ nghĩa ở ai-service. */

export type TalentPoolFilter = "ALL" | "IN_POOL";

/** Trạng thái tuyển dụng gộp từ các hồ sơ ứng tuyển của ứng viên. */
export type RecruitStatus = "NONE" | "IN_PROGRESS" | "REJECTED" | "HIRED";

export interface TalentRecruitment {
  status: RecruitStatus;
  /** Tin và giai đoạn của hồ sơ đại diện (đi xa nhất / đã tuyển / gần nhất). */
  jobTitle: string | null;
  stageName: string | null;
  stageType: string | null;
  applicationId: number | null;
  applications: number;
}

export interface TalentSearchRequest {
  query: string;
  /** Có giá trị thì thắng bộ lọc AI tách từ câu hỏi; 0 = gỡ bộ lọc số năm. */
  minYears?: number | null;
  /** Có giá trị (kể cả mảng rỗng) thì thắng bộ lọc AI tách từ câu hỏi. */
  skills?: string[] | null;
  poolStatus?: TalentPoolFilter;
  /** Trạng thái tuyển dụng được hiện; không gửi = mặc định (không gồm người đã được tuyển). */
  statuses?: RecruitStatus[];
  limit?: number;
}

export interface TalentMatchedChunk {
  type: string | null;
  text: string | null;
}

/** Bằng chứng thật trong CV cho một điều kiện của câu hỏi (kỹ năng, từ khoá). `highlights` = các cặp [bắt đầu, kết thúc) trong `text`. */
export interface TalentEvidence {
  label: string;
  found: boolean;
  /** Các cách viết đã thử tìm trong CV (để giải thích khi không thấy). */
  tried: string[];
  /** Có trong danh sách kỹ năng của hồ sơ dù CV không có câu mô tả. */
  inSkillList: boolean;
  section: string | null;
  text: string | null;
  highlights: number[][];
}

export interface TalentJob {
  title: string;
  company: string | null;
  start: string | null;
  end: string | null;
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
  evidence: TalentEvidence[];
  /** Tỉ lệ điều kiện của câu hỏi được CV chứng minh (0–1); null khi không có điều kiện để kiểm. */
  coverage: number | null;
  recruitment: TalentRecruitment;
  jobs: TalentJob[];
}

export interface TalentSearchResponse {
  query: string;
  /** Bộ lọc thực sự được áp dụng (sau khi gộp AI tách và lựa chọn của người dùng). */
  applied: { semanticQuery: string; minYears: number | null; skills: string[] };
  parsed: { semanticQuery: string; minYears: number | null; skills: string[] };
  /** Số ứng viên đã đồng ý lưu hồ sơ (trước khi lọc/xếp hạng). */
  eligibleTotal: number;
  /** Số ứng viên đã đồng ý theo từng trạng thái (trước khi lọc trạng thái). */
  statusCounts: Record<RecruitStatus, number>;
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
