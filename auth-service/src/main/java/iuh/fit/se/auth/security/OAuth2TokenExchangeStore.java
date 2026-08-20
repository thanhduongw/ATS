package iuh.fit.se.auth.security;

import iuh.fit.se.auth.dto.response.LoginResponse;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lưu tạm cặp token sau khi Google SSO thành công, đổi lấy 1 mã dùng-một-lần để redirect qua
 * frontend — tránh đưa access/refresh token trực tiếp lên URL (rò rỉ qua lịch sử trình duyệt, log).
 * In-memory, đủ dùng cho 1 instance; khi scale nhiều instance cần chuyển sang Redis.
 */
@Component
public class OAuth2TokenExchangeStore {

    private static final long TTL_SECONDS = 60;

    private record Entry(LoginResponse tokens, Instant expiresAt) {}

    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    public String store(LoginResponse tokens) {
        cleanupExpired();
        String code = UUID.randomUUID().toString();
        store.put(code, new Entry(tokens, Instant.now().plusSeconds(TTL_SECONDS)));
        return code;
    }

    public LoginResponse consume(String code) {
        Entry entry = store.remove(code);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            return null;
        }
        return entry.tokens();
    }

    private void cleanupExpired() {
        Instant now = Instant.now();
        store.values().removeIf(e -> e.expiresAt().isBefore(now));
    }
}
