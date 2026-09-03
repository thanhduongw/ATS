DO $$
BEGIN
    IF to_regclass('public.candidate') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'candidate'
              AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE candidate
                ALTER COLUMN tenant_id DROP NOT NULL;
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS uk_candidate_user_id
            ON candidate (user_id)
            WHERE user_id IS NOT NULL AND deleted_at IS NULL;
    END IF;
END
$$;

-- tenant_id is deprecated for account-backed candidates. Phase 4 removes the
-- column after the remaining candidate queries have been converted.
