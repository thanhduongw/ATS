-- Mục 4.4: nhắc lịch phỏng vấn trước 24 giờ và 1 giờ. Hai cột ghi mốc đã nhắc để không nhắc trùng.
ALTER TABLE interview ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP;
ALTER TABLE interview ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMP;
