-- docs/UI A03, A04 (quyết định C2): Quản trị doanh nghiệp mời người dùng qua email; người được mời
-- tự đặt mật khẩu bằng liên kết có hiệu lực 7 ngày. Chỉ lưu SHA-256 của token, token gốc chỉ nằm
-- trong email (giống refresh_token ở V4).
CREATE TABLE IF NOT EXISTS user_invitation (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    invited_by_user_id BIGINT NOT NULL,
    job_title VARCHAR(255),
    message TEXT,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITHOUT TIME ZONE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_invitation_token_hash ON user_invitation(token_hash);
CREATE INDEX IF NOT EXISTS ix_user_invitation_user ON user_invitation(user_id);
