-- docs/UI R43, UR17: HR thấy ứng viên đã mở thư mời bao nhiêu lần và lần cuối lúc nào
-- ("Ứng viên chưa phản hồi · đã xem 1 lần lúc 11:02"). Đếm khi ứng viên mở thư đã gửi.
ALTER TABLE offer ADD COLUMN IF NOT EXISTS candidate_view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE offer ADD COLUMN IF NOT EXISTS candidate_last_viewed_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_candidate_view_count;
ALTER TABLE offer ADD CONSTRAINT ck_offer_candidate_view_count CHECK (candidate_view_count >= 0);

-- Job quét hạn phản hồi đọc: thư đã gửi (APPROVED) còn sống và có hạn. V7 đã có chỉ mục tương tự cho
-- trạng thái SENT; code hiện dùng APPROVED cho "đã gửi" nên thêm chỉ mục riêng.
CREATE INDEX IF NOT EXISTS ix_offer_approved_due_expiry
    ON offer(response_deadline)
    WHERE status = 'APPROVED' AND deleted_at IS NULL AND response_deadline IS NOT NULL;
