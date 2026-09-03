DO $$
BEGIN
    IF to_regclass('public.email_verification') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'email_verification'
              AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE email_verification
                ALTER COLUMN tenant_id DROP NOT NULL;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_email_verification_email_id
            ON email_verification (LOWER(email), id DESC);
    END IF;
END
$$;

-- tenant_id remains only for backward-compatible data migration. Runtime code no
-- longer reads or writes it, and Phase 4 removes the deprecated column.
