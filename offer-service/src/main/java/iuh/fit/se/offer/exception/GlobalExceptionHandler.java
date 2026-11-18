package iuh.fit.se.offer.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thân lỗi thống nhất cho mọi service: luôn có {@code message} (và {@code error} cùng nội dung, để client cũ
 * đọc khoá nào cũng được). Lỗi validation kèm thêm từng trường {@code tenTruong: câu lỗi}.
 *
 * <p>Mã lỗi: 400 dữ liệu không hợp lệ / lỗi nghiệp vụ · 401 sai thông tin đăng nhập · 403 không có quyền ·
 * 404 không tìm thấy · 500 lỗi hệ thống. Không bao giờ nối chi tiết kỹ thuật ({@code ex.getMessage()} của lỗi
 * không lường trước) vào câu trả về — chi tiết chỉ nằm trong log.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String FORBIDDEN = "Bạn không có quyền thực hiện thao tác này";
    private static final String BAD_REQUEST = "Dữ liệu gửi lên không hợp lệ";

    private static ResponseEntity<Map<String, String>> body(HttpStatus status, String message) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, String>> handleUnauthorized(UnauthorizedException ex) {
        return body(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, String>> handleBusiness(BusinessException ex) {
        String message = ex.getMessage() == null ? BAD_REQUEST : ex.getMessage();
        // "Không tìm thấy ..." là lỗi 404, không phải dữ liệu gửi lên sai.
        HttpStatus status = message.startsWith("Không tìm thấy") ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        return body(status, message);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        // Câu tiếng Việt do nghiệp vụ viết thì giữ; câu kỹ thuật tiếng Anh (vd "Role X cannot...") thì thay bằng câu chung.
        String message = ex.getMessage();
        boolean vietnamese = message != null && message.chars().anyMatch(c -> c > 127);
        return body(HttpStatus.FORBIDDEN, vietnamese ? message : FORBIDDEN);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> body = new LinkedHashMap<>();
        String first = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getDefaultMessage())
                .filter(m -> m != null && !m.isBlank())
                .findFirst().orElse(BAD_REQUEST);
        body.put("message", first);
        body.put("error", first);
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> body.putIfAbsent(err.getField(), err.getDefaultMessage()));
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class,
            HttpMediaTypeNotSupportedException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<Map<String, String>> handleBadRequest(Exception ex) {
        log.debug("Yêu cầu không hợp lệ: {}", ex.getMessage());
        return body(HttpStatus.BAD_REQUEST, BAD_REQUEST);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleTooLarge(MaxUploadSizeExceededException ex) {
        return body(HttpStatus.PAYLOAD_TOO_LARGE, "File vượt quá dung lượng cho phép");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoResourceFoundException ex) {
        return body(HttpStatus.NOT_FOUND, "Không tìm thấy đường dẫn");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethod(HttpRequestMethodNotSupportedException ex) {
        return body(HttpStatus.METHOD_NOT_ALLOWED, "Thao tác không được hỗ trợ");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
        log.error("Lỗi không lường trước", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Đã có lỗi xảy ra, vui lòng thử lại sau");
    }
}
