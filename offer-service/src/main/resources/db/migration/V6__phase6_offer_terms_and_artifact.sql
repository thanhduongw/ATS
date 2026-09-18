-- Phase 6 (P6.1-P6.4): the data an offer letter actually needs, the record of how it got there,
-- and the artifact the candidate was really sent.
--
-- Additive. No existing offer row changes status, and every new column is nullable so the Phase 1
-- backfilled rows stay readable.

-- ---------------------------------------------------------------------------------------------
-- 1. P6.1 - eligibility and the requisition snapshot HR decides against
--
-- The case already carries selection_decision_id from Phase 5. What it lacked was the budget and
-- salary band the decision was made under. Those live in recruitment-service and change over time;
-- an offer approved against a 40M band must not look, six months later, as though it was approved
-- against a 60M one. So they are copied in at preparation time and never refreshed.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE offer_case
    ADD COLUMN IF NOT EXISTS requisition_snapshot_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS requisition_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS requisition_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS requisition_budget NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS requisition_salary_min NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS requisition_salary_max NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS requisition_work_location_id BIGINT,
    ADD COLUMN IF NOT EXISTS requisition_work_arrangement VARCHAR(16),
    ADD COLUMN IF NOT EXISTS hm_proposed_salary NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS hm_proposed_currency VARCHAR(8),
    ADD COLUMN IF NOT EXISTS hm_available_start_date DATE;

-- One selection decision authorises one live negotiation. Without this, two recruiters preparing
-- an offer from the same decision would each hold the same headcount slot, and P5.4's ledger would
-- be asked to fill a seat twice.
--
-- Partial on OPEN for the same reason as ux_offer_case_open_application: a closed case is history,
-- and a declined offer must not block a second attempt at the same candidate.
CREATE UNIQUE INDEX IF NOT EXISTS ux_offer_case_open_selection_decision
    ON offer_case(selection_decision_id)
    WHERE status = 'OPEN' AND selection_decision_id IS NOT NULL
      AND legacy_review_required = FALSE;

-- ---------------------------------------------------------------------------------------------
-- 2. P6.2 - the full term set of process document section 10
--
-- Snapshots rather than ids wherever the letter has to stay reproducible. A job title renamed next
-- quarter must not retroactively change what a candidate was offered, and the id alone cannot say
-- what the document said.
-- ---------------------------------------------------------------------------------------------

-- 10.1 candidate and job
ALTER TABLE offer
    ADD COLUMN IF NOT EXISTS candidate_email_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS candidate_phone_snapshot VARCHAR(50),
    ADD COLUMN IF NOT EXISTS job_title_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS department_name_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS hiring_manager_id BIGINT,
    ADD COLUMN IF NOT EXISTS hiring_manager_name_snapshot VARCHAR(255);

-- 10.2 employment terms
ALTER TABLE offer
    ADD COLUMN IF NOT EXISTS work_location_id BIGINT,
    ADD COLUMN IF NOT EXISTS work_location_snapshot VARCHAR(500),
    ADD COLUMN IF NOT EXISTS work_arrangement VARCHAR(16),
    ADD COLUMN IF NOT EXISTS working_hours VARCHAR(255),
    ADD COLUMN IF NOT EXISTS direct_manager_id BIGINT,
    ADD COLUMN IF NOT EXISTS direct_manager_name_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS employment_conditions TEXT;

-- 10.3 income and benefits. salary_offered is HR's final figure; hm_proposed_salary is what the
-- hiring manager asked for, kept beside it so an approver can see the gap without digging.
ALTER TABLE offer
    ADD COLUMN IF NOT EXISTS salary_type VARCHAR(8),
    ADD COLUMN IF NOT EXISTS currency VARCHAR(8),
    ADD COLUMN IF NOT EXISTS pay_cycle VARCHAR(16),
    ADD COLUMN IF NOT EXISTS probation_salary NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS bonus_kpi TEXT,
    ADD COLUMN IF NOT EXISTS hm_proposed_salary NUMERIC(18,2);

