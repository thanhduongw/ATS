-- Talent Pool: ứng viên đồng ý RIÊNG cho việc lưu hồ sơ và xét cho vị trí khác (tách khỏi consent_given của từng đợt tuyển).
-- Hồ sơ có từ trước mặc định CHƯA đồng ý; ứng viên bật lại ở form ứng tuyển hoặc Cài đặt tài khoản.
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS talent_pool_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS talent_pool_consent_at TIMESTAMP;
