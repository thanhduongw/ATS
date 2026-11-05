-- Lịch phỏng vấn 1 giờ cố định (04/11/2026): ứng viên chỉ Đồng ý / Từ chối, không chọn khung giờ.
-- Từ chối = xin dời lịch: lưu lý do + thời điểm, trạng thái CANDIDATE_DECLINED (cột status là varchar, không có CHECK).
ALTER TABLE interview ADD COLUMN IF NOT EXISTS candidate_decline_reason VARCHAR(500);
ALTER TABLE interview ADD COLUMN IF NOT EXISTS candidate_declined_at TIMESTAMP;

-- Bỏ luồng gửi nhiều khung giờ để ứng viên chọn: khung giờ còn đang chờ chọn thì hủy,
-- HR đặt lại 1 giờ cố định (hồ sơ hiện lại trong việc "Lên lịch phỏng vấn").
UPDATE interview_slot SET status = 'CANCELLED' WHERE status = 'PROPOSED';
