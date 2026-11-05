import dayjs from "dayjs";
import { COLORS } from "../../../app/theme";
import { formatMoney } from "../../../app/money";

/**
 * Thư mời nhận việc như ứng viên sẽ đọc — dùng chung cho R24 (soạn, cập nhật theo từng phím gõ) và R26/R43
 * (chi tiết). Bố cục theo bản mẫu R24 "Xem trước thư mời".
 */
export interface OfferLetterData {
    company: string;
    /** Tên nơi làm việc (lấy tỉnh/thành cho dòng "TP.HCM, ngày …"). */
    location?: string;
    candidateName: string;
    jobTitle?: string | null;
    deptName?: string | null;
    salaryOffered?: number | null;
    allowance?: number | null;
    payFrequency?: string | null;
    startDate?: string | null;
    probationMonths?: number | null;
    contractTypeName?: string | null;
    annualLeaveDays?: number | null;
    reportingManager?: string | null;
    benefits?: string | null;
    candidateVisibleNote?: string | null;
    responseDeadline?: string | null;
    requesterName?: string | null;
}

const PAY: Record<string, string> = { MONTHLY: " đồng/tháng", YEARLY: " đồng/năm" };
const money = (v: number) => formatMoney(v).replace(/\s?₫|\s?đ$/u, "");

/** Phúc lợi lưu thành chuỗi: mỗi dòng một mục (dữ liệu cũ ngăn bằng " · "). */
const benefitLines = (raw?: string | null) =>
    (raw ?? "").split(/\n| · /).map((x) => x.replace(/^[-•]\s*/, "").trim()).filter(Boolean);

export default function OfferLetterPreview({ data }: { data: OfferLetterData }) {
    const pay = PAY[data.payFrequency ?? "MONTHLY"] ?? "";
    const city = (data.location ?? "").match(/TP\.?\s?[^,·]+|Hà Nội|Đà Nẵng|Cần Thơ/)?.[0] ?? "TP.HCM";
    const benefits = benefitLines(data.benefits);
    const d = (v?: string | null) => (v ? dayjs(v).format("DD/MM/YYYY") : "…");
    return (
        <div style={{
            background: "#fff", borderRadius: 12, padding: "22px 24px", boxShadow: `inset 0 0 0 1px ${COLORS.border}`,
            fontSize: 13.5, lineHeight: 1.65,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <b>{data.company || "Công ty"}</b>
                <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>{city}, ngày {dayjs().format("DD/MM/YYYY")}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>THƯ MỜI NHẬN VIỆC</div>
            <p style={{ margin: "0 0 8px" }}>Kính gửi anh/chị <b>{data.candidateName || "…"}</b>,</p>
            <p style={{ margin: "0 0 8px" }}>
                Sau quá trình phỏng vấn, {data.company || "công ty"} trân trọng mời anh/chị đảm nhận vị trí <b>{data.jobTitle || "…"}</b>
                {data.deptName ? <> tại {data.deptName}</> : null}, với các điều khoản sau:
            </p>
            <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                <li>Lương gộp: <b>{data.salaryOffered ? `${money(data.salaryOffered)}${pay}` : "…"}</b></li>
                {!!data.allowance && <li>Phụ cấp: {money(data.allowance)}{pay}</li>}
                <li>Ngày bắt đầu: <b>{d(data.startDate)}</b>{data.probationMonths ? `, thử việc ${data.probationMonths} tháng` : ""}</li>
                <li>
                    Hợp đồng {(data.contractTypeName ?? "…").toLowerCase()}
                    {data.annualLeaveDays != null ? `, ${data.annualLeaveDays} ngày phép/năm` : ""}
                </li>
                {data.reportingManager && <li>Báo cáo trực tiếp cho {data.reportingManager}</li>}
                {benefits.map((b) => <li key={b}>{b}</li>)}
            </ul>
            {data.candidateVisibleNote && <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{data.candidateVisibleNote}</p>}
            <p style={{ margin: "0 0 12px" }}>
                Anh/chị vui lòng phản hồi trước{" "}
                <b>{data.responseDeadline ? `${dayjs(data.responseDeadline).format("HH:mm")} ngày ${dayjs(data.responseDeadline).format("DD/MM/YYYY")}` : "hạn ghi trên thư"}</b>{" "}
                trên cổng ứng viên.
            </p>
            <p style={{ margin: 0 }}>
                Trân trọng,<br /><b>{data.requesterName || "…"}</b><br />
                <span style={{ color: COLORS.textSecondary }}>Chuyên viên tuyển dụng, {data.company}</span>
            </p>
        </div>
    );
}
