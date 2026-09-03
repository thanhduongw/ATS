DO $$
BEGIN
    IF to_regclass('public.candidate') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'candidate' AND column_name = 'tenant_id') THEN
            ALTER TABLE candidate ALTER COLUMN tenant_id DROP NOT NULL;
            COMMENT ON COLUMN candidate.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';
        END IF;
        CREATE UNIQUE INDEX IF NOT EXISTS uk_candidate_user_id
            ON candidate (user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS uk_candidate_active_email_ci
            ON candidate (LOWER(email)) WHERE deleted_at IS NULL;
    END IF;

    IF to_regclass('public.custom_field_definition') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'custom_field_definition' AND column_name = 'tenant_id') THEN
        ALTER TABLE custom_field_definition ALTER COLUMN tenant_id DROP NOT NULL;
        COMMENT ON COLUMN custom_field_definition.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';
    END IF;
END
$$;
