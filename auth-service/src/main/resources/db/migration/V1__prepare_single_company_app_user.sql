DO $$
BEGIN
    IF to_regclass('public.app_user') IS NOT NULL THEN
        ALTER TABLE app_user
            ADD COLUMN IF NOT EXISTS phone VARCHAR(255),
            ADD COLUMN IF NOT EXISTS department_id BIGINT,
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'app_user'
              AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE app_user ALTER COLUMN tenant_id DROP NOT NULL;
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS uk_app_user_email_ci
            ON app_user (LOWER(email));
    END IF;
END
$$;

-- tenant_id is intentionally retained for data compatibility. Phase 4 removes it
-- after all tenant-dependent code and data have been migrated.