-- 10.4 response information
ALTER TABLE offer
    ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_person_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS effective_conditions TEXT,
    ADD COLUMN IF NOT EXISTS term_revision_count INTEGER NOT NULL DEFAULT 0;

-- Enumerations, enforced here as well as in the service because a repair script reaches these
-- columns too and "gross or net" has no third answer.
ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_salary_type;
ALTER TABLE offer ADD CONSTRAINT ck_offer_salary_type
    CHECK (salary_type IS NULL OR salary_type IN ('GROSS', 'NET'));

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_pay_cycle;
ALTER TABLE offer ADD CONSTRAINT ck_offer_pay_cycle
    CHECK (pay_cycle IS NULL OR pay_cycle IN ('MONTHLY', 'BIWEEKLY', 'WEEKLY', 'ANNUAL', 'HOURLY'));

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_work_arrangement;
ALTER TABLE offer ADD CONSTRAINT ck_offer_work_arrangement
    CHECK (work_arrangement IS NULL OR work_arrangement IN ('ONSITE', 'HYBRID', 'REMOTE'));

-- ISO 4217 shape only; which currencies a company actually allows is configuration, not schema.
ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_currency;
ALTER TABLE offer ADD CONSTRAINT ck_offer_currency
    CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_probation_salary;
ALTER TABLE offer ADD CONSTRAINT ck_offer_probation_salary
    CHECK (probation_salary IS NULL OR probation_salary >= 0);

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_hm_proposed_salary;
ALTER TABLE offer ADD CONSTRAINT ck_offer_hm_proposed_salary
    CHECK (hm_proposed_salary IS NULL OR hm_proposed_salary >= 0);

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_term_revision_count;
ALTER TABLE offer ADD CONSTRAINT ck_offer_term_revision_count
    CHECK (term_revision_count >= 0);

-- The three below constrain columns that already hold data, so they are added NOT VALID: every
-- insert and update from here on is checked, and the Phase 1 backfilled rows are grandfathered
-- rather than blocking the migration. A legacy offer with a deadline after its start date is a
-- fact about the past; refusing to migrate because of it would help nobody.
ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_salary_non_negative;
ALTER TABLE offer ADD CONSTRAINT ck_offer_salary_non_negative
    CHECK (salary_offered >= 0) NOT VALID;

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_allowance_non_negative;
ALTER TABLE offer ADD CONSTRAINT ck_offer_allowance_non_negative
    CHECK (allowance IS NULL OR allowance >= 0) NOT VALID;

ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_probation_months_range;
ALTER TABLE offer ADD CONSTRAINT ck_offer_probation_months_range
    CHECK (probation_months IS NULL OR (probation_months >= 0 AND probation_months <= 12)) NOT VALID;

-- A deadline after the start date asks a candidate to decide about a job they have already begun.
ALTER TABLE offer DROP CONSTRAINT IF EXISTS ck_offer_deadline_before_start;
ALTER TABLE offer ADD CONSTRAINT ck_offer_deadline_before_start
    CHECK (response_deadline IS NULL OR start_date IS NULL
           OR response_deadline::date <= start_date) NOT VALID;

-- ---------------------------------------------------------------------------------------------
-- 3. P6.3 - what was sent for approval, and what changed since last time
--
-- The approver approves a set of terms, not an offer id. Without a snapshot at submit time, HR
-- could edit a draft after approval and the approval would silently come to mean something else.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS offer_term_revision (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    offer_id BIGINT NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
    revision_no INTEGER NOT NULL,
    submitted_by_user_id BIGINT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    terms_snapshot TEXT NOT NULL,
    -- Null on the first revision: there is nothing to have changed from.
    change_summary TEXT,
    CONSTRAINT ux_offer_term_revision UNIQUE (offer_id, revision_no),
    CONSTRAINT ck_offer_term_revision_no CHECK (revision_no >= 1)
);

CREATE INDEX IF NOT EXISTS ix_offer_term_revision_offer
    ON offer_term_revision(offer_id, revision_no DESC);

