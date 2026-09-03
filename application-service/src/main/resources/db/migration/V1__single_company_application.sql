DO $$
DECLARE
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY ARRAY['application', 'application_comment'] LOOP
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

    IF to_regclass('public.application') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS ix_application_candidate_id ON application (candidate_id);
        CREATE INDEX IF NOT EXISTS ix_application_job_posting_id ON application (job_posting_id);
        CREATE UNIQUE INDEX IF NOT EXISTS uk_application_candidate_posting_active
            ON application (candidate_id, job_posting_id) WHERE deleted_at IS NULL;
    END IF;

    IF to_regclass('public.application_comment') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_comment_application') THEN
        ALTER TABLE application_comment ADD CONSTRAINT fk_application_comment_application
            FOREIGN KEY (application_id) REFERENCES application(id);
    END IF;

    IF to_regclass('public.application_history') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_history_application') THEN
        ALTER TABLE application_history ADD CONSTRAINT fk_application_history_application
            FOREIGN KEY (application_id) REFERENCES application(id);
    END IF;
END
$$;

-- candidate_id and job_posting_id point to separate service databases, so PostgreSQL
-- cannot enforce cross-database foreign keys for those logical references.
