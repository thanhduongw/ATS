package iuh.fit.se.offer.offer;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class OfferPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generate(Offer offer, String companyName, String contractTypeName) {
        Document document = new Document(PageSize.A4, 56, 56, 56, 56);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

            Paragraph company = new Paragraph(companyName != null ? companyName : "Công ty", headingFont);
            company.setAlignment(Element.ALIGN_CENTER);
            document.add(company);

            Paragraph title = new Paragraph("THƯ MỜI NHẬN VIỆC", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingBefore(8);
            title.setSpacingAfter(24);
            document.add(title);

            document.add(bodyParagraph(bodyFont,
                    "Kính gửi: " + nullToDash(offer.getCandidateNameSnapshot()), 0, 4));

            document.add(bodyParagraph(bodyFont,
                    "Chúng tôi trân trọng mời bạn gia nhập công ty với các điều khoản đề nghị như sau:", 0, 16));

            document.add(bodyParagraph(bodyFont,
                    "Mức lương đề nghị: " + formatCurrency(offer.getSalaryOffered()) + " VNĐ/tháng", 0, 6));
            document.add(bodyParagraph(bodyFont,
                    "Loại hợp đồng: " + nullToDash(contractTypeName), 0, 6));
            document.add(bodyParagraph(bodyFont,
                    "Ngày bắt đầu dự kiến: " + (offer.getStartDate() != null ? offer.getStartDate().format(DATE_FMT) : "—"), 0, 6));
            document.add(bodyParagraph(bodyFont,
                    "Thời gian thử việc: " + (offer.getProbationMonths() != null ? offer.getProbationMonths() + " tháng" : "—"), 0, 6));
            if (offer.getAllowance() != null) {
                document.add(bodyParagraph(bodyFont,
                        "Phụ cấp: " + formatCurrency(offer.getAllowance()) + " VNĐ/tháng", 0, 6));
            }
            if (offer.getBenefits() != null && !offer.getBenefits().isBlank()) {
                document.add(bodyParagraph(bodyFont, "Quyền lợi: " + offer.getBenefits(), 0, 6));
            }
            if (offer.getResponseDeadline() != null) {
                document.add(bodyParagraph(bodyFont,
                        "Vui lòng phản hồi trước ngày: " + offer.getResponseDeadline().toLocalDate().format(DATE_FMT), 16, 6));
            }

            document.add(bodyParagraph(bodyFont,
                    "Chúng tôi rất mong nhận được sự đồng hành của bạn. Trân trọng!", 24, 0));

        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo file PDF Offer Letter", e);
        } finally {
            document.close();
        }

        return out.toByteArray();
    }

    private Paragraph bodyParagraph(Font font, String text, float spacingBefore, float spacingAfter) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingBefore(spacingBefore);
        p.setSpacingAfter(spacingAfter);
        return p;
    }

    private String nullToDash(String s) {
        return s != null && !s.isBlank() ? s : "—";
    }

    private String formatCurrency(java.math.BigDecimal value) {
        if (value == null) return "—";
        return String.format("%,.0f", value);
    }
}
