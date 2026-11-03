-- docs/UI A08 "Thông tin doanh nghiệp" và C01 trang tuyển dụng cố định (quyết định C4, Q7).
-- Bảng company do Hibernate tạo (ddl-auto: update) nên chỉ sửa khi bảng đã có, giống V3.
DO $$
BEGIN
    IF to_regclass('public.company') IS NOT NULL THEN
        ALTER TABLE company ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
        ALTER TABLE company ADD COLUMN IF NOT EXISTS tax_code VARCHAR(32);
        ALTER TABLE company ADD COLUMN IF NOT EXISTS founded_date DATE;
        ALTER TABLE company ADD COLUMN IF NOT EXISTS website VARCHAR(255);
        ALTER TABLE company ADD COLUMN IF NOT EXISTS size_range VARCHAR(64);
        ALTER TABLE company ADD COLUMN IF NOT EXISTS recruiting_email VARCHAR(255);
        ALTER TABLE company ADD COLUMN IF NOT EXISTS brand_color VARCHAR(16);
        ALTER TABLE company ADD COLUMN IF NOT EXISTS data_protection_officer_id BIGINT;
        ALTER TABLE company ADD COLUMN IF NOT EXISTS privacy_policy TEXT;
        ALTER TABLE company ADD COLUMN IF NOT EXISTS privacy_policy_updated_at TIMESTAMP WITHOUT TIME ZONE;
        ALTER TABLE company ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
        -- Danh sách phúc lợi dạng JSON [{ "title": "...", "description": "..." }] cho khối Phúc lợi (C01).
        ALTER TABLE company ADD COLUMN IF NOT EXISTS benefits TEXT;

        ALTER TABLE company DROP CONSTRAINT IF EXISTS ck_company_brand_color;
        ALTER TABLE company ADD CONSTRAINT ck_company_brand_color
            CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$');
    END IF;
END
$$;
