DO $$
DECLARE
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY ARRAY['notification', 'audit_log'] LOOP
        IF to_regclass('public.' || tbl_name) IS NOT NULL
           AND EXISTS (SELECT 1 FROM information_schema.columns c
                       WHERE c.table_schema = 'public' AND c.table_name = tbl_name
                         AND c.column_name = 'tenant_id') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id DROP NOT NULL', tbl_name);
            EXECUTE format(
                'COMMENT ON COLUMN %I.tenant_id IS ''DEPRECATED Phase 4: ignored by single-company runtime''',
                tbl_name);
        END IF;
    END LOOP;

    IF to_regclass('public.notification') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS ix_notification_recipient_created
            ON notification (recipient_user_id, created_at DESC);
    END IF;
END
$$;
