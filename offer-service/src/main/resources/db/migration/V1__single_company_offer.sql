DO $$
BEGIN
    IF to_regclass('public.offer') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'offer' AND column_name = 'tenant_id') THEN
            ALTER TABLE offer ALTER COLUMN tenant_id DROP NOT NULL;
            COMMENT ON COLUMN offer.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';
        END IF;
        CREATE INDEX IF NOT EXISTS ix_offer_application_id ON offer (application_id);
        CREATE INDEX IF NOT EXISTS ix_offer_candidate_id ON offer (candidate_id);
    END IF;
END
$$;

-- application_id is a cross-service logical reference and cannot be a PostgreSQL
-- foreign key while application-service owns a separate database.
