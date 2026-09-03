DO $$
BEGIN
    IF to_regclass('public.company') IS NOT NULL THEN
        IF (SELECT COUNT(*) FROM company) > 1 THEN
            RAISE EXCEPTION 'Phase 4 requires exactly one company profile; reconcile legacy company rows before migrating';
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS uk_single_company_profile ON company ((true));

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'company' AND column_name = 'tenant_id') THEN
            ALTER TABLE company ALTER COLUMN tenant_id DROP NOT NULL;
            COMMENT ON COLUMN company.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';
        END IF;
    END IF;

    IF to_regclass('public.password_reset_tokens') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'tenant_id') THEN
        ALTER TABLE password_reset_tokens ALTER COLUMN tenant_id DROP NOT NULL;
        COMMENT ON COLUMN password_reset_tokens.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';
    END IF;

    IF to_regclass('public.app_user') IS NOT NULL THEN
        ALTER TABLE app_user ADD COLUMN IF NOT EXISTS department_id BIGINT;
        CREATE INDEX IF NOT EXISTS ix_app_user_department_id ON app_user (department_id);

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_app_user_department_positive') THEN
            ALTER TABLE app_user ADD CONSTRAINT ck_app_user_department_positive
                CHECK (department_id IS NULL OR department_id > 0);
        END IF;

        IF to_regclass('public.role') IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_app_user_role') THEN
            ALTER TABLE app_user ADD CONSTRAINT fk_app_user_role
                FOREIGN KEY (role_id) REFERENCES role(id);
        END IF;
    END IF;
END
$$;

-- The legacy tenant table is intentionally retained for data recovery only. It is
-- no longer mapped by JPA and no runtime repository can read it.
