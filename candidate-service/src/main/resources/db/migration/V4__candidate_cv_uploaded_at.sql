-- C17 (web ứng viên): ngày tải CV hiện tại. CV có từ trước để trống.
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMP;
