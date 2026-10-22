-- Xoá bản sao điểm AI chấm theo cách cũ (ai-service v1: GOOD_FIT / POTENTIAL_FIT / NOT_FIT, trọng số 35/25/15/10/15).
-- ai-service v2 xếp loại FIT / NOT_FIT / UNCLASSIFIED theo cách chấm mới (docs/DE_XUAT_CHAM_DIEM_CV.md); điểm cũ không
-- quy đổi được sang cách mới. NOT_FIT cũ cũng xoá cho nhất quán (cùng cách chấm cũ).
-- HR dùng nút "AI chấm hồ sơ của tin" để chấm lại. Chỉ đụng 4 cột ai_*, không chạm cột khác.
-- Guarded như V2/V4: trên database mới Flyway chạy trước ddl-auto, bảng có thể chưa tồn tại.
DO $$
BEGIN
    IF to_regclass('public.application') IS NOT NULL THEN
        UPDATE application
        SET ai_score = NULL, ai_tier = NULL, ai_status = NULL, ai_updated_at = NULL
        WHERE ai_tier IN ('GOOD_FIT', 'POTENTIAL_FIT', 'NOT_FIT');
    END IF;
END
$$;
