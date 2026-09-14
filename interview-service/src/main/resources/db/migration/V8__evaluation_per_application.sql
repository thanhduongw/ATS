-- Danh gia khong con bat buoc gan vao mot buoi phong van.
-- HR cham duoc o nhung vong khong co phong van (vi du Sang loc CV), con
-- nguoi phong van van cham theo buoi minh duoc phan cong nhu truoc.

ALTER TABLE interview_evaluation
    ADD COLUMN IF NOT EXISTS application_id BIGINT;

-- Cac dong cu deu gan voi mot buoi phong van, lay application_id tu do.
UPDATE interview_evaluation e
SET application_id = i.application_id
FROM interview i
WHERE e.interview_id = i.id
  AND e.application_id IS NULL;

-- Tu nay moi danh gia deu phai thuoc ve mot ho so ung tuyen...
ALTER TABLE interview_evaluation
    ALTER COLUMN application_id SET NOT NULL;

-- ...nhung buoi phong van thi khong bat buoc nua.
ALTER TABLE interview_evaluation
    ALTER COLUMN interview_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_evaluation_application
    ON interview_evaluation (application_id);
