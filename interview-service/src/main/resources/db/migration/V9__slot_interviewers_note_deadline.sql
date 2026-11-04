-- R18 "Để ứng viên chọn": khung giờ đề xuất lưu người phỏng vấn đã chọn, ghi chú cho ứng viên
-- và hạn ứng viên chọn giờ (C13 hiện hạn, C25 hết hạn thì không chọn được).
ALTER TABLE interview_slot ADD COLUMN IF NOT EXISTS interviewer_ids VARCHAR(500);
ALTER TABLE interview_slot ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE interview_slot ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP;
