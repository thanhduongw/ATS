-- ATS single-company database initialization and auth seed data.

CREATE DATABASE ats_auth;
CREATE DATABASE ats_masterdata;
CREATE DATABASE ats_recruitment;
CREATE DATABASE ats_candidate;
CREATE DATABASE ats_interview;
CREATE DATABASE ats_notification;
CREATE DATABASE ats_dashboard;
CREATE DATABASE ats_application;
CREATE DATABASE ats_offer;

\c ats_auth;

CREATE TABLE IF NOT EXISTS company (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),
    description TEXT,
    logo_url VARCHAR(255),
    banner_url VARCHAR(255),
    data_retention_months INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_single_company_profile ON company ((true));

CREATE TABLE IF NOT EXISTS role (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS app_user (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role_id BIGINT NOT NULL,
    department_id BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_user_role FOREIGN KEY (role_id) REFERENCES role(id),
    CONSTRAINT ck_app_user_department_positive CHECK (department_id IS NULL OR department_id > 0)
);

INSERT INTO company (id, name, address, phone)
VALUES (1, 'TechCorp Vietnam', 'TP. Ho Chi Minh', '0909123456')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role (id, name) VALUES
(1, 'COMPANY_ADMIN'),
(2, 'RECRUITER'),
(3, 'HIRING_MANAGER'),
(4, 'CANDIDATE')
ON CONFLICT (id) DO NOTHING;

-- BCrypt hash for Password123!. Candidate accounts are created through /api/auth/register.
INSERT INTO app_user
    (id, email, password_hash, full_name, role_id, department_id, status, email_verified)
VALUES
    (1, 'admin.company@test.net', '$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu', 'Company Admin', 1, NULL, 'ACTIVE', TRUE),
    (2, 'hr.recruiter@test.net', '$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu', 'HR Recruiter', 2, 1, 'ACTIVE', TRUE),
    (3, 'dept.manager@test.net', '$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu', 'Hiring Manager', 3, 1, 'ACTIVE', TRUE)
ON CONFLICT (email) DO NOTHING;

SELECT setval('company_id_seq', (SELECT MAX(id) FROM company));
SELECT setval('role_id_seq', (SELECT MAX(id) FROM role));
SELECT setval('app_user_id_seq', (SELECT MAX(id) FROM app_user));

\c ats_masterdata;

CREATE TABLE IF NOT EXISTS department (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO department (id, name, description, active)
VALUES (1, 'Human Resources', 'Default department for seeded internal users', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('department_id_seq', (SELECT MAX(id) FROM department));
