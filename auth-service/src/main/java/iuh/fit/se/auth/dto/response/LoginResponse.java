package iuh.fit.se.auth.dto.response;

public record LoginResponse(
        String accessToken,
        String refreshToken
) {}