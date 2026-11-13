package iuh.fit.se.offer.offer;

import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

/**
 * Font Unicode cho PDF. Helvetica có sẵn của OpenPDF chỉ có bảng mã Latin-1 nên làm MẤT chữ tiếng Việt
 * ("THƯ MỜI" → "TH MI"). Nhúng Be Vietnam Pro (SIL OFL 1.1, xem resources/fonts/OFL.txt) với mã IDENTITY_H.
 */
final class PdfFonts {

    private static final BaseFont REGULAR = load("fonts/BeVietnamPro-Regular.ttf");
    private static final BaseFont BOLD = load("fonts/BeVietnamPro-Bold.ttf");

    private PdfFonts() {}

    static Font regular(float size) {
        return new Font(REGULAR, size);
    }

    static Font bold(float size) {
        return new Font(BOLD, size);
    }

    private static BaseFont load(String path) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            byte[] bytes = in.readAllBytes();
            return BaseFont.createFont(path, BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, bytes, null);
        } catch (IOException e) {
            throw new UncheckedIOException("Không nạp được font PDF " + path, e);
        }
    }
}
