DO $$
DECLARE
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY ARRAY['interview', 'interview_slot', 'salary_proposal'] LOOP
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

    IF to_regclass('public.interview') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS ix_interview_application_id ON interview (application_id);
        CREATE INDEX IF NOT EXISTS ix_interview_candidate_id ON interview (candidate_id);
    END IF;

    IF to_regclass('public.interview_interviewer') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS ix_interview_interviewer_user_id
            ON interview_interviewer (interviewer_id);
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_interview_interviewer_interview') THEN
            ALTER TABLE interview_interviewer ADD CONSTRAINT fk_interview_interviewer_interview
                FOREIGN KEY (interview_id) REFERENCES interview(id);
        END IF;
    END IF;

    IF to_regclass('public.interview_evaluation') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_interview_evaluation_interview') THEN
        ALTER TABLE interview_evaluation ADD CONSTRAINT fk_interview_evaluation_interview
            FOREIGN KEY (interview_id) REFERENCES interview(id);
    END IF;
END
$$;

-- application_id and interviewer_id are cross-service logical references.
