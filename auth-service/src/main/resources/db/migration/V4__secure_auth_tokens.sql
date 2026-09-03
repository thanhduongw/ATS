DO $$
BEGIN
    IF to_regclass('public.refresh_token') IS NOT NULL THEN
        -- Existing rows contain raw bearer tokens. Invalidate them before the
        -- application starts storing SHA-256 digests in the same column.
        UPDATE refresh_token SET revoked = TRUE WHERE revoked = FALSE;
        ALTER TABLE refresh_token ALTER COLUMN token TYPE VARCHAR(64);
        COMMENT ON COLUMN refresh_token.token IS
            'SHA-256 digest of opaque refresh token; raw token is never persisted';
    END IF;

    IF to_regclass('public.email_verification') IS NOT NULL THEN
        ALTER TABLE email_verification
            ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
        UPDATE email_verification
        SET expiry_date = CURRENT_TIMESTAMP
        WHERE verified = FALSE;
        COMMENT ON COLUMN email_verification.otp_code IS
            'BCrypt hash of OTP; legacy plaintext OTPs were expired by Phase 9';
    END IF;

    IF to_regclass('public.password_reset_tokens') IS NOT NULL THEN
        ALTER TABLE password_reset_tokens
            ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
        UPDATE password_reset_tokens SET used = TRUE WHERE used = FALSE;
        COMMENT ON COLUMN password_reset_tokens.otp_code IS
            'BCrypt hash of OTP; legacy plaintext OTPs were invalidated by Phase 9';
    END IF;
END
$$;
