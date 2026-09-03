DO $$
DECLARE
    tbl_name TEXT;
    tenant_count BIGINT;
    table_tenant BIGINT;
    selected_tenant BIGINT := NULL;
BEGIN
    FOREACH tbl_name IN ARRAY ARRAY['interview', 'interview_slot', 'salary_proposal'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns c
                   WHERE c.table_schema = 'public' AND c.table_name = tbl_name
                     AND c.column_name = 'tenant_id') THEN
            EXECUTE format(
                'SELECT COUNT(DISTINCT tenant_id), MIN(tenant_id) FROM %I WHERE tenant_id IS NOT NULL',
                tbl_name) INTO tenant_count, table_tenant;
            IF tenant_count > 1 THEN
                RAISE EXCEPTION 'Phase 10 cannot merge multiple tenants in table %. Reconcile and back up data first.', tbl_name;
            END IF;
            IF table_tenant IS NOT NULL THEN
                IF selected_tenant IS NULL THEN selected_tenant := table_tenant;
                ELSIF selected_tenant <> table_tenant THEN
                    RAISE EXCEPTION 'Phase 10 found inconsistent legacy tenant IDs in interview data. Reconcile and back up data first.';
                END IF;
            END IF;
            EXECUTE format('ALTER TABLE %I DROP COLUMN tenant_id', tbl_name);
        END IF;
    END LOOP;
END
$$;
