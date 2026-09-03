-- Guarded so a fresh database (where Hibernate has not created the tables yet, because
-- Flyway runs before ddl-auto) does not fail. On such a database the authorization
-- snapshot columns are created by the entity mapping instead.
DO $$
BEGIN
    IF to_regclass('public.interview') IS NOT NULL THEN
        ALTER TABLE interview
            ADD COLUMN IF NOT EXISTS department_id BIGINT,
            ADD COLUMN IF NOT EXISTS assigned_recruiter_id BIGINT;

        CREATE INDEX IF NOT EXISTS idx_interview_department
            ON interview (department_id);

        CREATE INDEX IF NOT EXISTS idx_interview_assigned_recruiter
            ON interview (assigned_recruiter_id);

        COMMENT ON COLUMN interview.department_id IS
            'Authorization snapshot inherited from application. Legacy NULL rows require reconciliation.';
    END IF;
END
$$;
