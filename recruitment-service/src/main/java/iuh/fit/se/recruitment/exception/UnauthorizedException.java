package iuh.fit.se.recruitment.exception;

/** Sai thông tin đăng nhập / phiên không hợp lệ → HTTP 401. */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
