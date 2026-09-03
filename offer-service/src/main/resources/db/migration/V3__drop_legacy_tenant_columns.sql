DO $$
DECLARE
    tenant_count BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns c
               WHERE c.table_schema = 'public' AND c.table_name = 'offer'
                 AND c.column_name = 'tenant_id') THEN
        SELECT COUNT(DISTINCT tenant_id) INTO tenant_count
        FROM offer WHERE tenant_id IS NOT NULL;
        IF tenant_count > 1 THEN
            RAISE EXCEPTION 'Phase 10 cannot merge multiple tenants in offer. Reconcile and back up data first.';
        END IF;
        ALTER TABLE offer DROP COLUMN tenant_id;
    END IF;
END
$$;
