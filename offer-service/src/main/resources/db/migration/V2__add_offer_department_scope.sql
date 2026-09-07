-- Guarded so a fresh database (where Hibernate has not created the tables yet, because
-- Flyway runs before ddl-auto) does not fail. On such a database the authorization
-- snapshot columns are created by the entity mapping instead.
DO $$
BEGIN
    IF to_regclass('public.offer') IS NOT NULL THEN
        ALTER TABLE offer
            ADD COLUMN IF NOT EXISTS department_id BIGINT,
            ADD COLUMN IF NOT EXISTS assigned_recruiter_id BIGINT;

        CREATE INDEX IF NOT EXISTS idx_offer_department_active
            ON offer (department_id)
            WHERE deleted_at IS NULL;

        CREATE INDEX IF NOT EXISTS idx_offer_assigned_recruiter_active
            ON offer (assigned_recruiter_id)
            WHERE deleted_at IS NULL;

        COMMENT ON COLUMN offer.department_id IS
            'Authorization snapshot inherited from application. Legacy NULL rows require reconciliation.';
    END IF;
END
$$;
