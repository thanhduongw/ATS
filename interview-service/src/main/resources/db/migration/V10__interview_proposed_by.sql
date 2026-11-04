-- R21: ghi lại ai (người phỏng vấn nào) đề xuất đổi giờ để HR biết hỏi ai.
ALTER TABLE interview ADD COLUMN IF NOT EXISTS proposed_by BIGINT;
