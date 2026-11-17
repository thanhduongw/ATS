package iuh.fit.se.candidate.common;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;

import java.text.Normalizer;

/**
 * Tìm kiếm không phân biệt dấu tiếng Việt và hoa thường (mục 4.5): gõ "nguyen" vẫn ra "Nguyễn".
 * Phía DB dùng hàm chuẩn `translate` nên không cần cài extension `unaccent`.
 */
public final class TextSearch {

    private static final String FROM =
            "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
    private static final String TO =
            "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";

    private TextSearch() {}

    /** Biểu thức SQL: chữ thường, bỏ dấu. */
    public static Expression<String> fold(CriteriaBuilder cb, Expression<String> column) {
        return cb.function("translate", String.class, cb.lower(column), cb.literal(FROM), cb.literal(TO));
    }

    /** Từ khoá người dùng gõ: chữ thường, bỏ dấu, cắt khoảng trắng. */
    public static String fold(String keyword) {
        if (keyword == null) return "";
        String decomposed = Normalizer.normalize(keyword.trim().toLowerCase(), Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}+", "").replace('đ', 'd');
    }

    /** Mẫu LIKE "%từ khoá%" đã bỏ dấu và thoát ký tự đặc biệt bằng '!'. */
    public static String likePattern(String keyword) {
        return "%" + fold(keyword).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }
}
