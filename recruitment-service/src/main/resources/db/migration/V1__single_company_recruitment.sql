DO $$
DECLARE
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY ARRAY['job_requisition', 'job_posting'] LOOP
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

    IF to_regclass('public.job_requisition') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS ix_job_requisition_department_id
            ON job_requisition (department_id);
    END IF;

    IF to_regclass('public.job_posting') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS ix_job_posting_requisition_id
            ON job_posting (requisition_id);
        IF to_regclass('public.job_requisition') IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_posting_requisition') THEN
            ALTER TABLE job_posting ADD CONSTRAINT fk_job_posting_requisition
                FOREIGN KEY (requisition_id) REFERENCES job_requisition(id);
        END IF;
    END IF;
END
$$;