-- Evidence, not mutable state.
CREATE OR REPLACE FUNCTION offer_term_revision_is_append_only() RETURNS trigger AS $body$
BEGIN
    RAISE EXCEPTION 'offer_term_revision is append-only'
        USING ERRCODE = 'restrict_violation';
END;
$body$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offer_term_revision_append_only ON offer_term_revision;
CREATE TRIGGER trg_offer_term_revision_append_only
    BEFORE UPDATE OR DELETE ON offer_term_revision
    FOR EACH ROW EXECUTE FUNCTION offer_term_revision_is_append_only();

-- ---------------------------------------------------------------------------------------------
-- 4. P6.4 - the artifact the candidate was actually sent
--
-- Regenerating a PDF on demand cannot answer "what did they receive", because the generator, the
-- template and the font all change. The bytes are stored once at issue, hashed, and served from
-- then on; the hash is what makes a later dispute settleable.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS offer_artifact (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    offer_id BIGINT NOT NULL REFERENCES offer(id) ON DELETE RESTRICT,
    offer_case_id BIGINT,
    kind VARCHAR(24) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    template_version VARCHAR(32) NOT NULL,
    -- False means the PDF was produced without an embedded Unicode font, so Vietnamese diacritics
    -- may be wrong in it. Recorded per artifact because it is a property of that file forever.
    font_embedded BOOLEAN NOT NULL,
    font_name VARCHAR(120),
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    generated_by_user_id BIGINT,
    CONSTRAINT ux_offer_artifact_offer_kind UNIQUE (offer_id, kind),
    CONSTRAINT ck_offer_artifact_kind CHECK (kind IN ('OFFER_LETTER')),
    CONSTRAINT ck_offer_artifact_size CHECK (byte_size > 0),
    CONSTRAINT ck_offer_artifact_sha256 CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS ix_offer_artifact_case ON offer_artifact(offer_case_id);

CREATE OR REPLACE FUNCTION offer_artifact_is_immutable() RETURNS trigger AS $body$
BEGIN
    RAISE EXCEPTION 'offer_artifact is immutable once written'
        USING ERRCODE = 'restrict_violation';
END;
$body$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offer_artifact_immutable ON offer_artifact;
CREATE TRIGGER trg_offer_artifact_immutable
    BEFORE UPDATE OR DELETE ON offer_artifact
    FOR EACH ROW EXECUTE FUNCTION offer_artifact_is_immutable();

-- ---------------------------------------------------------------------------------------------
-- 5. P6.2 - attachments, and the policy for who may read one
--
-- scan_status is the access policy made explicit: nothing reaches a candidate until a scanner has
-- said it is clean, or an operator has deliberately configured SKIPPED for an environment with no
-- scanner. The states exist here so the decision is recorded per file rather than assumed.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS offer_attachment (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    offer_id BIGINT NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    candidate_visible BOOLEAN NOT NULL DEFAULT FALSE,
    scan_status VARCHAR(16) NOT NULL,
    scan_detail VARCHAR(500),
    scanned_at TIMESTAMP WITH TIME ZONE,
    uploaded_by_user_id BIGINT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ck_offer_attachment_size CHECK (byte_size > 0),
    CONSTRAINT ck_offer_attachment_sha256 CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_offer_attachment_scan_status
        CHECK (scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'SKIPPED')),
    CONSTRAINT ck_offer_attachment_scanned
        CHECK (scan_status = 'PENDING' OR scanned_at IS NOT NULL),
    -- An unscanned or infected file is never candidate-visible, whatever a caller asks for.
    CONSTRAINT ck_offer_attachment_visibility
        CHECK (candidate_visible = FALSE OR scan_status IN ('CLEAN', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS ix_offer_attachment_offer
    ON offer_attachment(offer_id)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN offer.salary_offered IS
    'HR final figure. hm_proposed_salary holds what the hiring manager asked for.';
COMMENT ON COLUMN offer_artifact.sha256 IS
    'Hash of the issued bytes; what makes a later dispute about the document settleable.';
