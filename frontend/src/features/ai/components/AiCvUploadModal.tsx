import { useState, useCallback } from "react";
import { Modal, Upload, Button, message, Alert, Space } from "antd";
import {
  InboxOutlined,
  RobotOutlined,
  ReloadOutlined,
  CheckOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import { extractCvFromUpload } from "../aiApi";
import type { CVExtractionResponse, CVExtractionResult, ExtractionProvenance } from "../types";
import CvParseResultPanel from "./CvParseResultPanel";
import { COLORS } from "../../../app/theme";
import { ModalTitle } from "../../../components/ui/pageKit";
import type { CandidateFormValues } from "../../candidate/schemas/candidateSchema";
import type { CatalogItem } from "../../masterdata/types";

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
const ACCEPTED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);
const MAX_FILE_SIZE_MB = 20;

interface Props {
  open: boolean;
  onClose: () => void;
  availableSkills?: CatalogItem[];
  availableEducationLevels?: CatalogItem[];
  /** Called when user clicks "Điền vào hồ sơ" — passes pre-filled candidate data and the original CV file */
  onFillCandidate?: (data: Partial<CandidateFormValues>, file?: File | null) => void;
  /** Called when AI parse succeeds — passes the full result for display on the detail page */
  onParseSuccess?: (result: CVExtractionResult, provenance: ExtractionProvenance) => void;
}

type ModalState = "idle" | "uploading" | "success" | "error";

/**
 * Map AI extraction result → CandidateFormValues for pre-filling the CandidateFormModal.
 * Maps:
 * - Basic info (fullName, email, phone, address, currentPosition)
 * - Demographics (dateOfBirth, gender)
 * - Masterdata links (educationLevelId, skillIds)
 * - Rich internalNote summary of full experience, projects, education, and skills.
 */
