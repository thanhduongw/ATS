-- Guarded so a fresh database (where Hibernate has not created the tables yet, because
-- Flyway runs before ddl-auto) does not fail. On such a database the authorization
-- snapshot columns are created by the entity mapping instead.
DO $$
BEGIN
    IF to_regclass('public.application') IS NOT NULL THEN
        ALTER TABLE application
            ADD COLUMN IF NOT EXISTS department_id BIGINT,
            ADD COLUMN IF NOT EXISTS pipeline_id BIGINT;

        CREATE INDEX IF NOT EXISTS idx_application_department_active
            ON application (department_id)
            WHERE deleted_at IS NULL;

        CREATE INDEX IF NOT EXISTS idx_application_assigned_recruiter_active
            ON application (assigned_recruiter_id)
            WHERE deleted_at IS NULL;

        COMMENT ON COLUMN application.department_id IS
            'Authorization snapshot inherited from the job posting/requisition. Legacy NULL rows require reconciliation.';

        COMMENT ON COLUMN application.pipeline_id IS
            'Pipeline snapshot used by assigned application workflows. Legacy NULL rows fall back to recruitment-service.';
    END IF;
END
$$;
