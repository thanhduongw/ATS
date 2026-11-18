package iuh.fit.se.candidate.storage;

import org.junit.jupiter.api.Test;

import java.text.Normalizer;

import static org.assertj.core.api.Assertions.assertThat;

/** Tên CV hiện lại trên web và mobile lấy từ khoá S3 — tên có dấu không được biến thành chuỗi gạch dưới. */
class S3ServiceFileNameTest {

    @Test
    void foldsVietnameseLettersInsteadOfReplacingThem() {
        assertThat(S3Service.safeFileName("CV_Ngô_Gia_Bảo.pdf")).isEqualTo("CV_Ngo_Gia_Bao.pdf");
        assertThat(S3Service.safeFileName("CV_Đỗ_Minh_Tuấn.pdf")).isEqualTo("CV_Do_Minh_Tuan.pdf");
    }

    @Test
    void handlesDecomposedNamesSentByMacBrowsers() {
        String decomposed = Normalizer.normalize("Hồ sơ Nguyễn Văn Khánh.pdf", Normalizer.Form.NFD);

        assertThat(S3Service.safeFileName(decomposed)).isEqualTo("Ho_so_Nguyen_Van_Khanh.pdf");
    }

    @Test
    void stillReplacesCharactersUnsafeForStorageKeys() {
        assertThat(S3Service.safeFileName("../cv (bản cuối)?.pdf")).isEqualTo(".._cv__ban_cuoi__.pdf");
    }
}