export function mapToCandidateFormValues(
  result: CVExtractionResult,
  availableSkills: CatalogItem[] = [],
  availableEducationLevels: CatalogItem[] = [],
): Partial<CandidateFormValues> {
  const cv = result.extracted_cv;

  // 1. Skill IDs mapping:
  const matchedSkillIds: number[] = [];
  if (cv.skills && cv.skills.length > 0 && availableSkills.length > 0) {
    const cvSkillsLower = cv.skills.map((s) => s.trim().toLowerCase());
    for (const item of availableSkills) {
      const itemNameLower = String(item.name).trim().toLowerCase();
      if (
        cvSkillsLower.some(
          (cs) => cs === itemNameLower || cs.includes(itemNameLower) || itemNameLower.includes(cs)
        )
      ) {
        matchedSkillIds.push(item.id);
      }
    }
  }

  // 2. Education level ID mapping:
  let matchedEduId: number | null = null;
  if (cv.education && cv.education.length > 0 && availableEducationLevels.length > 0) {
    const eduTexts = cv.education
      .map((e) => `${e.degree ?? ""} ${e.institution ?? ""} ${e.field_of_study ?? ""}`.toLowerCase())
      .join(" ");

    for (const item of availableEducationLevels) {
      const name = String(item.name).toLowerCase();
      if (
        (name.includes("đại học") && (eduTexts.includes("đại học") || eduTexts.includes("bachelor") || eduTexts.includes("cử nhân") || eduTexts.includes("kỹ sư") || eduTexts.includes("engineer"))) ||
        (name.includes("thạc sĩ") && (eduTexts.includes("thạc sĩ") || eduTexts.includes("master"))) ||
        (name.includes("tiến sĩ") && (eduTexts.includes("tiến sĩ") || eduTexts.includes("phd") || eduTexts.includes("doctor"))) ||
        (name.includes("cao đẳng") && (eduTexts.includes("cao đẳng") || eduTexts.includes("college"))) ||
        (name.includes("trung cấp") && eduTexts.includes("trung cấp"))
      ) {
        matchedEduId = item.id;
        break;
      }
    }
  }

  // 3. Construct rich internalNote summary:
  const noteSections: string[] = [];
  noteSections.push("=== THÔNG TIN TRÍCH XUẤT TỪ CV (AI PARSER) ===");

  if (result.years_of_experience_calculated != null || cv.years_of_experience_claimed != null) {
    const calc = result.years_of_experience_calculated != null ? `${result.years_of_experience_calculated} năm` : "—";
    const claim = cv.years_of_experience_claimed != null ? ` (Tự khai: ${cv.years_of_experience_claimed} năm)` : "";
    noteSections.push(`* Tổng kinh nghiệm: ${calc}${claim}`);
  }

  if (cv.skills && cv.skills.length > 0) {
    noteSections.push(`* Kỹ năng trích xuất (${cv.skills.length}): ${cv.skills.join(", ")}`);
  }

  if (cv.work_experience && cv.work_experience.length > 0) {
    noteSections.push("\n[Lịch sử làm việc]");
    cv.work_experience.forEach((w, idx) => {
      const timeSpan = `${w.start_date ?? "?"} → ${w.is_current ? "Hiện tại" : (w.end_date ?? "?")}`;
      noteSections.push(`${idx + 1}. ${w.title ?? "Vị trí"} @ ${w.company ?? "Công ty"} (${timeSpan})`);
      if (w.technologies && w.technologies.length > 0) {
        noteSections.push(`   - Công nghệ: ${w.technologies.join(", ")}`);
      }
      if (w.description) {
        noteSections.push(`   - Mô tả: ${w.description.trim()}`);
      }
    });
  }

  if (cv.education && cv.education.length > 0) {
    noteSections.push("\n[Học vấn]");
    cv.education.forEach((e, idx) => {
      const timeSpan = `${e.start_date ?? ""} - ${e.end_date ?? ""}`.trim();
      noteSections.push(`${idx + 1}. ${e.degree ?? ""} - ${e.institution ?? ""}${timeSpan ? ` (${timeSpan})` : ""}`);
      if (e.field_of_study) noteSections.push(`   - Chuyên ngành: ${e.field_of_study}`);
      if (e.gpa) noteSections.push(`   - GPA: ${e.gpa}`);
    });
  }

  if (cv.projects && cv.projects.length > 0) {
    noteSections.push("\n[Dự án]");
    cv.projects.forEach((p, idx) => {
      noteSections.push(`${idx + 1}. ${p.name ?? "Dự án"}${p.role ? ` (Vai trò: ${p.role})` : ""}`);
      if (p.technologies && p.technologies.length > 0) {
        noteSections.push(`   - Công nghệ: ${p.technologies.join(", ")}`);
      }
      if (p.description) {
        noteSections.push(`   - Mô tả: ${p.description.trim()}`);
      }
    });
  }

  if (cv.certifications && cv.certifications.length > 0) {
    noteSections.push("\n[Chứng chỉ]");
    cv.certifications.forEach((c) => {
      noteSections.push(`- ${c.name ?? ""}${c.issuer ? ` (${c.issuer})` : ""}${c.date_obtained ? ` - ${c.date_obtained}` : ""}`);
    });
  }

  if (cv.candidate.summary) {
    noteSections.push(`\n[Tóm tắt / Mục tiêu nghề nghiệp]:\n${cv.candidate.summary}`);
  }

  // Format date of birth if available:
  let formattedDob: string | null = null;
  if (cv.candidate.date_of_birth) {
    const d = dayjs(cv.candidate.date_of_birth);
    if (d.isValid()) {
      formattedDob = d.format("YYYY-MM-DD");
    } else {
      formattedDob = cv.candidate.date_of_birth;
    }
  }

  // Normalize gender:
  let normalizedGender: string | null = null;
  if (cv.candidate.gender) {
    const g = cv.candidate.gender.trim().toUpperCase();
    if (g === "MALE" || g === "NAM") normalizedGender = "MALE";
    else if (g === "FEMALE" || g === "NỮ" || g === "NU") normalizedGender = "FEMALE";
    else if (g === "OTHER" || g === "KHÁC") normalizedGender = "OTHER";
  }

  return {
    fullName: cv.candidate.name,
    email: cv.candidate.email ?? "",
    phone: cv.candidate.phone,
    dateOfBirth: formattedDob,
    gender: normalizedGender,
    address: cv.candidate.location,
    currentPosition: cv.work_experience[0]?.title ?? null,
    educationLevelId: matchedEduId,
    skillIds: matchedSkillIds,
    internalNote: noteSections.join("\n"),
  };
}

