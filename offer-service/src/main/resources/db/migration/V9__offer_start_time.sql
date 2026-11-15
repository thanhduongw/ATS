-- C23 (web ứng viên) / R24: giờ có mặt ngày đầu tiên. Thư mời cũ để trống.
ALTER TABLE offer ADD COLUMN IF NOT EXISTS start_time TIME;
