-- Bản sao điểm AI (nguồn: ai-service, sự kiện ai.scoring.completed) để danh sách hồ sơ sắp xếp / lọc phía server.
-- Guarded như V2: trên database mới Flyway chạy trước ddl-auto, cột sẽ do entity mapping tạo.
DO $$
BEGIN
    IF to_regclass('public.application') IS NOT NULL THEN
        ALTER TABLE application
            ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5, 1),
            ADD COLUMN IF NOT EXISTS ai_tier VARCHAR(20),
            ADD COLUMN IF NOT EXISTS ai_status VARCHAR(20),
            ADD COLUMN IF NOT EXISTS ai_updated_at TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_application_posting_ai_score_active
            ON application (job_posting_id, ai_score)
            WHERE deleted_at IS NULL;

        COMMENT ON COLUMN application.ai_score IS
            'Điểm AI 0-100 (bản sao từ ai-service). NULL khi chưa chấm, đang chấm lần đầu hoặc chấm lỗi.';
        COMMENT ON COLUMN application.ai_updated_at IS
            'Mốc thời gian của sự kiện AI đã áp dụng (giờ ai-service) — bỏ qua sự kiện cũ hơn đến muộn.';
    END IF;
END
$$;
