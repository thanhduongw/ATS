-- Phase 3: notifications gain a lifecycle.
--
-- Until now a notification was a row that existed forever and said whatever it said when it was
-- written. That is fine while schedules never change. Once an interview can be moved, the message
-- telling somebody to attend the old time is actively harmful, and "already sent" is not a reason
-- to leave it standing in the recipient's list.
--
-- Additive only. Existing rows become ACTIVE with no business key, which is exactly what they are.

ALTER TABLE notification ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE';

-- Identity of the thing being said, as opposed to identity of the row saying it:
-- "<type>:<resourceType>:<resourceId>:<revision>:<recipient>". Two deliveries of the same event
-- produce the same key, so redelivery cannot notify anybody twice.
ALTER TABLE notification ADD COLUMN IF NOT EXISTS business_key VARCHAR(255);

-- Which revision of the resource this message described. A reminder written for revision 2 is
-- meaningless once the interview is on revision 3, and this is how that is recognisable.
ALTER TABLE notification ADD COLUMN IF NOT EXISTS resource_revision INTEGER;

ALTER TABLE notification ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITHOUT TIME ZONE;

-- The message that replaced this one, so a recipient looking at a voided notice can be pointed at
-- the current one instead of being left with a dead end.
ALTER TABLE notification ADD COLUMN IF NOT EXISTS replaced_by_notification_id BIGINT;

ALTER TABLE notification DROP CONSTRAINT IF EXISTS ck_notification_status;
ALTER TABLE notification ADD CONSTRAINT ck_notification_status
    CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED'));

-- A superseded or cancelled notification must say when it stopped being true.
ALTER TABLE notification DROP CONSTRAINT IF EXISTS ck_notification_superseded_at;
ALTER TABLE notification ADD CONSTRAINT ck_notification_superseded_at
    CHECK (status = 'ACTIVE' OR superseded_at IS NOT NULL);

-- The idempotency guarantee. Partial, because rows written before Phase 3 have no key and there is
-- nothing to deduplicate them against.
CREATE UNIQUE INDEX IF NOT EXISTS ux_notification_business_key
    ON notification(business_key)
    WHERE business_key IS NOT NULL;

-- Supersession asks "what is still standing about this interview", which is this index.
CREATE INDEX IF NOT EXISTS ix_notification_resource_status
    ON notification(resource_type, resource_id, status);

CREATE INDEX IF NOT EXISTS ix_notification_recipient_status
    ON notification(recipient_user_id, status, created_at DESC);
