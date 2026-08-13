-- ========================================================
-- ATS MULTI-DATABASE INITIALIZATION & PRE-POPULATED SEED DATA
-- ========================================================

CREATE DATABASE ats_auth;
CREATE DATABASE ats_masterdata;
CREATE DATABASE ats_recruitment;
CREATE DATABASE ats_candidate;
CREATE DATABASE ats_interview;
CREATE DATABASE ats_notification;
CREATE DATABASE ats_dashboard;
CREATE DATABASE ats_application;
CREATE DATABASE ats_offer;

-- Connect to ats_auth
\c ats_auth;

CREATE TABLE IF NOT EXISTS tenant (
    id BIGSERIAL PRIMARY KEY,
    tenant_code VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS app_user (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tenant (id, tenant_code, status)
VALUES (1, 'TECHCORP', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO company (id, tenant_id, name, address, phone)
VALUES (1, 1, 'TechCorp Vietnam', 'TP. Hồ Chí Minh', '0909123456')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role (id, name) VALUES
(1, 'COMPANY_ADMIN'),
(2, 'RECRUITER'),
(3, 'HIRING_MANAGER'),
(4, 'CANDIDATE'),
(5, 'PLATFORM_ADMIN')
ON CONFLICT (id) DO NOTHING;

-- BCrypt Hash for 'Password123!': $2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu
INSERT INTO app_user (id, tenant_id, email, password_hash, full_name, role_id, status)
VALUES  (1, 1, 'admin.company@test.net', '$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu', 'Nguyễn Quản Trị', 1, 'ACTIVE'),           -- COMPANY_ADMIN
        (2, 1, 'hr.recruiter@test.net', '$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu', 'Trần Tuyển Dụng', 2, 'ACTIVE'),           -- RECRUITER (HR)
        (3, 1, 'dept.manager@test.net', '$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu', 'Lê Trưởng Phòng', 3, 'ACTIVE'),           -- HIRING_MANAGER (Phòng ban)
        (4, 1, 'candidate.test@test.net', '$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu', 'Nguyễn Văn Ứng Viên', 4, 'ACTIVE')        -- CANDIDATE
ON CONFLICT (email) DO NOTHING;

SELECT setval('tenant_id_seq', (SELECT MAX(id) FROM tenant));
SELECT setval('company_id_seq', (SELECT MAX(id) FROM company));
SELECT setval('role_id_seq', (SELECT MAX(id) FROM role));
SELECT setval('app_user_id_seq', (SELECT MAX(id) FROM app_user));

-- Connect to ats_masterdata
\c ats_masterdata;

CREATE TABLE IF NOT EXISTS catalog_items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pipelines (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id BIGINT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stage_type VARCHAR(50) NOT NULL,
    stage_order INT NOT NULL
);

INSERT INTO catalog_items (id, tenant_id, category, name, active, display_order) VALUES
(1, 1, 'DEPARTMENT', 'IT Software', true, 1),
(2, 1, 'DEPARTMENT', 'Human Resources', true, 2),
(3, 1, 'JOB_TITLE', 'Senior Java Developer', true, 1),
(4, 1, 'JOB_TITLE', 'Frontend React Developer', true, 2),
(5, 1, 'EMPLOYMENT_TYPE', 'Full-time', true, 1),
(6, 1, 'WORK_LOCATION', 'TP. Hồ Chí Minh', true, 1),
(7, 1, 'WORK_LOCATION', 'Hà Nội', true, 2),
(8, 1, 'CONTRACT_TYPE', 'Chính thức 12 tháng', true, 1),
(9, 1, 'CONTRACT_TYPE', 'Chính thức vô thời hạn', true, 2),
(10, 1, 'REJECTION_REASON', 'Kỹ năng chuyên môn chưa đạt', true, 1),
(11, 1, 'REJECTION_REASON', 'Mức lương kỳ vọng vượt ngân sách', true, 2),
(12, 1, 'INTERVIEW_CRITERIA', 'Kỹ năng Java Core & Spring Boot', true, 1),
(13, 1, 'INTERVIEW_CRITERIA', 'Tư duy Đa luồng & Microservices', true, 2),
(14, 1, 'INTERVIEW_CRITERIA', 'Kỹ năng Giao tiếp & Tiếng Anh', true, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipelines (id, tenant_id, name, active) VALUES
(1, 1, 'Quy trình Tuyển dụng Lập trình viên Standard', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, pipeline_id, name, stage_type, stage_order) VALUES
(1, 1, 'Sơ tuyển CV', 'SCREENING', 1),
(2, 1, 'Phỏng vấn Chuyên môn', 'INTERVIEW', 2),
(3, 1, 'Đề xuất Offer', 'OFFER', 3),
(4, 1, 'Trúng tuyển', 'HIRED', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('catalog_items_id_seq', (SELECT MAX(id) FROM catalog_items));
SELECT setval('pipelines_id_seq', (SELECT MAX(id) FROM pipelines));
SELECT setval('pipeline_stages_id_seq', (SELECT MAX(id) FROM pipeline_stages));

-- Connect to ats_recruitment
\c ats_recruitment;

CREATE TABLE IF NOT EXISTS job_requisitions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    department_id BIGINT NOT NULL,
    hiring_manager_id BIGINT NOT NULL,
    headcount INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_postings (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    requisition_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    employment_type_id BIGINT NOT NULL,
    work_location_id BIGINT NOT NULL,
    pipeline_id BIGINT NOT NULL,
    salary_min NUMERIC(15,2),
    salary_max NUMERIC(15,2),
    description TEXT,
    requirements TEXT,
    benefits TEXT,
    status VARCHAR(50) DEFAULT 'OPEN',
    pipeline_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO job_requisitions (id, tenant_id, title, department_id, hiring_manager_id, headcount, status) VALUES
(1, 1, 'Tuyển dụng Senior Java Developer Q3', 1, 3, 2, 'APPROVED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_postings (id, tenant_id, requisition_id, title, employment_type_id, work_location_id, pipeline_id, salary_min, salary_max, description, requirements, benefits, status) VALUES
(1, 1, 1, 'Senior Java Backend Engineer (Microservices)', 5, 6, 1, 20000000, 35000000, 'Xây dựng hệ thống tuyển dụng ATS Microservices quy mô lớn.', 'Trên 3 năm kinh nghiệm với Java, Spring Boot, RabbitMQ, PostgreSQL.', 'Lương tháng 13, BHXH đầy đủ, Du lịch hàng năm.', 'OPEN')
ON CONFLICT (id) DO NOTHING;

SELECT setval('job_requisitions_id_seq', (SELECT MAX(id) FROM job_requisitions));
SELECT setval('job_postings_id_seq', (SELECT MAX(id) FROM job_postings));

-- Connect to ats_candidate
\c ats_candidate;

CREATE TABLE IF NOT EXISTS candidates (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO candidates (id, tenant_id, user_id, full_name, email, phone) VALUES
(1, 1, 5, 'Nguyễn Văn Ứng Viên', 'candidate.test@test.net', '0901234567')
ON CONFLICT (id) DO NOTHING;

SELECT setval('candidates_id_seq', (SELECT MAX(id) FROM candidates));

-- Connect to ats_application
\c ats_application;

CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    job_posting_id BIGINT NOT NULL,
    candidate_id BIGINT NOT NULL,
    candidate_name_snapshot VARCHAR(255),
    candidate_email_snapshot VARCHAR(255),
    current_stage_id BIGINT NOT NULL,
    current_stage_name VARCHAR(255) NOT NULL,
    current_stage_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    rejection_reason_id BIGINT,
    rejection_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

INSERT INTO applications (id, tenant_id, job_posting_id, candidate_id, candidate_name_snapshot, candidate_email_snapshot, current_stage_id, current_stage_name, current_stage_type, status) VALUES
(1, 1, 1, 1, 'Nguyễn Văn Ứng Viên', 'candidate.test@test.net', 2, 'Phỏng vấn Chuyên môn', 'INTERVIEW', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('applications_id_seq', (SELECT MAX(id) FROM applications));

-- Connect to ats_offer
\c ats_offer;

CREATE TABLE IF NOT EXISTS offers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    application_id BIGINT NOT NULL,
    candidate_name_snapshot VARCHAR(255),
    salary_offered NUMERIC(15,2) NOT NULL,
    contract_type_id BIGINT NOT NULL,
    contract_type_name VARCHAR(255),
    start_date DATE NOT NULL,
    probation_months INT NOT NULL DEFAULT 2,
    benefits TEXT,
    allowance NUMERIC(15,2) DEFAULT 0,
    note TEXT,
    requester_id BIGINT NOT NULL,
    approver_id BIGINT NOT NULL,
    approver_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    response_deadline TIMESTAMP,
    reject_reason TEXT,
    decline_reason_id BIGINT,
    decline_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

INSERT INTO offers (id, tenant_id, application_id, candidate_name_snapshot, salary_offered, contract_type_id, contract_type_name, start_date, probation_months, benefits, allowance, requester_id, approver_id, approver_name, status, response_deadline) VALUES
(1, 1, 1, 'Nguyễn Văn Ứng Viên', 25000000, 8, 'Chính thức 12 tháng', '2026-09-01', 2, 'Bảo hiểm PVI, Laptop Gaming MacBook Pro', 1500000, 2, 3, 'Lê Trưởng Phòng', 'APPROVED', '2026-08-25 18:00:00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('offers_id_seq', (SELECT MAX(id) FROM offers));