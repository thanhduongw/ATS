DO $$
DECLARE
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY ARRAY[
        'contract_type', 'department', 'education_level', 'email_template',
        'employment_type', 'experience_level', 'interview_criteria', 'job_level',
        'job_title', 'recruitment_pipeline', 'recruitment_source',
        'recruitment_status', 'rejection_reason', 'skill', 'work_location'
    ] LOOP
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
END
$$;

-- Global uniqueness is now enforced by service validation. Physical unique indexes
-- are deferred until legacy rows from non-selected tenants have been reconciled.
