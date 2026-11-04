-- docs/UI A03: cột "Đăng nhập gần nhất". Bảng do Hibernate tạo nên chỉ sửa khi đã có.
DO $$
BEGIN
    IF to_regclass('public.app_user') IS NOT NULL THEN
        ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END
$$;
