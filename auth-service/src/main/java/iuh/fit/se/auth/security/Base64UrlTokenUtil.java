package iuh.fit.se.auth.security;

import java.security.SecureRandom;
import java.util.Base64;

public class Base64UrlTokenUtil {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();

    public static String generateToken() {
        return generateToken(32); // Default 32 bytes = 256 bits
    }

    public static String generateToken(int byteLength) {
        byte[] randomBytes = new byte[byteLength];
        SECURE_RANDOM.nextBytes(randomBytes);
        return BASE64_URL_ENCODER.encodeToString(randomBytes);
    }
}
