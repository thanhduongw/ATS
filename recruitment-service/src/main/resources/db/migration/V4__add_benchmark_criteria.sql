-- Phase 3: Add benchmark_criteria JSONB column to job_posting
-- Stores AI-generated evaluation criteria for candidate scoring (Phase 5)
ALTER TABLE job_posting ADD COLUMN benchmark_criteria JSONB;

COMMENT ON COLUMN job_posting.benchmark_criteria IS 'AI-generated benchmark criteria JSON array: [{name, weight, standardRequirement, category, isMustHave}]';
