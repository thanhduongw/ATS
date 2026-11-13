-- C17/R32: ảnh đại diện người dùng (đường dẫn S3 công khai).
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1000);