export default function AiCvUploadModal({
  open,
  onClose,
  availableSkills = [],
  availableEducationLevels = [],
  onFillCandidate,
  onParseSuccess,
}: Props) {
  const [state, setState] = useState<ModalState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CVExtractionResult | null>(null);
  const [provenance, setProvenance] = useState<ExtractionProvenance | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const resetState = useCallback(() => {
    setState("idle");
    setFile(null);
    setResult(null);
    setProvenance(null);
    setErrorMessage("");
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_MIME.has(f.type)) {
      return `Định dạng file không được hỗ trợ. Vui lòng chọn file PDF, DOCX, hoặc ảnh (PNG/JPEG).`;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File quá lớn (tối đa ${MAX_FILE_SIZE_MB}MB).`;
    }
    return null;
  };

  const handleUploadChange: UploadProps["onChange"] = (info) => {
    const f = info.fileList[0]?.originFileObj as File | undefined;
    if (!f) {
      setFile(null);
      return;
    }
    const err = validateFile(f);
    if (err) {
      message.error(err);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleExtract = async () => {
    if (!file) return;
    setState("uploading");
    setErrorMessage("");

    try {
      const res = await extractCvFromUpload(file);
      const data: CVExtractionResponse = res.data;

      if (data.status === "error" || !data.result) {
        setState("error");
        setErrorMessage(data.error_message ?? "Không thể phân tích CV. Vui lòng thử lại.");
        setProvenance(data.provenance);
        return;
      }

      setState("success");
      setResult(data.result);
      setProvenance(data.provenance);
      onParseSuccess?.(data.result, data.provenance);
    } catch (err) {
      setState("error");
      const axiosErr = err as AxiosError<{ message?: string; error_message?: string; detail?: string }>;

      if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout")) {
        setErrorMessage("Quá thời gian xử lý (>2 phút). AI-service có thể đang quá tải, vui lòng thử lại sau.");
      } else if (axiosErr.response) {
        const data = axiosErr.response.data;
        setErrorMessage(
          data?.error_message ?? data?.message ?? data?.detail ??
          `Lỗi server (HTTP ${axiosErr.response.status}). Vui lòng thử lại.`
        );
      } else {
        setErrorMessage("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.");
      }
    }
  };

  const handleRetry = () => {
    setState("idle");
    setResult(null);
    setProvenance(null);
    setErrorMessage("");
    // Keep the file so user can re-extract without re-selecting
  };

  const handleFillCandidate = () => {
    if (!result || !onFillCandidate) return;
    const formValues = mapToCandidateFormValues(result, availableSkills, availableEducationLevels);
    onFillCandidate(formValues, file);
    handleClose();
  };

  // Footer buttons depend on state
  const renderFooter = () => {
    if (state === "idle") {
      return (
        <Space>
          <Button onClick={handleClose}>Đóng</Button>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            disabled={!file}
            onClick={handleExtract}
          >
            Trích xuất CV bằng AI
          </Button>
        </Space>
      );
    }
    if (state === "uploading") {
      return (
        <Button disabled>
          <LoadingOutlined /> Đang xử lý...
        </Button>
      );
    }
    if (state === "error") {
      return (
        <Space>
          <Button onClick={handleClose}>Đóng</Button>
          <Button icon={<ReloadOutlined />} onClick={handleRetry}>
            Thử lại
          </Button>
        </Space>
      );
    }
    // success
    return (
      <Space>
        <Button icon={<ReloadOutlined />} onClick={handleRetry}>
          Trích xuất lại
        </Button>
        {onFillCandidate && (
          <Button type="primary" icon={<CheckOutlined />} onClick={handleFillCandidate}>
            Điền vào hồ sơ
          </Button>
        )}
      </Space>
    );
  };

  return (
    <Modal
      title={
        <ModalTitle
          icon={<RobotOutlined />}
          title="AI Trích Xuất CV"
          subtitle="Tải lên CV để AI phân tích và trích xuất thông tin tự động"
        />
      }
      open={open}
      onCancel={handleClose}
      footer={renderFooter()}
      width={state === "success" ? 860 : 640}
      centered
      destroyOnHidden
      styles={{
        body: {
          maxHeight: "72vh",
          overflowY: "auto",
          padding: 16,
          background: "#FAFBFC",
        },
      }}
    >
      {/* ── Idle: file picker ── */}
      {state === "idle" && (
        <div>
          <Upload.Dragger
            beforeUpload={() => false}
            onChange={handleUploadChange}
            maxCount={1}
            accept={ACCEPTED_TYPES}
            fileList={file ? [{ uid: "-1", name: file.name, status: "done" }] : []}
          >
            {file ? (
              <div style={{ padding: "12px 0" }}>
                <FileTextOutlined style={{ fontSize: 28, color: COLORS.primary }} />
                <div style={{ marginTop: 8, fontWeight: 600 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                  {(file.size / 1024).toFixed(0)} KB · Bấm để chọn file khác
                </div>
              </div>
            ) : (
              <>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Kéo thả file CV vào đây hoặc bấm để chọn file</p>
                <p className="ant-upload-hint">
                  Hỗ trợ PDF, DOCX, và ảnh (PNG/JPEG) — tối đa {MAX_FILE_SIZE_MB}MB
                </p>
              </>
            )}
          </Upload.Dragger>
        </div>
      )}

      {/* ── Uploading: loading state ── */}
      {state === "uploading" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            <RobotOutlined style={{ fontSize: 32, color: "#fff" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: COLORS.textPrimary }}>
              AI đang phân tích nội dung CV...
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
              Quá trình này có thể mất 10–60 giây tùy độ dài CV
            </div>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.08); opacity: 0.85; }
            }
          `}</style>
        </div>
      )}

      {/* ── Error ── */}
      {state === "error" && (
        <div style={{ padding: "24px 0" }}>
          <Alert
            type="error"
            showIcon
            message="Không thể phân tích CV"
            description={errorMessage}
            style={{ borderRadius: 10 }}
          />
        </div>
      )}

      {/* ── Success: results ── */}
      {state === "success" && result && provenance && (
        <CvParseResultPanel result={result} provenance={provenance} />
      )}
    </Modal>
  );
}
