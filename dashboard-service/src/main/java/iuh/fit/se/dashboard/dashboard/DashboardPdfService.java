package iuh.fit.se.dashboard.dashboard;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import iuh.fit.se.dashboard.dashboard.dto.DashboardSummaryResponse;
import iuh.fit.se.dashboard.dashboard.dto.RecruiterPerformance;
import iuh.fit.se.dashboard.dashboard.dto.SourceEffectiveness;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class DashboardPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generate(DashboardSummaryResponse summary, LocalDate from, LocalDate to) {
        Document document = new Document(PageSize.A4, 42, 42, 56, 56);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 11);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font tableCellFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Paragraph title = new Paragraph("BÁO CÁO TUYỂN DỤNG", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            String rangeText = (from != null || to != null)
                    ? "Khoảng thời gian: " + (from != null ? from.format(DATE_FMT) : "—")
                        + " – " + (to != null ? to.format(DATE_FMT) : "—")
                    : "Khoảng thời gian: Toàn bộ dữ liệu";
            Paragraph range = new Paragraph(rangeText, bodyFont);
            range.setAlignment(Element.ALIGN_CENTER);
            range.setSpacingAfter(20);
            document.add(range);

            document.add(sectionHeading("Tổng quan", headingFont));
            PdfPTable overview = new PdfPTable(2);
            overview.setWidthPercentage(100);
            addOverviewRow(overview, "Tin đang mở", String.valueOf(summary.openPostingsCount()), tableCellFont);
            addOverviewRow(overview, "Yêu cầu tuyển dụng đang hoạt động", String.valueOf(summary.activeRequisitionsCount()), tableCellFont);
            addOverviewRow(overview, "Tổng ứng viên", String.valueOf(summary.totalCandidates()), tableCellFont);
            addOverviewRow(overview, "Tổng hồ sơ ứng tuyển", String.valueOf(summary.totalApplications()), tableCellFont);
            addOverviewRow(overview, "Đã tuyển", String.valueOf(summary.hiredCount()), tableCellFont);
            addOverviewRow(overview, "Đã từ chối", String.valueOf(summary.rejectedCount()), tableCellFont);
            addOverviewRow(overview, "Tỉ lệ thành công", summary.successRatePercent() + "%", tableCellFont);
            addOverviewRow(overview, "Thời gian tuyển trung bình (Time-to-Hire)",
                    summary.avgTimeToHireDays() != null ? summary.avgTimeToHireDays() + " ngày" : "—", tableCellFont);
            overview.setSpacingAfter(20);
            document.add(overview);

            if (summary.sourceEffectiveness() != null && !summary.sourceEffectiveness().isEmpty()) {
                document.add(sectionHeading("Hiệu quả nguồn tuyển dụng", headingFont));
                PdfPTable sourceTable = new PdfPTable(4);
                sourceTable.setWidthPercentage(100);
                addHeaderCell(sourceTable, "Nguồn", tableHeaderFont);
                addHeaderCell(sourceTable, "Tổng hồ sơ", tableHeaderFont);
                addHeaderCell(sourceTable, "Đã tuyển", tableHeaderFont);
                addHeaderCell(sourceTable, "Tỉ lệ", tableHeaderFont);
                for (SourceEffectiveness s : summary.sourceEffectiveness()) {
                    addBodyCell(sourceTable, s.sourceName(), tableCellFont);
                    addBodyCell(sourceTable, String.valueOf(s.totalApplications()), tableCellFont);
                    addBodyCell(sourceTable, String.valueOf(s.hiredCount()), tableCellFont);
                    addBodyCell(sourceTable, s.hireRatePercent() + "%", tableCellFont);
                }
                sourceTable.setSpacingAfter(20);
                document.add(sourceTable);
            }

            if (summary.recruiterPerformance() != null && !summary.recruiterPerformance().isEmpty()) {
                document.add(sectionHeading("Hiệu suất nhân sự tuyển dụng", headingFont));
                PdfPTable recruiterTable = new PdfPTable(4);
                recruiterTable.setWidthPercentage(100);
                addHeaderCell(recruiterTable, "Recruiter", tableHeaderFont);
                addHeaderCell(recruiterTable, "Hồ sơ xử lý", tableHeaderFont);
                addHeaderCell(recruiterTable, "Đã tuyển", tableHeaderFont);
                addHeaderCell(recruiterTable, "Tỉ lệ", tableHeaderFont);
                for (RecruiterPerformance r : summary.recruiterPerformance()) {
                    addBodyCell(recruiterTable, r.recruiterName(), tableCellFont);
                    addBodyCell(recruiterTable, String.valueOf(r.totalHandled()), tableCellFont);
                    addBodyCell(recruiterTable, String.valueOf(r.hiredCount()), tableCellFont);
                    addBodyCell(recruiterTable, r.hireRatePercent() + "%", tableCellFont);
                }
                document.add(recruiterTable);
            }

        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo file PDF báo cáo", e);
        } finally {
            document.close();
        }

        return out.toByteArray();
    }

    private Paragraph sectionHeading(String text, Font font) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingBefore(8);
        p.setSpacingAfter(8);
        return p;
    }

    private void addOverviewRow(PdfPTable table, String label, String value, Font font) {
        table.addCell(new PdfPCell(new Paragraph(label, font)) {{ setBorder(0); setPadding(4); }});
        table.addCell(new PdfPCell(new Paragraph(value, font)) {{ setBorder(0); setPadding(4); }});
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setPadding(5);
        cell.setBackgroundColor(new java.awt.Color(240, 240, 240));
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setPadding(5);
        table.addCell(cell);
    }
}
