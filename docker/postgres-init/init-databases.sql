-- ========================================================
-- ATS MULTI-DATABASE INITIALIZATION & PRE-POPULATED AUTH SEED DATA
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