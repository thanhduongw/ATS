-- R07: hạn nộp hồ sơ, nhãn "Tuyển gấp" và công tắc "Hiện mức lương" trên trang tuyển dụng (C02, C03).
ALTER TABLE job_posting ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE job_posting ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE job_posting ADD COLUMN IF NOT EXISTS show_salary BOOLEAN NOT NULL DEFAULT TRUE;
