--
-- PostgreSQL database cluster dump
--

\restrict eJQsQYDBKe7itweS0N05TJet9uhIHSMape8JipyoMI4QC8Yn6WyUUrC0HsFAdNQ

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Drop databases (except postgres and template1)
--

DROP DATABASE IF EXISTS ats_application;
DROP DATABASE IF EXISTS ats_auth;
DROP DATABASE IF EXISTS ats_candidate;
DROP DATABASE IF EXISTS ats_dashboard;
DROP DATABASE IF EXISTS ats_interview;
DROP DATABASE IF EXISTS ats_masterdata;
DROP DATABASE IF EXISTS ats_notification;
DROP DATABASE IF EXISTS ats_offer;
DROP DATABASE IF EXISTS ats_recruitment;
DROP DATABASE IF EXISTS ats_user;




--
-- Drop roles
--

DROP ROLE IF EXISTS ats_user;


--
-- Roles
--

CREATE ROLE ats_user;
ALTER ROLE ats_user WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:jvjYVY9KAtqh6q9EN4QOxg==$TolQz4fzmiZGbm+uXOE2iJLU9NDMwxu+Ko/mCLzxajM=:Kzhw4RcL7duU+DLeqcs4CxpSBFz4GbPqz+R2LCP9XJ4=';

--
-- User Configurations
--








\unrestrict eJQsQYDBKe7itweS0N05TJet9uhIHSMape8JipyoMI4QC8Yn6WyUUrC0HsFAdNQ

--
-- Databases
--

--
-- Database "template1" dump
--

--
-- PostgreSQL database dump
--

\restrict 4vDpv8Gd9AnssBOS7m7gPsxzrstrauxgBKYokuLQlRorBGTksNDGgw73I3eiunh

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

UPDATE pg_catalog.pg_database SET datistemplate = false WHERE datname = 'template1';
DROP DATABASE template1;
--
-- Name: template1; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE template1 WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE template1 OWNER TO ats_user;

\unrestrict 4vDpv8Gd9AnssBOS7m7gPsxzrstrauxgBKYokuLQlRorBGTksNDGgw73I3eiunh
\connect template1
\restrict 4vDpv8Gd9AnssBOS7m7gPsxzrstrauxgBKYokuLQlRorBGTksNDGgw73I3eiunh

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE template1; Type: COMMENT; Schema: -; Owner: ats_user
--

COMMENT ON DATABASE template1 IS 'default template for new databases';


--
-- Name: template1; Type: DATABASE PROPERTIES; Schema: -; Owner: ats_user
--

ALTER DATABASE template1 IS_TEMPLATE = true;


\unrestrict 4vDpv8Gd9AnssBOS7m7gPsxzrstrauxgBKYokuLQlRorBGTksNDGgw73I3eiunh
\connect template1
\restrict 4vDpv8Gd9AnssBOS7m7gPsxzrstrauxgBKYokuLQlRorBGTksNDGgw73I3eiunh

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE template1; Type: ACL; Schema: -; Owner: ats_user
--

REVOKE CONNECT,TEMPORARY ON DATABASE template1 FROM PUBLIC;
GRANT CONNECT ON DATABASE template1 TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 4vDpv8Gd9AnssBOS7m7gPsxzrstrauxgBKYokuLQlRorBGTksNDGgw73I3eiunh

--
-- Database "ats_application" dump
--

--
-- PostgreSQL database dump
--

\restrict SZbdf3O1XH0QFuwlNsY4FymCMAygMmSNIM2a5rKLaORndxH9gxpVIx6vJddA9s3

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_application; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_application WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_application OWNER TO ats_user;

\unrestrict SZbdf3O1XH0QFuwlNsY4FymCMAygMmSNIM2a5rKLaORndxH9gxpVIx6vJddA9s3
\connect ats_application
\restrict SZbdf3O1XH0QFuwlNsY4FymCMAygMmSNIM2a5rKLaORndxH9gxpVIx6vJddA9s3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.application (
    id bigint NOT NULL,
    applied_at timestamp(6) without time zone,
    assigned_recruiter_id bigint,
    candidate_email_snapshot character varying(255),
    candidate_id bigint NOT NULL,
    candidate_name_snapshot character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    current_stage_id bigint NOT NULL,
    current_stage_name character varying(255) NOT NULL,
    current_stage_order integer NOT NULL,
    current_stage_type character varying(255) NOT NULL,
    deleted_at timestamp(6) without time zone,
    job_posting_id bigint NOT NULL,
    note text,
    recruitment_source_id bigint NOT NULL,
    rejection_reason_id bigint,
    resume_url character varying(255),
    tenant_id bigint NOT NULL,
    updated_at timestamp(6) without time zone,
    hired_at timestamp(6) without time zone
);


ALTER TABLE public.application OWNER TO ats_user;

--
-- Name: application_comment; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.application_comment (
    id bigint NOT NULL,
    author_user_id bigint NOT NULL,
    content text NOT NULL,
    created_at timestamp(6) without time zone,
    tenant_id bigint NOT NULL,
    application_id bigint NOT NULL
);


ALTER TABLE public.application_comment OWNER TO ats_user;

--
-- Name: application_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.application_comment ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.application_comment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: application_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.application_history (
    id bigint NOT NULL,
    changed_at timestamp(6) without time zone,
    changed_by_user_id bigint,
    from_stage_name character varying(255),
    note text,
    to_stage_name character varying(255) NOT NULL,
    application_id bigint NOT NULL
);


ALTER TABLE public.application_history OWNER TO ats_user;

--
-- Name: application_history_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.application_history ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.application_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: application_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.application ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.application_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.applications (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    job_posting_id bigint NOT NULL,
    candidate_id bigint NOT NULL,
    candidate_name_snapshot character varying(255),
    candidate_email_snapshot character varying(255),
    current_stage_id bigint NOT NULL,
    current_stage_name character varying(255) NOT NULL,
    current_stage_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    rejection_reason_id bigint,
    rejection_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.applications OWNER TO ats_user;

--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.applications_id_seq OWNER TO ats_user;

--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Data for Name: application; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.application (id, applied_at, assigned_recruiter_id, candidate_email_snapshot, candidate_id, candidate_name_snapshot, created_at, current_stage_id, current_stage_name, current_stage_order, current_stage_type, deleted_at, job_posting_id, note, recruitment_source_id, rejection_reason_id, resume_url, tenant_id, updated_at, hired_at) FROM stdin;
1	2026-08-14 12:28:00.944389	\N	levuthanhduong2004@gmail.com	1	Lê Vũ Thanh Dương	2026-08-14 12:28:00.944389	9	Từ chối	9	REJECTED	\N	1	\N	4	5	https://ats-system-cv-storage.s3.ap-southeast-1.amazonaws.com/cv/1/b369e406-fb35-4893-9357-2152cb980cdf-CV_LeVuThanhDuong.pdf	1	2026-08-14 12:31:52.395655	\N
2	2026-08-14 12:29:43.443233	\N	levuthanhduong2812004@gmail.com	2	Lê Vũ Thanh Dương	2026-08-14 12:29:43.443233	30	Đã tuyển dụng	5	HIRED	\N	1	\N	4	\N	https://ats-system-cv-storage.s3.ap-southeast-1.amazonaws.com/cv/1/25e2909d-e4b9-4aaa-bd97-69239487bd75-CV_LeVuThanhDuong_FullStackDeveloperIntern.pdf	1	2026-08-21 12:54:15.096013	2026-08-21 12:54:15.005798
\.


--
-- Data for Name: application_comment; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.application_comment (id, author_user_id, content, created_at, tenant_id, application_id) FROM stdin;
\.


--
-- Data for Name: application_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.application_history (id, changed_at, changed_by_user_id, from_stage_name, note, to_stage_name, application_id) FROM stdin;
1	2026-08-14 12:28:01.174218	\N	\N	Ứng tuyển qua Career Portal	Ứng tuyển	1
2	2026-08-14 12:29:43.447659	\N	\N	Ứng tuyển qua Career Portal	Ứng tuyển	2
3	2026-08-14 12:31:39.252229	2	Ứng tuyển	Pass sơ tuyển	Sàng lọc CV	2
4	2026-08-14 12:31:52.341113	2	Ứng tuyển	\N	Từ chối	1
5	2026-08-14 12:32:46.160339	2	Sàng lọc CV	Pass sơ tuyển	Sàng lọc HR	2
6	2026-08-21 10:17:58.333879	2	Sàng lọc HR	Chuyển vòng tiếp theo	Phỏng vấn kỹ thuật	2
7	2026-08-21 12:54:15.025796	1	Phỏng vấn kỹ thuật	Chuyển vòng tiếp theo	Đã tuyển dụng	2
\.


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.applications (id, tenant_id, job_posting_id, candidate_id, candidate_name_snapshot, candidate_email_snapshot, current_stage_id, current_stage_name, current_stage_type, status, rejection_reason_id, rejection_note, created_at, updated_at, deleted_at) FROM stdin;
1	1	1	1	Nguyễn Văn Ứng Viên	candidate.test@test.net	2	Phỏng vấn Chuyên môn	INTERVIEW	ACTIVE	\N	\N	2026-08-13 07:59:06.864041	2026-08-13 07:59:06.864041	\N
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 10:36:54.536128	0	t
\.


--
-- Name: application_comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.application_comment_id_seq', 1, false);


--
-- Name: application_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.application_history_id_seq', 13, true);


--
-- Name: application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.application_id_seq', 4, true);


--
-- Name: applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.applications_id_seq', 1, true);


--
-- Name: application_comment application_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.application_comment
    ADD CONSTRAINT application_comment_pkey PRIMARY KEY (id);


--
-- Name: application_history application_history_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.application_history
    ADD CONSTRAINT application_history_pkey PRIMARY KEY (id);


--
-- Name: application application_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.application
    ADD CONSTRAINT application_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: application_history fk3wfh4vnbopvh0hyvcrvupf3d2; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.application_history
    ADD CONSTRAINT fk3wfh4vnbopvh0hyvcrvupf3d2 FOREIGN KEY (application_id) REFERENCES public.application(id);


--
-- Name: application_comment fkil1cps8t7x98nek0b63wx7flt; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.application_comment
    ADD CONSTRAINT fkil1cps8t7x98nek0b63wx7flt FOREIGN KEY (application_id) REFERENCES public.application(id);


--
-- PostgreSQL database dump complete
--

\unrestrict SZbdf3O1XH0QFuwlNsY4FymCMAygMmSNIM2a5rKLaORndxH9gxpVIx6vJddA9s3

--
-- Database "ats_auth" dump
--

--
-- PostgreSQL database dump
--

\restrict Ekfj04KoS21FqiktnNpnxBh5EcmMRocGKKlpQ3cjKAgCfYi2D2TlH8nRYxI29AY

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_auth; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_auth WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_auth OWNER TO ats_user;

\unrestrict Ekfj04KoS21FqiktnNpnxBh5EcmMRocGKKlpQ3cjKAgCfYi2D2TlH8nRYxI29AY
\connect ats_auth
\restrict Ekfj04KoS21FqiktnNpnxBh5EcmMRocGKKlpQ3cjKAgCfYi2D2TlH8nRYxI29AY

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_user; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.app_user (
    id bigint NOT NULL,
    tenant_id bigint,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role_id bigint NOT NULL,
    status character varying(255) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    department_id bigint,
    email_verified boolean DEFAULT false NOT NULL,
    phone character varying(255),
    updated_at timestamp(6) without time zone
);


ALTER TABLE public.app_user OWNER TO ats_user;

--
-- Name: app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.app_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_user_id_seq OWNER TO ats_user;

--
-- Name: app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.app_user_id_seq OWNED BY public.app_user.id;


--
-- Name: company; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.company (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(255),
    phone character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    banner_url character varying(255),
    data_retention_months integer,
    description text,
    logo_url character varying(255)
);


ALTER TABLE public.company OWNER TO ats_user;

--
-- Name: company_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.company_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_id_seq OWNER TO ats_user;

--
-- Name: company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.company_id_seq OWNED BY public.company.id;


--
-- Name: email_verification; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.email_verification (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    expiry_date timestamp(6) without time zone NOT NULL,
    otp_code character varying(255) NOT NULL,
    tenant_id bigint,
    verified boolean NOT NULL
);


ALTER TABLE public.email_verification OWNER TO ats_user;

--
-- Name: email_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.email_verification ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.email_verification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.password_reset_tokens (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    expiry_date timestamp(6) without time zone NOT NULL,
    otp_code character varying(255) NOT NULL,
    tenant_id bigint NOT NULL,
    used boolean NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO ats_user;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.password_reset_tokens ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permission; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.permission (
    id bigint NOT NULL,
    code character varying(255),
    description character varying(255)
);


ALTER TABLE public.permission OWNER TO ats_user;

--
-- Name: permission_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: refresh_token; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.refresh_token (
    id bigint NOT NULL,
    expiry_date timestamp(6) without time zone,
    revoked boolean NOT NULL,
    token character varying(255) NOT NULL,
    user_id bigint NOT NULL
);


ALTER TABLE public.refresh_token OWNER TO ats_user;

--
-- Name: refresh_token_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.refresh_token ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.refresh_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: role; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.role (
    id bigint NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.role OWNER TO ats_user;

--
-- Name: role_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_id_seq OWNER TO ats_user;

--
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.role_id_seq OWNED BY public.role.id;


--
-- Name: role_permission; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.role_permission (
    id bigint NOT NULL,
    permission_id bigint NOT NULL,
    role_id bigint NOT NULL
);


ALTER TABLE public.role_permission OWNER TO ats_user;

--
-- Name: role_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.role_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.role_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tenant; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.tenant (
    id bigint NOT NULL,
    tenant_code character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenant OWNER TO ats_user;

--
-- Name: tenant_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.tenant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_id_seq OWNER TO ats_user;

--
-- Name: tenant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.tenant_id_seq OWNED BY public.tenant.id;


--
-- Name: app_user id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.app_user ALTER COLUMN id SET DEFAULT nextval('public.app_user_id_seq'::regclass);


--
-- Name: company id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.company ALTER COLUMN id SET DEFAULT nextval('public.company_id_seq'::regclass);


--
-- Name: role id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.role ALTER COLUMN id SET DEFAULT nextval('public.role_id_seq'::regclass);


--
-- Name: tenant id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.tenant ALTER COLUMN id SET DEFAULT nextval('public.tenant_id_seq'::regclass);


--
-- Data for Name: app_user; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.app_user (id, tenant_id, email, password_hash, full_name, role_id, status, created_at, department_id, email_verified, phone, updated_at) FROM stdin;
1	1	admin.company@test.net	$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu	Nguyễn Quản Trị	1	ACTIVE	2026-08-13 07:59:06.426495	\N	f	\N	\N
2	1	hr.recruiter@test.net	$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu	Trần Tuyển Dụng	2	ACTIVE	2026-08-13 07:59:06.426495	\N	f	\N	\N
3	1	dept.manager@test.net	$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu	Lê Trưởng Phòng	3	ACTIVE	2026-08-13 07:59:06.426495	\N	f	\N	\N
4	1	candidate.test@test.net	$2a$10$kTAaqCGu7GXtmozdlwjyG.JrGorYCKvPSLvHd/70QqMrsR2NBJ7Xu	Nguyễn Văn Ứng Viên	4	ACTIVE	2026-08-13 07:59:06.426495	\N	f	\N	\N
6	3	levuthanhduong2004@gmail.com	$2a$10$JJNOVYY4eUwAc1PIf69TH.3B3ZI0wUUWMxo7riGXLN9UypO3EXfbi	Thanh Dương	1	ACTIVE	2026-08-20 23:20:50.627056	\N	f	\N	\N
\.


--
-- Data for Name: company; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.company (id, tenant_id, name, address, phone, created_at, banner_url, data_retention_months, description, logo_url) FROM stdin;
1	1	TechCorp Vietnam	TP. Hồ Chí Minh	0909123456	2026-08-13 07:59:06.421623	\N	\N	\N	\N
3	3	Sabenico	\N	\N	2026-08-20 23:20:50.48518	\N	\N	\N	\N
\.


--
-- Data for Name: email_verification; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.email_verification (id, email, expiry_date, otp_code, tenant_id, verified) FROM stdin;
3	levuthanhduong2004@gmail.com	2026-08-20 23:30:50.634795	653426	3	f
4	levuthanhduong2004@gmail.com	2026-08-20 23:31:41.14755	898684	3	t
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 07:51:29.104088	0	t
2	1	prepare single company app user	SQL	V1__prepare_single_company_app_user.sql	-1408029392	ats_user	2026-08-28 07:51:31.61954	2242	t
3	2	single company email verification	SQL	V2__single_company_email_verification.sql	1563232356	ats_user	2026-08-28 07:51:34.518097	336	t
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.password_reset_tokens (id, email, expiry_date, otp_code, tenant_id, used) FROM stdin;
1	levuthanhduong2004@gmail.com	2026-08-20 23:41:22.653168	280666	3	t
\.


--
-- Data for Name: permission; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.permission (id, code, description) FROM stdin;
\.


--
-- Data for Name: refresh_token; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.refresh_token (id, expiry_date, revoked, token, user_id) FROM stdin;
1	2026-08-20 15:02:35.687448	f	bb89341c-c327-46e5-824c-951b51dcb490	1
2	2026-08-20 16:38:43.441332	f	84bb0f45-0402-4f2c-9928-068c05e36bd0	1
3	2026-08-20 16:40:14.763977	f	a6fd06b4-09a8-40d0-b31b-88d696a4c953	4
4	2026-08-20 16:40:35.073397	f	8da783ce-1573-4657-88f5-d4dacc3e9156	1
5	2026-08-20 16:41:14.890232	f	0bb273e3-6f5d-4d2d-82b5-701df1959a8c	3
8	2026-08-20 17:10:38.729662	f	08f86213-0db4-4159-89e9-4abdd9948c67	2
11	2026-08-20 17:10:38.731111	f	5db459df-2456-45ca-9713-a44d474ba751	2
7	2026-08-20 17:10:38.729662	f	87ad82b5-c77c-417d-9da0-99395c6e1ee2	2
12	2026-08-20 17:10:38.731111	f	210b5a3a-a1bd-4216-af20-eee413dd6a82	2
10	2026-08-20 17:10:38.729662	f	0ca6100e-6183-4208-b89c-a51dec4e9915	2
78	2026-08-20 22:51:35.219656	f	a8f89f7c-2da9-4e12-8552-c1f574c081d5	1
76	2026-08-20 22:51:35.219656	f	9ee748cb-ea83-4a02-9824-55ef0e8616b4	1
77	2026-08-20 22:51:35.219656	f	a5c36172-d528-44aa-b4e7-649748e32d12	1
79	2026-08-20 22:51:35.219656	f	aadb28ef-7639-4d62-b6d4-bc29713cc4f8	1
6	2026-08-20 16:41:42.135927	t	f7ae1439-baf1-46ba-b361-2dd0cda34950	2
15	2026-08-20 17:50:57.982	f	ea084b66-8c68-406e-a1ae-e43a52f0893f	2
14	2026-08-20 17:50:57.982	f	cb634a4e-3358-45f3-982a-98df58d66c51	2
16	2026-08-20 17:50:57.982	f	4bb44ee3-af5f-4089-af62-01d0a483abe1	2
18	2026-08-20 17:50:57.982	f	c31fbf05-f0a2-4e91-8192-aa91dd5009fe	2
17	2026-08-20 17:50:57.982	f	7b461759-9ff2-4bb3-83ea-da73aadd6b75	2
43	2026-08-20 19:38:23.402561	t	6887be5b-a7c7-480a-be7b-c08689d66343	1
52	2026-08-20 20:49:58.841847	f	70ed3d30-9126-4ffe-9451-8a3f15b94943	1
51	2026-08-20 20:49:58.843516	f	b28b90d3-eb4a-4f95-9d94-27e872afd612	1
53	2026-08-20 20:49:58.840837	f	67d35ef5-0f72-4039-b06f-d899839f6bb1	1
54	2026-08-20 20:49:58.840837	f	e9d655c6-beee-49d0-a22f-93fb7079f405	1
9	2026-08-20 17:10:38.729662	t	eeb74d35-0887-4d99-9672-f6c7df45516b	2
19	2026-08-20 18:11:20.612357	f	841fbff2-8e60-44ca-97cb-8547abc5f04e	2
20	2026-08-20 18:11:20.622252	f	e3099121-e174-47c0-939c-78426273a0af	2
21	2026-08-20 18:11:20.610338	f	726020be-0846-4879-bb44-da05e30c3b80	2
22	2026-08-20 18:11:20.611356	f	3a5ff03b-81b9-41d3-b92d-49bef18139df	2
24	2026-08-20 18:11:20.622252	f	a7f01a39-944a-42de-bfeb-9a2140ddc764	2
50	2026-08-20 20:49:58.840837	f	7702e48a-117a-45d6-8d92-b9581d4c9a2d	1
56	2026-08-20 21:52:48.855626	t	ef6e069e-ad67-44b9-8217-18f1a809d5d1	1
69	2026-08-20 22:28:38.384627	f	11c1bb18-9630-41d9-97ef-df1f9969ab13	1
13	2026-08-20 17:50:57.982	t	98d7b601-ce81-4c1c-ba8c-23f636745f3f	2
25	2026-08-20 18:29:59.525513	f	c501a482-24e9-43db-9a09-fecad657fef7	2
26	2026-08-20 18:29:59.527095	f	4ea02cb4-2cc0-4fae-92c3-01aac96345e0	2
28	2026-08-20 18:29:59.525513	f	9b7e7872-5fe8-455a-9c84-d5f1de769ea4	2
29	2026-08-20 18:29:59.525513	f	601ff1bf-91f2-40ea-9b09-1f983f8ddcfb	2
30	2026-08-20 18:29:59.527095	f	1064b7ad-1fca-4d88-b945-5fb4a3a6bf2f	2
71	2026-08-20 22:28:38.384627	f	347c0323-e2af-4c8e-800c-da9fcfec52c2	1
70	2026-08-20 22:28:38.384627	f	cbc934fa-a439-46c8-b421-a1d99545716a	1
44	2026-08-20 20:04:16.241555	t	540c2d9a-0152-430a-ab4f-8edae2100a9d	1
58	2026-08-20 21:52:48.855626	f	fc0e7f87-7f8d-4f62-95f7-f822f85e313c	1
23	2026-08-20 18:11:20.622252	t	e39eee22-b212-413e-9de7-798a13934064	2
34	2026-08-20 19:17:24.026871	f	94eb9d19-4ba4-4187-a6f0-32215eef4f82	2
33	2026-08-20 19:17:24.001115	f	6961adbb-2ec0-47b5-b122-e211d38cedcc	2
35	2026-08-20 19:17:23.955379	f	d08de142-7ec6-429b-afce-643e766ce18d	2
31	2026-08-20 19:17:23.955379	f	e1fcac80-7ddc-4ecc-8e10-c4a5d5cd46bb	2
32	2026-08-20 19:17:23.955379	f	c39f116c-d378-4b5f-a07b-2f6e1ad532ad	2
36	2026-08-20 19:17:23.96491	f	48722f31-c990-43a2-b1b1-79a4f1464fe6	2
57	2026-08-20 21:52:48.855626	f	f743ea79-abc8-445f-8883-cca85beb6348	1
59	2026-08-20 21:52:48.855626	f	d57e4793-e454-4105-a3c8-419574a611d1	1
60	2026-08-20 21:52:48.855626	f	fe310959-cccc-4679-851d-08f48e1b937a	1
61	2026-08-20 21:52:48.855626	f	aa3bd117-9362-4a2a-8fe8-6a6eaa4c9fb3	1
72	2026-08-20 22:28:38.384627	f	2f1122b7-64dc-4743-8294-1c740c9cd34e	1
27	2026-08-20 18:29:59.525513	t	8ad3a74a-6f7f-458e-a85d-f43287e16fe3	2
38	2026-08-20 19:38:23.471467	f	04d58719-dc99-4a86-83d7-3f0ba5daeae8	1
41	2026-08-20 19:38:23.744198	f	5507ab38-748d-42e3-82d3-c6a7953d8d79	1
42	2026-08-20 19:38:23.404078	f	2218f9c8-0d8b-40a9-b2c8-b12cef529892	1
40	2026-08-20 19:38:23.470467	f	8f2a838d-5a5f-4223-b5b9-9a3244bebca7	1
39	2026-08-20 19:38:23.404078	f	f50f02ed-6c6e-4b09-bbeb-f0ed6894ee72	1
73	2026-08-20 22:28:38.384627	f	b8470ace-4a09-4448-9eb8-5963ae180a65	1
74	2026-08-20 22:51:35.219656	f	c551b822-0f69-4bb1-a222-3f47059ef255	1
82	2026-08-20 23:16:57.443533	f	d78c80c5-d815-4422-84af-f9d63d529d78	1
55	2026-08-20 20:49:58.840837	t	bb9db235-c6e1-4df1-8dff-cb92b43bf7a4	1
37	2026-08-20 19:22:07.107834	t	5f188fb3-ce58-443c-9a75-c7c7cbd8b0d7	1
45	2026-08-20 20:04:16.245399	f	98415b5d-47ae-4116-a413-02686faba82f	1
46	2026-08-20 20:04:16.242075	f	0738e0aa-ca49-4aa2-928f-60d66209c398	1
47	2026-08-20 20:04:16.242075	f	6a55d591-e468-4789-b59c-a4451c8f63ab	1
48	2026-08-20 20:04:16.241555	f	ba49b284-bbd1-491d-b748-d23f433e6366	1
49	2026-08-20 20:04:16.241555	f	0c2fa90c-8425-474a-ad6b-facd09a59625	1
63	2026-08-20 22:09:18.720068	f	3cbdde75-fe8d-40c9-a5e5-84e2daaabd7e	1
62	2026-08-20 22:09:18.720775	f	deff3839-c80d-4b04-a63a-70a7a16b3e48	1
67	2026-08-20 22:09:18.720068	f	54505f3a-e16a-4972-a0c5-28e6c9eee70e	1
64	2026-08-20 22:09:18.720775	f	9e115dbb-ad84-46c3-b49d-81900bebd310	1
65	2026-08-20 22:09:18.720068	f	3a06f97e-340f-4f7d-9dbb-41483a2a4772	1
80	2026-08-20 23:16:57.443533	f	0567c8e8-4c16-4ee7-bfbb-4c020faab765	1
83	2026-08-20 23:16:57.443533	f	44e64de4-0ec4-4a06-a569-7f840aba0058	1
66	2026-08-20 22:09:18.720068	t	a14d16fe-47d7-4e0d-83fa-ba9cf2ba0726	1
84	2026-08-20 23:16:57.448524	f	034d81c6-4dac-4662-af7c-abec88b884ac	1
68	2026-08-20 22:28:38.384627	t	1b1a1e8f-3dd9-4f93-a36f-f23650a43ef1	1
85	2026-08-20 23:16:57.447995	f	45d09fe7-e97f-41ae-8fa7-af170ac82709	1
75	2026-08-20 22:51:35.219656	t	b9cb649c-b0de-49e7-981f-d896eea20828	1
91	2026-08-20 23:45:05.123235	f	50967d9e-caa7-4583-9cf0-77ccde93e253	1
86	2026-08-20 23:45:05.123235	f	2955164b-d2a5-4f68-bb9e-25e43d51763f	1
87	2026-08-20 23:45:05.123235	f	03aa46b3-bc8b-495c-88f3-aa6ca2bedf69	1
90	2026-08-20 23:45:05.124831	f	4ffac761-393c-45b6-86e1-2d8672bfcb27	1
89	2026-08-20 23:45:05.123235	f	598cbf78-0d98-49ec-a7a7-1e596020599c	1
81	2026-08-20 23:16:57.443533	t	f383784f-0595-4c01-b70b-422ca907cfa0	1
92	2026-08-21 00:06:39.196103	f	5a57aafd-c120-41e6-94ca-b24a0be519fc	1
95	2026-08-21 00:06:39.194084	f	b8504e95-76d9-4519-ab63-c77fced6247e	1
94	2026-08-21 00:06:39.194084	f	9a3eadff-fa2a-42a1-b917-72099240ffd9	1
97	2026-08-21 00:06:39.194084	f	62585bd0-7861-4eca-b7ca-0993469735db	1
96	2026-08-21 00:06:39.19558	f	7ea1824e-276a-40df-b7c3-1cde4306e719	1
131	2026-08-26 11:02:02.050228	t	9dd0f7a5-c195-4918-8c47-a28d3713169f	2
132	2026-08-26 11:23:17.692339	t	8413c707-46da-47ac-9958-b7e331aa0b2c	2
133	2026-08-26 11:40:20.994014	t	4cbdd24e-5144-43c7-b1a7-9b87df934594	2
88	2026-08-20 23:45:05.127362	t	0d8ab599-75fc-4dcb-96f1-696eb895a2a2	1
98	2026-08-21 01:09:14.077336	f	394b5e9a-ffd8-4e08-89ad-92063a7990c4	1
103	2026-08-21 01:09:14.077336	f	c89242ed-68c1-4ec6-8425-41192bd905fe	1
99	2026-08-21 01:09:14.077336	f	afb7da47-ce9b-4e3f-bd01-23623683f93b	1
100	2026-08-21 01:09:14.077336	f	5df423a6-45af-4ffc-a5d1-e106c6a92f9f	1
101	2026-08-21 01:09:14.077336	f	1e1edb55-0b25-4ad3-9e6c-856402bdb128	1
134	2026-08-26 12:12:05.379731	t	4f7b68be-e726-44af-a242-7d4afc0e6a7a	2
136	2026-08-26 22:24:08.02108	f	243d5b80-b992-4523-999c-e61e0bac05e5	2
135	2026-08-26 12:31:38.427779	t	c4d6f290-fc9b-48a1-b839-4e099a38a04c	2
93	2026-08-21 00:06:39.194084	t	f9bf22eb-485b-43b3-b60c-da885813f7b8	1
102	2026-08-21 01:09:14.077336	t	9645912f-ee24-4e43-93c4-40c776494d5f	1
104	2026-08-21 01:33:21.639492	t	9703607c-47d8-41be-8648-7224d8ce4b4f	1
105	2026-08-21 02:34:11.833155	t	820e6a86-eb08-456f-b245-ddbb3e2077f6	1
106	2026-08-21 02:51:46.673483	t	9edcbb15-bfe6-41a2-9f74-4ec017c9ec1d	1
108	2026-08-21 10:52:49.270295	f	8b2121cc-7215-498a-9f54-d4a7af4c2d90	1
107	2026-08-21 03:10:53.804538	t	6a72a295-b9c8-470c-9a51-6e61b6650a3d	1
110	2026-08-21 11:08:46.703611	f	bf7a096a-5b8c-407a-b70f-d4a99487fb0a	1
109	2026-08-21 10:53:19.255159	t	9421d961-b32b-45c2-9072-6e8756d919bc	1
111	2026-08-21 11:15:29.257065	f	73dd97c4-87ff-456b-a6a5-b0ea3549b28d	2
112	2026-08-21 11:16:05.550725	t	f53565fc-3669-4efc-aaaf-4e9e44946e27	3
113	2026-08-21 11:26:54.700893	t	c46088ee-31d5-447d-abd1-16ad3fa0de44	2
114	2026-08-21 11:35:59.763944	t	5b535765-f5ef-4571-9312-2e63b46f6b43	3
116	2026-08-21 12:02:12.261194	t	e7851ace-efdf-419a-bdf1-0fd85dfcfa9f	3
118	2026-08-21 12:30:55.848113	f	96ae68cd-c0e3-48aa-b820-4696c473e520	2
115	2026-08-21 11:43:53.100727	t	f981f0db-c391-4a43-8394-7b620c9131cd	2
117	2026-08-21 12:30:03.743096	t	f4816fcc-bf9e-4d46-bd82-a22d3adb2ce2	3
119	2026-08-21 12:47:19.781651	t	878cf1a2-e11e-40d9-9730-57fee5740702	3
120	2026-08-21 12:47:45.865989	t	dcd8d3db-b789-4a56-a71e-022d6adb4ed4	2
121	2026-08-21 13:03:31.883228	t	9e30d445-6ff5-43c6-9205-4d0f74e4e51d	3
124	2026-08-21 13:20:35.725977	f	1591380c-07da-4859-a062-1f3714dee46c	2
122	2026-08-21 13:04:20.52106	t	24d2cb54-e397-4b7c-b423-77d87eb18128	2
125	2026-08-21 15:15:25.243578	f	605495a3-ce2d-4dc2-9451-dd9a516e4d55	3
123	2026-08-21 13:20:32.982772	t	a3b5726a-631e-4ac1-bf64-854d4fdc4236	3
126	2026-08-21 15:16:43.040723	f	1fc2344a-cfb7-4245-8b13-eaadf9877156	3
127	2026-08-21 15:16:53.163844	f	467826d7-a873-47c5-8e4c-935781c3c04e	2
128	2026-08-21 15:17:52.460141	f	67e5c5bd-2158-436c-850b-9f00ee94c8be	3
129	2026-08-21 15:59:10.312468	f	eee56ca7-229e-4e9b-b78c-c61ea7b8e7e5	2
130	2026-08-26 10:52:08.206519	f	4efe2a79-5fb6-40ce-9fb6-df48b50ba68f	2
137	2026-08-26 22:24:18.467212	t	583ee6cf-b007-49cc-a0ef-334817258438	2
138	2026-08-26 22:40:56.252662	t	5f383cbc-ef5a-41e1-9f4d-4aa98999121d	2
140	2026-08-26 23:18:49.522623	f	f53e3bba-0061-4469-bfba-59948bf37473	2
139	2026-08-26 22:56:31.225721	t	82545991-c9fa-4e4e-ab18-3ee9a387e66b	2
142	2026-08-26 23:37:26.214023	f	9acb325e-1a3c-491d-a02c-d96742817e57	2
141	2026-08-26 23:18:57.091319	t	380cb3fc-8c9e-423f-859d-d456b43a1acd	2
144	2026-08-27 22:54:34.240254	f	9317ccf9-4207-411f-9beb-a39a4b403936	2
143	2026-08-27 22:26:49.262984	t	95ba4f38-6036-4a47-ae63-20b40a8c98c2	2
145	2026-08-27 22:54:45.976294	f	85da60ea-0387-4e11-af1e-1de6c146bae0	2
146	2026-08-27 23:22:15.330415	f	73ee81bd-02a6-418a-9f6a-0a90b32c6c05	6
147	2026-08-27 23:26:43.238504	f	1f886949-7d91-4238-a3fc-9f811e4b1a0a	6
148	2026-08-27 23:27:08.30539	t	c724bc77-7e69-46cc-9f8e-e2e30b30492b	2
149	2026-08-27 23:57:29.509733	t	cd236e34-c6f9-49ca-9ed4-f3e389685ccb	2
150	2026-08-28 00:17:28.212776	t	80fdf844-8f2d-4af7-b827-a098cac06062	2
151	2026-08-28 00:36:18.322801	t	52e6fbe0-d33b-472b-b593-e731556133c8	2
153	2026-08-28 01:23:46.532689	f	ad668153-5762-410c-b1c2-fc81755c0158	2
154	2026-08-28 01:24:09.750788	f	0d48e74e-c4b8-465f-b0a0-3e782cde9515	2
155	2026-08-28 01:24:30.518972	f	bddebee1-a2f1-468a-a71c-44c895205ae3	3
156	2026-08-28 01:31:56.866654	f	c04a5ed5-146a-4a0f-a5fe-8b5479458266	2
152	2026-08-28 01:11:50.893179	t	ae7d7046-7440-4f10-9c8c-206d9e9218b9	2
158	2026-08-28 01:48:56.69376	f	294d08cc-13eb-4f87-9e8f-cebf13568f45	3
157	2026-08-28 01:32:40.752073	t	e2e63375-4488-466d-8859-ea17877c62db	3
160	2026-08-28 02:14:43.954195	f	858790ee-4c8a-40da-9938-48323dc9efea	2
159	2026-08-28 01:49:07.820028	t	7d1d0351-0b9b-4449-8690-0feac2f1ce36	2
161	2026-08-28 02:18:51.332361	f	c3839429-8ed7-444e-8300-c8a8163fb3cd	3
162	2026-08-28 02:28:35.067374	f	b2cd678a-e477-4154-9fdc-25b4ec47c65d	2
163	2026-08-28 02:39:40.266977	f	a9945ad1-8a0d-42b7-9ff4-4c865db05f8a	3
164	2026-08-28 02:50:38.490072	f	b48ad1e2-74de-486d-9aa9-5c5d32d027c5	2
165	2026-08-28 02:55:49.073186	f	0ca1ca92-a2a9-41a0-a229-c5c913d312bf	6
166	2026-08-28 02:57:26.051816	f	667fe713-5e83-42f4-a680-74d961ab8308	2
167	2026-08-28 02:58:32.719389	f	422d0a93-f556-44fb-9155-c989c9bfbba2	3
168	2026-08-28 02:59:12.193363	f	afe1aa30-20e6-4495-9ec6-12f8c3d93e1d	2
169	2026-08-28 03:12:06.02864	t	e3d74ff3-0c22-4b08-a382-f79131ea1fd7	3
170	2026-08-28 03:13:48.583818	f	b9e3c6b0-8e7e-4549-82ad-ad428d63bf04	3
171	2026-08-28 03:13:59.836182	f	2ad62aa3-a106-4da0-9130-0a3f6e28d187	2
172	2026-08-28 09:25:23.846381	f	a3bdc5d4-30d4-45b9-a5de-4fd40cd2a110	3
173	2026-08-28 09:25:32.235392	f	8982f457-64ae-4842-af06-447f73067bc3	3
175	2026-08-28 09:43:25.333899	f	db859da7-9c32-4314-8b54-2c3e675d524b	2
174	2026-08-28 09:25:50.347698	t	7233406a-4e5e-4f15-a678-808d742e9ca3	2
176	2026-08-28 09:47:11.24497	f	207c3c0d-d70f-43ed-bbbe-8c5934faf08a	2
177	2026-08-28 10:02:25.723764	f	63b1f1b1-d2c6-42b7-ad26-c72047aedb53	2
178	2026-08-28 10:02:34.516151	f	88fb7bb8-6c3c-44ba-a556-f246f6e2e4d2	2
179	2026-08-28 10:02:40.599496	f	afe90bd2-3fc0-4c3b-b783-37866bb3c7be	2
180	2026-08-28 10:15:17.967801	f	bc787141-f3a9-479b-a7a4-1acef447895d	2
181	2026-08-28 10:19:34.828875	f	b42d2c23-ab4b-4468-953f-fc49b9d23bcf	3
182	2026-08-28 10:30:00.311049	f	2b7fea6d-93a6-4ab5-a7f1-27fc50f9e77a	3
183	2026-08-28 10:30:17.297077	f	f6f1abdb-8987-4c83-a284-71fe8f0f1d23	2
184	2026-08-28 10:32:52.481786	f	b0c24d77-f71a-4e0e-baf0-a8d85241ff09	3
185	2026-08-28 10:33:38.33494	t	0fa61529-c789-479e-ba30-5ae8cf26ec67	2
187	2026-08-28 11:05:17.942763	f	0ac25d21-08e4-4014-9d76-9c905405471f	2
186	2026-08-28 10:49:09.880799	t	b06951e3-b359-47e8-bd49-3f8a1d551c62	2
188	2026-08-28 11:05:24.388583	f	7c37b74b-f88a-4acd-8eea-68da54abbb9c	2
189	2026-08-28 11:08:16.778631	f	423c8bfd-a1c3-478a-9c92-26b18ef7c473	3
190	2026-08-28 11:11:16.974991	t	fb46142c-7613-426c-9753-0c09a9e73488	2
192	2026-08-28 11:57:03.97048	f	46ce0534-0d69-40ed-9de1-359bbfb419a4	2
191	2026-08-28 11:26:17.458979	t	27362f6f-f267-429e-86df-9448eb954ba5	2
193	2026-08-28 12:14:00.531875	f	91696ab0-d491-4e0b-b62e-32da38d7637d	3
194	2026-08-28 12:16:08.505982	f	4d56b2d2-c584-4013-aff3-d1d4894351c9	2
195	2026-08-28 12:22:31.152071	f	31f67844-8717-43fe-8f72-6f233a209341	3
196	2026-08-28 12:35:20.349103	f	e4bd7484-211d-45dd-b817-86d17f2431c8	2
197	2026-08-28 12:43:06.983406	f	30196188-a74e-49e7-a5f2-e124b26914d1	3
198	2026-08-28 12:52:24.632834	f	53fa8862-5817-4cdb-abf1-f57101680c7a	2
200	2026-08-28 13:00:29.844436	f	141e5ccd-fd31-4cdb-9827-4f552f0b85e8	2
201	2026-08-28 13:01:21.960304	f	c38455bc-5e80-4db9-af84-3617c9817f6a	2
202	2026-08-28 13:02:24.481423	f	1491c064-7bd4-412a-89b5-379fb37a97b6	3
203	2026-08-28 13:08:19.70192	f	440aec35-dc25-4fe1-9628-93518a1bf107	2
204	2026-08-28 13:09:19.51892	f	2ae0d278-29a3-40da-9f5b-e52992c12c35	3
205	2026-08-28 13:10:42.154723	f	f5fb489a-a6ab-4514-8ba7-4e3ca11ef830	1
199	2026-08-28 12:53:28.501793	t	d89b8f33-ba16-424f-9ce8-5190bf388125	1
206	2026-08-28 13:13:54.757067	f	b909bef9-b866-4cbf-85c4-1b0c695c2ea8	3
207	2026-08-28 13:15:13.224763	f	0ff762bd-1640-4f61-9e2c-147a6c091eab	2
208	2026-08-28 13:17:12.357729	f	01f7d437-0a80-467d-9cba-7a97c4ae358d	3
209	2026-08-28 13:27:09.015961	f	95950088-3e40-4e83-a6fc-ff0c7686091c	2
243	2026-08-28 14:22:41.660541	f	967ae33f-dd99-462f-9107-eedce21435d4	3
210	2026-08-28 13:30:50.148347	t	b67c6acf-cb9b-421a-8c76-5f2fffeaa439	3
244	2026-08-28 14:22:54.273684	f	91ff34aa-15b7-4ee0-b790-1b46b0c5f4d7	2
246	2026-08-28 14:26:12.530329	t	a7796334-1ff8-4119-832a-e7708234573b	2
247	2026-08-28 14:42:16.238694	t	c1420845-f0a4-40a6-8074-781fe5df3cc2	2
249	2026-08-28 14:57:52.922073	f	c94e967f-1dc8-4c57-907b-bba68780fd0a	3
245	2026-08-28 14:24:53.258893	t	54b6bbbd-07e4-4271-a04f-99b48eb37b12	3
248	2026-08-28 14:57:46.837942	t	a86e5c0e-e471-4c3a-861c-b5e40653938e	2
250	2026-09-02 22:59:48.4074	t	1aefc29b-6934-4b5c-8483-c9e2c20798d0	2
252	2026-09-02 23:44:09.510751	f	0d692780-8a48-4f06-80ab-52f0e4cdef06	2
251	2026-09-02 23:24:14.92951	t	dd845a7a-0a17-4f5b-9112-07eb8fa02d8d	2
253	2026-09-03 00:16:58.229395	t	2553e80e-8db7-4b83-812d-aa08d89551d1	2
255	2026-09-03 00:44:46.159487	f	a1d8b8f4-53a2-4e4b-a932-feab55fbeed8	2
256	2026-09-03 00:51:13.795453	f	c6018a80-7808-4cde-87d7-3d85c151d7ab	2
257	2026-09-03 00:54:39.884383	f	53f19bcc-f949-4346-b0f6-865528233246	2
258	2026-09-03 00:56:05.866141	f	bf65294e-6cd3-4286-aa0b-ca304e068bd7	2
254	2026-09-03 00:32:06.05364	t	9b13335d-9960-4f07-ad14-d82a59d16451	2
260	2026-09-03 01:29:28.27984	f	fa79e1e2-0c85-4f45-99ee-cb205b3f03e4	2
261	2026-09-03 01:30:51.654418	f	0c29dba8-479d-4ffa-af7a-7139e3b35939	2
262	2026-09-03 01:31:24.868792	f	4349f5da-aba6-4509-958d-7654929aac0b	2
263	2026-09-03 01:31:52.963981	f	c6f74c24-b929-49c4-b229-37373346a6a6	2
264	2026-09-03 01:32:30.671967	f	2f71f03d-61c9-49f0-81d6-08d9750f447a	2
265	2026-09-03 01:32:58.125714	f	65cd2b75-069b-4832-89bc-ff0a89598418	2
266	2026-09-03 01:33:24.595107	f	53ba3037-0bff-4485-bdd0-12ce6f5f30cb	2
267	2026-09-03 01:34:04.375305	f	d65b7631-b522-42c1-b562-e606473d55f1	2
268	2026-09-03 01:34:39.22121	f	b0db5665-452c-4625-ad04-4e1c2358d017	2
269	2026-09-03 01:35:02.539284	f	6f069fa8-3baf-4d7f-ba62-16ed140ea843	2
270	2026-09-03 01:35:41.792896	f	e97fb7ec-b97c-4a0b-84dd-e24e0cc82920	2
271	2026-09-03 01:36:25.810731	f	d1b83b96-df2e-4283-bb40-1d75420c6ee5	2
272	2026-09-03 01:37:09.225369	f	fec641e8-00dd-43fb-99fc-33c1110c93bd	2
273	2026-09-03 01:37:35.919198	f	d6d226bb-f386-487b-88f0-dbbda756f30e	2
259	2026-09-03 01:04:59.449056	t	6e3b10ed-e2cc-4039-ad40-7065ec75383f	2
275	2026-09-03 01:38:03.404123	f	d824584f-e2a5-4ea4-ad61-7ba7f1318d62	2
276	2026-09-03 01:42:14.098082	f	0e6efb12-0d99-44ad-bfd4-fd6100f67996	2
277	2026-09-03 01:44:29.189859	f	81e002b6-d944-4f0d-b665-f0364ae741a0	2
278	2026-09-03 01:50:20.555257	f	979dd0f3-bf6f-47d8-9177-ed299a117d85	3
279	2026-09-03 01:50:47.797919	f	c3f043fb-42b7-4302-b159-2bf22c7c5cdb	2
280	2026-09-03 01:52:05.313267	f	58ce868f-48f5-42a4-a531-816f736d77cd	1
274	2026-09-03 01:37:53.678507	t	74dbba75-c8ae-4fb7-a043-7cb741cc262e	2
282	2026-09-03 01:54:32.419925	f	1ee7060d-5133-4912-883f-027e53801d87	2
281	2026-09-03 01:53:26.314088	t	a4fb0625-9c10-4ffc-9092-0e933244265a	2
283	2026-09-03 08:52:04.053706	t	e4905afc-638c-4196-b168-bffb7b8cc757	2
285	2026-09-03 09:38:45.693383	f	ae8984d1-eb6c-4c70-ab90-e64b17f39c7f	2
284	2026-09-03 09:10:34.71484	t	f78d55a8-85af-4492-a4e7-a18144c69174	2
287	2026-09-03 09:49:24.968971	f	20a44587-be25-4ebe-99ca-d0d9e94e6876	2
286	2026-09-03 09:44:41.515729	t	378d7aa6-402c-4c0a-acf4-ff0cc99735fc	2
288	2026-09-03 09:50:09.832045	f	3570c610-baa4-4afc-8f0a-1a58c0f3d8c6	2
289	2026-09-03 09:54:30.110413	f	b11ec2ad-a9b8-4df6-ad20-261df3980330	2
290	2026-09-03 09:58:37.380102	f	26c0c931-9f9f-4d15-bc31-5893b56e5a7b	2
291	2026-09-03 10:01:26.662184	t	a0c25c77-9d92-404c-aabb-3826a03bd6c6	2
293	2026-09-03 10:46:18.183544	f	2fd804a9-a17d-473f-9e34-0d6f781b607a	2
292	2026-09-03 10:28:23.409124	t	e46f2553-24fe-48dc-8527-28a2bfa632d6	2
294	2026-09-03 10:48:12.930442	f	69f9c4dc-d7b7-4373-9d2d-663d8c15f6ec	2
295	2026-09-03 10:48:43.950983	f	32559681-b222-493e-bed6-e66d3b9926b2	2
296	2026-09-03 10:51:31.617443	f	39cedd44-1f9e-4956-a829-46d0bf6b9afe	2
298	2026-09-03 11:01:21.805361	f	cea42ebf-460b-4ad5-a28e-3bb43ea1e388	2
299	2026-09-03 11:04:49.720869	f	12a0e6fd-1f9c-41b0-8490-736e2931ec6b	2
300	2026-09-03 11:05:30.01196	f	67af2700-1d22-445a-8bab-effa3633ad45	2
301	2026-09-03 11:12:14.047648	f	bc627db6-9e1e-43f9-8e5d-14288daa5b3b	2
297	2026-09-03 10:55:17.319088	t	5bb01b9a-edc5-4d7e-9edd-ba2b7334b4bc	2
303	2026-09-03 11:26:37.772697	f	5474f8a0-eddd-4562-81b7-0b1cb3778353	2
304	2026-09-03 11:27:25.511306	f	23ed3f20-15a5-4468-a492-0c74f3b52b23	2
302	2026-09-03 11:16:31.140312	t	28d50232-de2e-4aad-8898-5d83ec27faef	2
306	2026-09-03 11:55:41.052082	f	2d85b3eb-8f83-4366-91ae-313db26a3edd	2
307	2026-09-03 11:56:27.289929	f	8bd25ea4-2dba-4693-bace-23470addee26	2
305	2026-09-03 11:52:37.682978	t	2c4db1f4-f57e-4693-b6f9-258fab62f258	2
308	2026-09-03 12:07:43.137026	t	a7a862ca-08cc-4655-96bd-ebc43c7e9121	2
309	2026-09-03 12:22:57.891339	t	d200e3bf-0411-4f8b-9b0b-67d0b780255f	2
342	2026-09-03 14:52:55.175342	t	f2579078-4151-4ced-991c-a205dcf335c0	2
343	2026-09-03 15:13:15.253256	t	b1137496-2cf7-44ee-9e15-9d4705956eac	2
345	2026-09-03 15:28:17.438069	t	6771f636-6f38-45eb-9aa5-2e366237d2d3	2
344	2026-09-03 15:24:34.277422	t	66a1a251-a460-491c-969a-8c191fe0bfd7	3
346	2026-09-03 15:43:17.491428	t	426daa25-e56d-4bb7-afcd-cba6e2972caf	2
348	2026-09-03 15:58:27.848063	t	e45efd84-cadc-44c1-aa3a-b7950b6e78aa	2
349	2026-09-03 16:13:32.176951	t	7cbbfc15-870a-4c86-a548-7a0b43d92fd1	2
350	2026-09-03 16:29:17.028637	t	4fb48f0f-6862-4cf8-b46e-9f00e2415088	2
352	2026-09-03 17:02:40.028681	f	93618797-649e-45de-a167-0c4be1c2ba5c	3
347	2026-09-03 15:55:11.535814	t	a96ca42e-22b0-45bd-8b9a-16db44628f54	3
351	2026-09-03 16:54:11.759406	t	c7642f67-2fdf-4de5-9120-750d4b137e9e	2
353	2026-09-03 20:04:42.405518	t	d7c24675-2414-4f10-a59c-d822f1b59be3	2
354	2026-09-03 20:27:46.319264	t	bb4e5290-48ec-4e5e-b82e-17ef4f1c0fb0	2
355	2026-09-03 20:42:53.067935	t	f99fa044-c2b2-48ad-b09b-65a32d721c9d	2
357	2026-09-03 21:19:06.496439	f	25bd5244-7a3e-4fe6-bc04-845f48a5e984	2
356	2026-09-03 20:59:22.814405	t	51e98992-dd15-4d0b-adcb-30f701b82c15	2
359	2026-09-03 21:28:48.851997	f	1f365499-a0e9-4eb1-bb36-01f99785a656	3
360	2026-09-03 21:29:10.468884	t	41526bf1-12a5-46f0-93b2-16c500751260	2
361	2026-09-03 22:07:10.735017	t	4a1ea1ed-992a-42ef-ac3f-c4ee8f1fa7fc	2
362	2026-09-03 22:38:29.492662	t	7e369c6d-7f0f-4238-b400-0d85f0924b19	2
363	2026-09-03 22:59:23.657111	t	fe9d0f07-f667-4bcf-bb7c-db26fb1ea65c	2
358	2026-09-03 21:27:47.789247	t	1b117734-2f34-4509-8a02-8c026bcaba79	3
366	2026-09-03 23:55:49.894501	f	3c755b1f-2b38-45cc-9399-616a0c8877bd	2
364	2026-09-03 23:25:54.25265	t	1d401108-8501-44c9-93e3-7a5c048d6e61	2
367	2026-09-03 23:57:27.841012	f	113b3742-66c5-4af6-b1ae-f6b6fc788064	3
365	2026-09-03 23:26:24.62746	t	e7c0fb0a-3153-4e06-8e62-963154c785bb	3
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.role (id, name) FROM stdin;
1	COMPANY_ADMIN
2	RECRUITER
3	HIRING_MANAGER
4	CANDIDATE
5	PLATFORM_ADMIN
\.


--
-- Data for Name: role_permission; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.role_permission (id, permission_id, role_id) FROM stdin;
\.


--
-- Data for Name: tenant; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.tenant (id, tenant_code, status, created_at) FROM stdin;
1	TECHCORP	ACTIVE	2026-08-13 07:59:06.41862
3	Sabenico	ACTIVE	2026-08-20 23:20:50.474673
\.


--
-- Name: app_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.app_user_id_seq', 6, true);


--
-- Name: company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.company_id_seq', 3, true);


--
-- Name: email_verification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.email_verification_id_seq', 4, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, true);


--
-- Name: permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.permission_id_seq', 1, false);


--
-- Name: refresh_token_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.refresh_token_id_seq', 367, true);


--
-- Name: role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.role_id_seq', 5, true);


--
-- Name: role_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.role_permission_id_seq', 1, false);


--
-- Name: tenant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.tenant_id_seq', 3, true);


--
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- Name: company company_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.company
    ADD CONSTRAINT company_pkey PRIMARY KEY (id);


--
-- Name: email_verification email_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.email_verification
    ADD CONSTRAINT email_verification_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: permission permission_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id);


--
-- Name: refresh_token refresh_token_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.refresh_token
    ADD CONSTRAINT refresh_token_pkey PRIMARY KEY (id);


--
-- Name: role role_name_key; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_name_key UNIQUE (name);


--
-- Name: role_permission role_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_pkey PRIMARY KEY (id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: tenant tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_pkey PRIMARY KEY (id);


--
-- Name: tenant tenant_tenant_code_key; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_tenant_code_key UNIQUE (tenant_code);


--
-- Name: permission uka7ujv987la0i7a0o91ueevchc; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT uka7ujv987la0i7a0o91ueevchc UNIQUE (code);


--
-- Name: refresh_token ukr4k4edos30bx9neoq81mdvwph; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.refresh_token
    ADD CONSTRAINT ukr4k4edos30bx9neoq81mdvwph UNIQUE (token);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_email_verification_email_id; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX idx_email_verification_email_id ON public.email_verification USING btree (lower((email)::text), id DESC);


--
-- Name: uk_app_user_email_ci; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE UNIQUE INDEX uk_app_user_email_ci ON public.app_user USING btree (lower((email)::text));


--
-- PostgreSQL database dump complete
--

\unrestrict Ekfj04KoS21FqiktnNpnxBh5EcmMRocGKKlpQ3cjKAgCfYi2D2TlH8nRYxI29AY

--
-- Database "ats_candidate" dump
--

--
-- PostgreSQL database dump
--

\restrict lQc3Oy5F76f7O5ebZ5yYEDkfZxAQfhejXDNytlxPNAIobueylca2tM8q5U0WDwM

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_candidate; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_candidate WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_candidate OWNER TO ats_user;

\unrestrict lQc3Oy5F76f7O5ebZ5yYEDkfZxAQfhejXDNytlxPNAIobueylca2tM8q5U0WDwM
\connect ats_candidate
\restrict lQc3Oy5F76f7O5ebZ5yYEDkfZxAQfhejXDNytlxPNAIobueylca2tM8q5U0WDwM

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: candidate; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.candidate (
    id bigint NOT NULL,
    address character varying(255),
    created_at timestamp(6) without time zone,
    current_position character varying(255),
    cv_file_url character varying(255),
    date_of_birth date,
    deleted_at timestamp(6) without time zone,
    education_level_id bigint,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    gender character varying(255),
    phone character varying(255),
    tenant_id bigint,
    updated_at timestamp(6) without time zone,
    user_id bigint,
    internal_note text,
    consent_at timestamp(6) without time zone,
    consent_given boolean,
    pool_status character varying(255) DEFAULT 'ACTIVE'::character varying NOT NULL
);


ALTER TABLE public.candidate OWNER TO ats_user;

--
-- Name: COLUMN candidate.tenant_id; Type: COMMENT; Schema: public; Owner: ats_user
--

COMMENT ON COLUMN public.candidate.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';


--
-- Name: candidate_custom_field_value; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.candidate_custom_field_value (
    id bigint NOT NULL,
    value text,
    candidate_id bigint NOT NULL,
    field_definition_id bigint NOT NULL
);


ALTER TABLE public.candidate_custom_field_value OWNER TO ats_user;

--
-- Name: candidate_custom_field_value_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.candidate_custom_field_value ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.candidate_custom_field_value_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: candidate_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.candidate ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.candidate_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: candidate_skill; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.candidate_skill (
    id bigint NOT NULL,
    skill_id bigint NOT NULL,
    candidate_id bigint NOT NULL
);


ALTER TABLE public.candidate_skill OWNER TO ats_user;

--
-- Name: candidate_skill_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.candidate_skill ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.candidate_skill_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: candidate_tag; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.candidate_tag (
    id bigint NOT NULL,
    tag character varying(255) NOT NULL,
    candidate_id bigint NOT NULL
);


ALTER TABLE public.candidate_tag OWNER TO ats_user;

--
-- Name: candidate_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.candidate_tag ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.candidate_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: candidates; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.candidates (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.candidates OWNER TO ats_user;

--
-- Name: candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.candidates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidates_id_seq OWNER TO ats_user;

--
-- Name: candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.candidates_id_seq OWNED BY public.candidates.id;


--
-- Name: custom_field_definition; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.custom_field_definition (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    field_key character varying(255) NOT NULL,
    field_label character varying(255) NOT NULL,
    field_type character varying(255) NOT NULL,
    tenant_id bigint,
    CONSTRAINT custom_field_definition_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['TEXT'::character varying, 'NUMBER'::character varying, 'DATE'::character varying])::text[])))
);


ALTER TABLE public.custom_field_definition OWNER TO ats_user;

--
-- Name: COLUMN custom_field_definition.tenant_id; Type: COMMENT; Schema: public; Owner: ats_user
--

COMMENT ON COLUMN public.custom_field_definition.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';


--
-- Name: custom_field_definition_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.custom_field_definition ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.custom_field_definition_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: candidates id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidates ALTER COLUMN id SET DEFAULT nextval('public.candidates_id_seq'::regclass);


--
-- Data for Name: candidate; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.candidate (id, address, created_at, current_position, cv_file_url, date_of_birth, deleted_at, education_level_id, email, full_name, gender, phone, tenant_id, updated_at, user_id, internal_note, consent_at, consent_given, pool_status) FROM stdin;
1	\N	2026-08-14 12:27:54.541195	\N	https://ats-system-cv-storage.s3.ap-southeast-1.amazonaws.com/cv/1/74023d8d-a336-487a-99e8-7829b1cefae1-CV_LeVuThanhDuong_FullStackDeveloperIntern.pdf	\N	\N	\N	levuthanhduong2004@gmail.com	Lê Vũ Thanh Dương	\N	0369384679	1	2026-08-14 12:29:33.550111	\N	\N	\N	\N	ACTIVE
2	\N	2026-08-14 12:29:41.929109	\N	https://ats-system-cv-storage.s3.ap-southeast-1.amazonaws.com/cv/1/25e2909d-e4b9-4aaa-bd97-69239487bd75-CV_LeVuThanhDuong_FullStackDeveloperIntern.pdf	\N	\N	\N	levuthanhduong2812004@gmail.com	Lê Vũ Thanh Dương	\N	0369384679	1	2026-08-21 10:17:46.15103	\N	Ứng viên phù hợp với JD	\N	\N	ACTIVE
\.


--
-- Data for Name: candidate_custom_field_value; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.candidate_custom_field_value (id, value, candidate_id, field_definition_id) FROM stdin;
\.


--
-- Data for Name: candidate_skill; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.candidate_skill (id, skill_id, candidate_id) FROM stdin;
\.


--
-- Data for Name: candidate_tag; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.candidate_tag (id, tag, candidate_id) FROM stdin;
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.candidates (id, tenant_id, user_id, full_name, email, phone, created_at) FROM stdin;
1	1	5	Nguyễn Văn Ứng Viên	candidate.test@test.net	0901234567	2026-08-13 07:59:06.782769
\.


--
-- Data for Name: custom_field_definition; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.custom_field_definition (id, active, created_at, field_key, field_label, field_type, tenant_id) FROM stdin;
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 07:52:20.956159	0	t
2	1	allow account candidate without tenant	SQL	V1__allow_account_candidate_without_tenant.sql	-215286305	ats_user	2026-08-28 07:52:23.330957	1144	t
3	2	single company candidate schema	SQL	V2__single_company_candidate_schema.sql	1656744577	ats_user	2026-08-28 08:29:51.955881	99	t
\.


--
-- Name: candidate_custom_field_value_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.candidate_custom_field_value_id_seq', 1, false);


--
-- Name: candidate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.candidate_id_seq', 4, true);


--
-- Name: candidate_skill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.candidate_skill_id_seq', 1, false);


--
-- Name: candidate_tag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.candidate_tag_id_seq', 1, false);


--
-- Name: candidates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.candidates_id_seq', 1, true);


--
-- Name: custom_field_definition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.custom_field_definition_id_seq', 1, false);


--
-- Name: candidate_custom_field_value candidate_custom_field_value_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate_custom_field_value
    ADD CONSTRAINT candidate_custom_field_value_pkey PRIMARY KEY (id);


--
-- Name: candidate candidate_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate
    ADD CONSTRAINT candidate_pkey PRIMARY KEY (id);


--
-- Name: candidate_skill candidate_skill_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate_skill
    ADD CONSTRAINT candidate_skill_pkey PRIMARY KEY (id);


--
-- Name: candidate_tag candidate_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate_tag
    ADD CONSTRAINT candidate_tag_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: custom_field_definition custom_field_definition_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.custom_field_definition
    ADD CONSTRAINT custom_field_definition_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: uk_candidate_active_email_ci; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE UNIQUE INDEX uk_candidate_active_email_ci ON public.candidate USING btree (lower((email)::text)) WHERE (deleted_at IS NULL);


--
-- Name: uk_candidate_user_id; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE UNIQUE INDEX uk_candidate_user_id ON public.candidate USING btree (user_id) WHERE ((user_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: candidate_custom_field_value fkdwf9qq7ctwxmv26l2gpjg0vkn; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate_custom_field_value
    ADD CONSTRAINT fkdwf9qq7ctwxmv26l2gpjg0vkn FOREIGN KEY (field_definition_id) REFERENCES public.custom_field_definition(id);


--
-- Name: candidate_skill fkijjf42p0sh2c2na28g5aalx2p; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate_skill
    ADD CONSTRAINT fkijjf42p0sh2c2na28g5aalx2p FOREIGN KEY (candidate_id) REFERENCES public.candidate(id);


--
-- Name: candidate_tag fkmekce4hi7a7uruj87b8jntvtv; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate_tag
    ADD CONSTRAINT fkmekce4hi7a7uruj87b8jntvtv FOREIGN KEY (candidate_id) REFERENCES public.candidate(id);


--
-- Name: candidate_custom_field_value fkshx3qdgl9hq6k0hi983dg5cmr; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.candidate_custom_field_value
    ADD CONSTRAINT fkshx3qdgl9hq6k0hi983dg5cmr FOREIGN KEY (candidate_id) REFERENCES public.candidate(id);


--
-- PostgreSQL database dump complete
--

\unrestrict lQc3Oy5F76f7O5ebZ5yYEDkfZxAQfhejXDNytlxPNAIobueylca2tM8q5U0WDwM

--
-- Database "ats_dashboard" dump
--

--
-- PostgreSQL database dump
--

\restrict ln3BpKrvkhOhtmYwKa7LWsc47RKYA9H9d3DuNlpzCQTXWRAG3YuyhdLx23kMRHN

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_dashboard; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_dashboard WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_dashboard OWNER TO ats_user;

\unrestrict ln3BpKrvkhOhtmYwKa7LWsc47RKYA9H9d3DuNlpzCQTXWRAG3YuyhdLx23kMRHN
\connect ats_dashboard
\restrict ln3BpKrvkhOhtmYwKa7LWsc47RKYA9H9d3DuNlpzCQTXWRAG3YuyhdLx23kMRHN

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict ln3BpKrvkhOhtmYwKa7LWsc47RKYA9H9d3DuNlpzCQTXWRAG3YuyhdLx23kMRHN

--
-- Database "ats_interview" dump
--

--
-- PostgreSQL database dump
--

\restrict zRwxDrulmroWGhaV6Nc6lknhQy0xhGf2VRSQBpNJtGy6cmQkQ3zhXmb62SiQ0lo

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_interview; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_interview WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_interview OWNER TO ats_user;

\unrestrict zRwxDrulmroWGhaV6Nc6lknhQy0xhGf2VRSQBpNJtGy6cmQkQ3zhXmb62SiQ0lo
\connect ats_interview
\restrict zRwxDrulmroWGhaV6Nc6lknhQy0xhGf2VRSQBpNJtGy6cmQkQ3zhXmb62SiQ0lo

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: interview; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.interview (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    candidate_name_snapshot character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    duration_minutes integer NOT NULL,
    format character varying(255) NOT NULL,
    job_posting_id bigint NOT NULL,
    location character varying(255),
    meeting_link character varying(255),
    note text,
    scheduled_at timestamp(6) without time zone NOT NULL,
    status character varying(255) NOT NULL,
    tenant_id bigint NOT NULL,
    updated_at timestamp(6) without time zone,
    candidate_confirmed_at timestamp(6) without time zone,
    candidate_id bigint,
    work_location_id bigint,
    CONSTRAINT interview_format_check CHECK (((format)::text = ANY ((ARRAY['ONLINE'::character varying, 'OFFLINE'::character varying])::text[]))),
    CONSTRAINT interview_status_check CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.interview OWNER TO ats_user;

--
-- Name: interview_evaluation; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.interview_evaluation (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    general_comment text,
    interviewer_id bigint NOT NULL,
    overall_recommendation character varying(255),
    salary_note text,
    salary_proposed numeric(38,2),
    submitted_at timestamp(6) without time zone,
    interview_id bigint NOT NULL,
    CONSTRAINT interview_evaluation_overall_recommendation_check CHECK (((overall_recommendation)::text = ANY ((ARRAY['STRONG_YES'::character varying, 'YES'::character varying, 'NO'::character varying, 'STRONG_NO'::character varying])::text[])))
);


ALTER TABLE public.interview_evaluation OWNER TO ats_user;

--
-- Name: interview_evaluation_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.interview_evaluation ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_evaluation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: interview_evaluation_score; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.interview_evaluation_score (
    id bigint NOT NULL,
    comment character varying(255),
    criteria_id bigint NOT NULL,
    score integer NOT NULL,
    evaluation_id bigint NOT NULL
);


ALTER TABLE public.interview_evaluation_score OWNER TO ats_user;

--
-- Name: interview_evaluation_score_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.interview_evaluation_score ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_evaluation_score_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: interview_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.interview ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: interview_interviewer; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.interview_interviewer (
    id bigint NOT NULL,
    interviewer_id bigint NOT NULL,
    interviewer_name_snapshot character varying(255) NOT NULL,
    interview_id bigint NOT NULL,
    confirmed_at timestamp(6) without time zone
);


ALTER TABLE public.interview_interviewer OWNER TO ats_user;

--
-- Name: interview_interviewer_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.interview_interviewer ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_interviewer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: interview_slot; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.interview_slot (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    candidate_confirmed boolean NOT NULL,
    candidate_name_snapshot character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    department_confirmed boolean NOT NULL,
    end_time timestamp(6) without time zone NOT NULL,
    format character varying(255) NOT NULL,
    location character varying(255),
    matched boolean NOT NULL,
    meeting_link character varying(255),
    start_time timestamp(6) without time zone NOT NULL,
    status character varying(255) NOT NULL,
    tenant_id bigint NOT NULL,
    updated_at timestamp(6) without time zone,
    work_location_id bigint,
    CONSTRAINT interview_slot_format_check CHECK (((format)::text = ANY ((ARRAY['ONLINE'::character varying, 'OFFLINE'::character varying])::text[]))),
    CONSTRAINT interview_slot_status_check CHECK (((status)::text = ANY ((ARRAY['PROPOSED'::character varying, 'SELECTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.interview_slot OWNER TO ats_user;

--
-- Name: interview_slot_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.interview_slot ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_slot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: salary_proposal; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.salary_proposal (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    comment text,
    created_at timestamp(6) without time zone,
    interview_id bigint,
    proposed_by_id bigint NOT NULL,
    proposed_by_name character varying(255) NOT NULL,
    proposed_salary numeric(15,2) NOT NULL,
    status character varying(255) NOT NULL,
    tenant_id bigint NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT salary_proposal_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE public.salary_proposal OWNER TO ats_user;

--
-- Name: salary_proposal_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.salary_proposal ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.salary_proposal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 10:35:14.648693	0	t
\.


--
-- Data for Name: interview; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.interview (id, application_id, candidate_name_snapshot, created_at, duration_minutes, format, job_posting_id, location, meeting_link, note, scheduled_at, status, tenant_id, updated_at, candidate_confirmed_at, candidate_id, work_location_id) FROM stdin;
3	2	Lê Vũ Thanh Dương	2026-08-21 12:16:45.791901	60	OFFLINE	1	Quận 1, TP HCM			2026-08-31 08:00:00	CANCELLED	1	2026-08-21 12:54:20.637203	\N	2	\N
2	2	Lê Vũ Thanh Dương	2026-08-21 11:59:21.568462	60	OFFLINE	1	Quận 1, TP HCM			2026-08-24 08:00:00	CANCELLED	1	2026-08-21 12:54:23.379085	\N	2	\N
1	2	Lê Vũ Thanh Dương	2026-08-21 10:18:54.381701	60	OFFLINE	1	Quận 1, TP HCM			2026-08-24 02:00:00	CANCELLED	1	2026-08-21 12:54:25.602167	\N	2	\N
\.


--
-- Data for Name: interview_evaluation; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.interview_evaluation (id, created_at, general_comment, interviewer_id, overall_recommendation, salary_note, salary_proposed, submitted_at, interview_id) FROM stdin;
1	2026-08-21 10:18:54.478076	\N	3	\N	\N	\N	\N	1
2	2026-08-21 11:59:21.692343	\N	3	\N	\N	\N	\N	2
3	2026-08-21 12:16:45.819974	\N	3	\N	\N	\N	\N	3
\.


--
-- Data for Name: interview_evaluation_score; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.interview_evaluation_score (id, comment, criteria_id, score, evaluation_id) FROM stdin;
\.


--
-- Data for Name: interview_interviewer; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.interview_interviewer (id, interviewer_id, interviewer_name_snapshot, interview_id, confirmed_at) FROM stdin;
1	3	Lê Trưởng Phòng	1	\N
2	3	Lê Trưởng Phòng	2	\N
3	3	Lê Trưởng Phòng	3	\N
\.


--
-- Data for Name: interview_slot; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.interview_slot (id, application_id, candidate_confirmed, candidate_name_snapshot, created_at, department_confirmed, end_time, format, location, matched, meeting_link, start_time, status, tenant_id, updated_at, work_location_id) FROM stdin;
\.


--
-- Data for Name: salary_proposal; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.salary_proposal (id, application_id, comment, created_at, interview_id, proposed_by_id, proposed_by_name, proposed_salary, status, tenant_id, updated_at) FROM stdin;
\.


--
-- Name: interview_evaluation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.interview_evaluation_id_seq', 38, true);


--
-- Name: interview_evaluation_score_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.interview_evaluation_score_id_seq', 1, false);


--
-- Name: interview_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.interview_id_seq', 39, true);


--
-- Name: interview_interviewer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.interview_interviewer_id_seq', 38, true);


--
-- Name: interview_slot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.interview_slot_id_seq', 1, true);


--
-- Name: salary_proposal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.salary_proposal_id_seq', 1, false);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: interview_evaluation interview_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_evaluation
    ADD CONSTRAINT interview_evaluation_pkey PRIMARY KEY (id);


--
-- Name: interview_evaluation_score interview_evaluation_score_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_evaluation_score
    ADD CONSTRAINT interview_evaluation_score_pkey PRIMARY KEY (id);


--
-- Name: interview_interviewer interview_interviewer_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_interviewer
    ADD CONSTRAINT interview_interviewer_pkey PRIMARY KEY (id);


--
-- Name: interview interview_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview
    ADD CONSTRAINT interview_pkey PRIMARY KEY (id);


--
-- Name: interview_slot interview_slot_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_slot
    ADD CONSTRAINT interview_slot_pkey PRIMARY KEY (id);


--
-- Name: salary_proposal salary_proposal_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.salary_proposal
    ADD CONSTRAINT salary_proposal_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: interview_interviewer fk6xq1d3get8miptci6syc9wlu; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_interviewer
    ADD CONSTRAINT fk6xq1d3get8miptci6syc9wlu FOREIGN KEY (interview_id) REFERENCES public.interview(id);


--
-- Name: interview_evaluation fkmkl46ugwvvjdxnun1907l4u5y; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_evaluation
    ADD CONSTRAINT fkmkl46ugwvvjdxnun1907l4u5y FOREIGN KEY (interview_id) REFERENCES public.interview(id);


--
-- Name: interview_evaluation_score fkriswr30vwjcxc79g833svnoij; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_evaluation_score
    ADD CONSTRAINT fkriswr30vwjcxc79g833svnoij FOREIGN KEY (evaluation_id) REFERENCES public.interview_evaluation(id);


--
-- PostgreSQL database dump complete
--

\unrestrict zRwxDrulmroWGhaV6Nc6lknhQy0xhGf2VRSQBpNJtGy6cmQkQ3zhXmb62SiQ0lo

--
-- Database "ats_masterdata" dump
--

--
-- PostgreSQL database dump
--

\restrict wzAEVSgsWB9pUcQfdpTl4ncS8z6ThQ4fTEYhXdA0QKc802T4tjUYABFeFzPaLWx

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_masterdata; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_masterdata WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_masterdata OWNER TO ats_user;

\unrestrict wzAEVSgsWB9pUcQfdpTl4ncS8z6ThQ4fTEYhXdA0QKc802T4tjUYABFeFzPaLWx
\connect ats_masterdata
\restrict wzAEVSgsWB9pUcQfdpTl4ncS8z6ThQ4fTEYhXdA0QKc802T4tjUYABFeFzPaLWx

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: catalog_items; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.catalog_items (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    category character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    active boolean DEFAULT true,
    display_order integer DEFAULT 0
);


ALTER TABLE public.catalog_items OWNER TO ats_user;

--
-- Name: catalog_items_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.catalog_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.catalog_items_id_seq OWNER TO ats_user;

--
-- Name: catalog_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.catalog_items_id_seq OWNED BY public.catalog_items.id;


--
-- Name: contract_type; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.contract_type (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.contract_type OWNER TO ats_user;

--
-- Name: contract_type_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.contract_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.contract_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: department; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.department (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(255),
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL,
    updated_at timestamp(6) without time zone
);


ALTER TABLE public.department OWNER TO ats_user;

--
-- Name: department_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.department ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.department_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: education_level; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.education_level (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    order_no integer,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.education_level OWNER TO ats_user;

--
-- Name: education_level_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.education_level ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.education_level_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: email_template; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.email_template (
    id bigint NOT NULL,
    active boolean NOT NULL,
    body text NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    subject character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.email_template OWNER TO ats_user;

--
-- Name: email_template_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.email_template ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.email_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: employment_type; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.employment_type (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.employment_type OWNER TO ats_user;

--
-- Name: employment_type_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.employment_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.employment_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: experience_level; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.experience_level (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    max_years integer,
    min_years integer,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.experience_level OWNER TO ats_user;

--
-- Name: experience_level_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.experience_level ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.experience_level_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: interview_criteria; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.interview_criteria (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(255),
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.interview_criteria OWNER TO ats_user;

--
-- Name: interview_criteria_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.interview_criteria ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_criteria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_level; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_level (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    order_no integer,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.job_level OWNER TO ats_user;

--
-- Name: job_level_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.job_level ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.job_level_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_title; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_title (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.job_title OWNER TO ats_user;

--
-- Name: job_title_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.job_title ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.job_title_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pipeline_stage; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.pipeline_stage (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    stage_order integer NOT NULL,
    stage_type character varying(255) NOT NULL,
    pipeline_id bigint NOT NULL,
    CONSTRAINT pipeline_stage_stage_type_check CHECK (((stage_type)::text = ANY ((ARRAY['APPLIED'::character varying, 'CV_SCREENING'::character varying, 'HR_SCREENING'::character varying, 'TECHNICAL_INTERVIEW'::character varying, 'HR_INTERVIEW'::character varying, 'FINAL_INTERVIEW'::character varying, 'OFFER'::character varying, 'HIRED'::character varying, 'REJECTED'::character varying, 'CUSTOM'::character varying])::text[])))
);


ALTER TABLE public.pipeline_stage OWNER TO ats_user;

--
-- Name: pipeline_stage_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.pipeline_stage ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pipeline_stage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pipeline_stages; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.pipeline_stages (
    id bigint NOT NULL,
    pipeline_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    stage_type character varying(50) NOT NULL,
    stage_order integer NOT NULL
);


ALTER TABLE public.pipeline_stages OWNER TO ats_user;

--
-- Name: pipeline_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.pipeline_stages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pipeline_stages_id_seq OWNER TO ats_user;

--
-- Name: pipeline_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.pipeline_stages_id_seq OWNED BY public.pipeline_stages.id;


--
-- Name: pipelines; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.pipelines (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    active boolean DEFAULT true
);


ALTER TABLE public.pipelines OWNER TO ats_user;

--
-- Name: pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.pipelines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pipelines_id_seq OWNER TO ats_user;

--
-- Name: pipelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.pipelines_id_seq OWNED BY public.pipelines.id;


--
-- Name: priority_level; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.priority_level (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    order_no integer NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.priority_level OWNER TO ats_user;

--
-- Name: priority_level_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.priority_level ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.priority_level_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: recruitment_pipeline; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.recruitment_pipeline (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    is_default boolean NOT NULL,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.recruitment_pipeline OWNER TO ats_user;

--
-- Name: recruitment_pipeline_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.recruitment_pipeline ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.recruitment_pipeline_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: recruitment_source; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.recruitment_source (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.recruitment_source OWNER TO ats_user;

--
-- Name: recruitment_source_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.recruitment_source ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.recruitment_source_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: recruitment_status; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.recruitment_status (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    order_no integer,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.recruitment_status OWNER TO ats_user;

--
-- Name: recruitment_status_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.recruitment_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.recruitment_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rejection_reason; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.rejection_reason (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.rejection_reason OWNER TO ats_user;

--
-- Name: rejection_reason_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.rejection_reason ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rejection_reason_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: requisition_reason; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.requisition_reason (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.requisition_reason OWNER TO ats_user;

--
-- Name: requisition_reason_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.requisition_reason ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.requisition_reason_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: skill; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.skill (
    id bigint NOT NULL,
    active boolean NOT NULL,
    category character varying(255),
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.skill OWNER TO ats_user;

--
-- Name: skill_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.skill ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.skill_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: work_arrangement; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.work_arrangement (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.work_arrangement OWNER TO ats_user;

--
-- Name: work_arrangement_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.work_arrangement ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.work_arrangement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: work_location; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.work_location (
    id bigint NOT NULL,
    active boolean NOT NULL,
    address character varying(255),
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    tenant_id bigint NOT NULL
);


ALTER TABLE public.work_location OWNER TO ats_user;

--
-- Name: work_location_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.work_location ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.work_location_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: catalog_items id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.catalog_items ALTER COLUMN id SET DEFAULT nextval('public.catalog_items_id_seq'::regclass);


--
-- Name: pipeline_stages id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.pipeline_stages ALTER COLUMN id SET DEFAULT nextval('public.pipeline_stages_id_seq'::regclass);


--
-- Name: pipelines id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.pipelines ALTER COLUMN id SET DEFAULT nextval('public.pipelines_id_seq'::regclass);


--
-- Data for Name: catalog_items; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.catalog_items (id, tenant_id, category, name, active, display_order) FROM stdin;
1	1	DEPARTMENT	IT Software	t	1
2	1	DEPARTMENT	Human Resources	t	2
3	1	JOB_TITLE	Senior Java Developer	t	1
4	1	JOB_TITLE	Frontend React Developer	t	2
5	1	EMPLOYMENT_TYPE	Full-time	t	1
6	1	WORK_LOCATION	TP. Hồ Chí Minh	t	1
7	1	WORK_LOCATION	Hà Nội	t	2
8	1	CONTRACT_TYPE	Chính thức 12 tháng	t	1
9	1	CONTRACT_TYPE	Chính thức vô thời hạn	t	2
10	1	REJECTION_REASON	Kỹ năng chuyên môn chưa đạt	t	1
11	1	REJECTION_REASON	Mức lương kỳ vọng vượt ngân sách	t	2
12	1	INTERVIEW_CRITERIA	Kỹ năng Java Core & Spring Boot	t	1
13	1	INTERVIEW_CRITERIA	Tư duy Đa luồng & Microservices	t	2
14	1	INTERVIEW_CRITERIA	Kỹ năng Giao tiếp & Tiếng Anh	t	3
\.


--
-- Data for Name: contract_type; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.contract_type (id, active, created_at, name, tenant_id) FROM stdin;
1	t	2026-08-14 11:00:47.137504	Thử việc	1
3	t	2026-08-14 11:00:58.077075	Thời vụ	1
2	t	2026-08-14 11:00:52.614667	Chính thức	1
4	t	2026-08-20 23:22:11.43153	Thử việc	3
5	t	2026-08-20 23:22:11.447097	Chính thức	3
6	t	2026-08-20 23:22:11.449837	Thời vụ	3
\.


--
-- Data for Name: department; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.department (id, active, created_at, description, name, tenant_id, updated_at) FROM stdin;
2	t	2026-08-14 10:54:04.307757	Phòng IT / Engineering	Công nghệ thông tin	1	2026-08-14 10:54:04.307757
1	t	2026-08-13 19:38:55.616313	Phòng Sales	Kinh doanh	1	2026-08-14 10:54:19.330792
3	t	2026-08-14 10:54:30.280851	Phòng Marketing	Marketing	1	2026-08-14 10:54:30.280851
4	t	2026-08-14 10:54:42.439824	Tài chính – Kế toán	Tài chính – Kế toán	1	2026-08-14 10:54:42.439824
5	t	2026-08-14 10:54:55.568207	Phòng HR	Nhân sự	1	2026-08-14 10:54:55.568207
\.


--
-- Data for Name: education_level; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.education_level (id, active, created_at, name, order_no, tenant_id) FROM stdin;
1	t	2026-08-14 11:01:41.182523	Trung học phổ thông	1	1
2	t	2026-08-14 11:01:52.323574	Cao đẳng	2	1
3	t	2026-08-14 11:01:59.676989	Đại học	3	1
4	t	2026-08-14 11:02:08.92678	Thạc sĩ	4	1
5	t	2026-08-20 23:22:11.483283	Trung học phổ thông	1	3
6	t	2026-08-20 23:22:11.491902	Cao đẳng	2	3
7	t	2026-08-20 23:22:11.495087	Đại học	3	3
8	t	2026-08-20 23:22:11.500531	Thạc sĩ	4	3
9	t	2026-08-20 23:22:11.503741	Tiến sĩ	5	3
\.


--
-- Data for Name: email_template; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.email_template (id, active, body, code, created_at, subject, tenant_id) FROM stdin;
1	t	Xin chào {{candidateName}},\n\nCảm ơn bạn đã ứng tuyển vị trí {{jobTitle}} tại {{companyName}}.\n\nChúng tôi đã nhận được hồ sơ của bạn và sẽ tiến hành xem xét trong thời gian sớm nhất.\n\nNếu hồ sơ phù hợp với yêu cầu tuyển dụng, bộ phận tuyển dụng sẽ liên hệ với bạn để trao đổi về các bước tiếp theo.\n\nTrân trọng,\n{{companyName}}	APPLICATION_RECEIVED	2026-08-14 11:13:13.245537	Đã nhận hồ sơ ứng tuyển – {{jobTitle}}	1
2	t	Xin chào {{candidateName}},\n\nChúng tôi rất vui thông báo rằng hồ sơ của bạn đã được lựa chọn để tham gia phỏng vấn cho vị trí {{jobTitle}} tại {{companyName}}.\n\nThông tin phỏng vấn:\n\nThời gian: {{interviewDate}} {{interviewTime}}\nHình thức: {{interviewType}}\nĐịa điểm/Link: {{interviewLocation}}\n\nVui lòng xác nhận khả năng tham gia phỏng vấn theo hướng dẫn được cung cấp.\n\nNếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với bộ phận tuyển dụng.\n\nTrân trọng,\n{{companyName}}	INTERVIEW_INVITATION	2026-08-14 11:13:31.423476	Thư mời phỏng vấn – {{jobTitle}}	1
3	t	Xin chào {{candidateName}},\n\nLịch phỏng vấn cho vị trí {{jobTitle}} đã được cập nhật.\n\nThời gian mới:\n{{interviewDate}} {{interviewTime}}\n\nHình thức:\n{{interviewType}}\n\nĐịa điểm/Link:\n{{interviewLocation}}\n\nVui lòng kiểm tra và xác nhận lịch phỏng vấn mới.\n\nTrân trọng,\n{{companyName}}	INTERVIEW_RESCHEDULED	2026-08-14 11:13:52.957298	Cập nhật lịch phỏng vấn – {{jobTitle}}	1
4	t	Xin chào {{candidateName}},\n\nChúng tôi vui mừng thông báo rằng bạn đã được lựa chọn cho vị trí {{jobTitle}} tại {{companyName}}.\n\nThông tin đề nghị:\n\nVị trí: {{jobTitle}}\nMức lương: {{salary}}\nNgày bắt đầu dự kiến: {{startDate}}\nĐịa điểm làm việc: {{workLocation}}\nLoại hợp đồng: {{contractType}}\n\nVui lòng xem xét đề nghị và xác nhận quyết định của bạn theo hướng dẫn được cung cấp.\n\nChúng tôi rất mong được chào đón bạn gia nhập đội ngũ {{companyName}}.\n\nTrân trọng,\n{{companyName}}	OFFER_LETTER	2026-08-14 11:14:10.818143	Thư đề nghị nhận việc – {{jobTitle}}	1
5	t	Xin chào {{candidateName}},\n\nCảm ơn bạn đã dành thời gian ứng tuyển vị trí {{jobTitle}} tại {{companyName}}.\n\nSau khi xem xét hồ sơ và kết quả đánh giá, rất tiếc chúng tôi chưa thể tiếp tục quy trình tuyển dụng với bạn ở thời điểm hiện tại.\n\nChúng tôi trân trọng sự quan tâm của bạn dành cho {{companyName}} và hy vọng sẽ có cơ hội được kết nối với bạn trong những vị trí phù hợp trong tương lai.\n\nChúc bạn thành công trên con đường nghề nghiệp.\n\nTrân trọng,\n{{companyName}}	REJECTION	2026-08-14 11:14:26.054318	Thông báo kết quả tuyển dụng – {{jobTitle}}	1
\.


--
-- Data for Name: employment_type; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.employment_type (id, active, created_at, name, tenant_id) FROM stdin;
1	t	2026-08-14 11:00:17.832144	Toàn thời gian	1
2	t	2026-08-14 11:00:24.621119	Bán thời gian	1
3	t	2026-08-14 11:00:31.177585	Thực tập	1
4	t	2026-08-14 11:00:36.88819	Cộng tác viên	1
5	t	2026-08-20 23:22:11.291329	Toàn thời gian	3
6	t	2026-08-20 23:22:11.419595	Bán thời gian	3
7	t	2026-08-20 23:22:11.423007	Thực tập	3
8	t	2026-08-20 23:22:11.425645	Cộng tác viên	3
\.


--
-- Data for Name: experience_level; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.experience_level (id, active, created_at, max_years, min_years, name, tenant_id) FROM stdin;
1	t	2026-08-14 10:59:20.03874	1	0	Fresher	1
2	t	2026-08-14 10:59:31.924923	2	1	Junior	1
3	t	2026-08-14 10:59:39.244957	4	2	Middle	1
4	t	2026-08-14 10:59:50.709147	7	4	Senior	1
5	t	2026-08-14 11:00:03.26088	15	7	Lead / Expert	1
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 10:35:09.037198	0	t
\.


--
-- Data for Name: interview_criteria; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.interview_criteria (id, active, created_at, description, name, tenant_id) FROM stdin;
1	t	2026-08-20 23:22:11.561292	\N	Kiến thức chuyên môn	3
2	t	2026-08-20 23:22:11.569293	\N	Kỹ năng kỹ thuật	3
3	t	2026-08-20 23:22:11.571454	\N	Kỹ năng mềm & giao tiếp	3
4	t	2026-08-20 23:22:11.57435	\N	Thái độ & tư duy giải quyết vấn đề	3
5	t	2026-08-20 23:22:11.57818	\N	Mức độ phù hợp với vị trí	3
\.


--
-- Data for Name: job_level; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_level (id, active, created_at, name, order_no, tenant_id) FROM stdin;
1	t	2026-08-14 10:55:58.120114	Intern	1	1
3	t	2026-08-14 10:56:15.498589	Middle	3	1
4	t	2026-08-14 10:56:22.623091	Senior	4	1
5	t	2026-08-14 10:56:29.032678	Lead	5	1
6	t	2026-08-14 10:56:36.062409	Manager	6	1
2	t	2026-08-14 10:56:09.386011	Junior	7	1
7	t	2026-08-14 11:06:20.85519	Fresher	2	1
\.


--
-- Data for Name: job_title; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_title (id, active, created_at, name, tenant_id) FROM stdin;
1	t	2026-08-14 10:55:06.110674	Senior Backend Developer	1
2	t	2026-08-14 10:55:11.38894	Frontend Developer	1
3	t	2026-08-14 10:55:16.741925	Fullstack Developer	1
4	t	2026-08-14 10:55:22.863231	QA Engineer	1
5	t	2026-08-14 10:55:29.07722	DevOps Engineer	1
6	t	2026-08-14 10:55:35.228616	Product Owner	1
7	t	2026-08-14 10:55:41.084597	Business Analyst	1
8	t	2026-08-14 10:55:47.523474	HR Recruiter	1
\.


--
-- Data for Name: pipeline_stage; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.pipeline_stage (id, name, stage_order, stage_type, pipeline_id) FROM stdin;
19	Ứng tuyển	1	APPLIED	2
20	Sàng lọc CV	2	CV_SCREENING	2
21	Sàng lọc HR	3	HR_SCREENING	2
22	Phỏng vấn kỹ thuật	4	TECHNICAL_INTERVIEW	2
23	Đề nghị nhận việc	5	OFFER	2
24	Đã tuyển dụng	6	HIRED	2
25	Từ chối	7	REJECTED	2
26	Ứng tuyển	1	APPLIED	1
27	Sàng lọc CV	2	CV_SCREENING	1
28	Phỏng vấn kỹ thuật	3	TECHNICAL_INTERVIEW	1
29	Đề nghị nhận việc	4	OFFER	1
30	Đã tuyển dụng	5	HIRED	1
31	Từ chối	6	REJECTED	1
\.


--
-- Data for Name: pipeline_stages; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.pipeline_stages (id, pipeline_id, name, stage_type, stage_order) FROM stdin;
1	1	Sơ tuyển CV	SCREENING	1
2	1	Phỏng vấn Chuyên môn	INTERVIEW	2
3	1	Đề xuất Offer	OFFER	3
4	1	Trúng tuyển	HIRED	4
\.


--
-- Data for Name: pipelines; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.pipelines (id, tenant_id, name, active) FROM stdin;
1	1	Quy trình Tuyển dụng Lập trình viên Standard	t
\.


--
-- Data for Name: priority_level; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.priority_level (id, active, created_at, name, order_no, tenant_id) FROM stdin;
\.


--
-- Data for Name: recruitment_pipeline; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.recruitment_pipeline (id, active, created_at, is_default, name, tenant_id) FROM stdin;
1	t	2026-08-14 11:11:56.737807	f	Quy trình tuyển dụng mặc định	1
2	t	2026-08-20 23:22:11.580842	t	Quy trình tuyển dụng mặc định	3
\.


--
-- Data for Name: recruitment_source; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.recruitment_source (id, active, created_at, name, tenant_id) FROM stdin;
1	t	2026-08-14 11:01:07.575326	LinkedIn	1
2	t	2026-08-14 11:01:12.838483	Giới thiệu nội bộ	1
3	t	2026-08-14 11:01:17.037709	Facebook	1
4	t	2026-08-14 11:01:24.046818	Website công ty	1
5	t	2026-08-20 23:22:11.455681	Website công ty	3
6	t	2026-08-20 23:22:11.466556	LinkedIn	3
7	t	2026-08-20 23:22:11.469305	Giới thiệu nội bộ	3
8	t	2026-08-20 23:22:11.472473	Facebook	3
9	t	2026-08-20 23:22:11.476227	TopCV	3
10	t	2026-08-20 23:22:11.480052	VietnamWorks	3
\.


--
-- Data for Name: recruitment_status; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.recruitment_status (id, active, created_at, name, order_no, tenant_id) FROM stdin;
1	t	2026-08-14 11:09:48.309257	Bản nháp	1	1
2	t	2026-08-14 11:09:55.432814	Chờ duyệt	2	1
3	t	2026-08-14 11:10:04.248106	Đã duyệt	3	1
4	t	2026-08-14 11:10:14.429135	Đang tuyển	4	1
5	t	2026-08-14 11:10:23.018054	Tạm dừng	5	1
6	t	2026-08-14 11:10:30.667956	Đã đóng	6	1
7	t	2026-08-14 11:10:37.840208	Đã hủy	7	1
8	t	2026-08-20 23:22:11.533017	Bản nháp	1	3
9	t	2026-08-20 23:22:11.544761	Chờ phê duyệt	2	3
10	t	2026-08-20 23:22:11.547413	Đã phê duyệt	3	3
11	t	2026-08-20 23:22:11.549712	Đang mở	4	3
12	t	2026-08-20 23:22:11.551285	Tạm dừng	5	3
13	t	2026-08-20 23:22:11.555048	Đã đóng	6	3
14	t	2026-08-20 23:22:11.557432	Từ chối	7	3
\.


--
-- Data for Name: rejection_reason; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.rejection_reason (id, active, created_at, name, tenant_id) FROM stdin;
1	t	2026-08-14 11:02:22.164713	Không đủ kinh nghiệm	1
2	t	2026-08-14 11:02:31.69636	Không đạt phỏng vấn	1
3	t	2026-08-14 11:02:39.468884	Mức lương không phù hợp	1
4	t	2026-08-14 11:08:46.795978	Không phù hợp với yêu cầu công việc	1
5	t	2026-08-14 11:09:14.339165	Không đạt vòng sàng lọc CV	1
6	t	2026-08-14 11:09:32.503858	Kỹ năng chuyên môn chưa phù hợp	1
7	t	2026-08-20 23:22:11.508507	Không đủ kinh nghiệm	3
8	t	2026-08-20 23:22:11.517525	Không đạt yêu cầu phỏng vấn	3
9	t	2026-08-20 23:22:11.521317	Mức lương không phù hợp	3
11	t	2026-08-20 23:22:11.526807	Ứng viên tự rút hồ sơ	3
12	t	2026-08-20 23:22:11.529651	Không phù hợp văn hóa công ty	3
10	f	2026-08-20 23:22:11.524493	Vị trí đã tuyển đủ	3
\.


--
-- Data for Name: requisition_reason; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.requisition_reason (id, active, created_at, name, tenant_id) FROM stdin;
\.


--
-- Data for Name: skill; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.skill (id, active, category, created_at, name, tenant_id) FROM stdin;
1	t	Backend	2026-08-14 10:57:21.156602	Java	1
2	t	Backend	2026-08-14 10:57:34.244834	Spring Boot	1
3	t	Frontend	2026-08-14 10:57:42.807906	React	1
4	t	Frontend	2026-08-14 10:58:04.861718	TypeScript	1
5	t	Database	2026-08-14 10:58:13.413625	PostgreSQL	1
6	t	DevOps	2026-08-14 10:58:25.501651	Docker	1
7	t	Tool	2026-08-14 10:58:35.178377	Git	1
8	t	Soft skill	2026-08-14 10:58:44.393689	Communication	1
9	t	Soft skill	2026-08-14 10:58:59.948726	Problem Solving	1
10	t	\N	2026-08-21 02:58:55.730958	Jira	1
11	t	\N	2026-08-27 21:38:39.031089	CI/CD	1
\.


--
-- Data for Name: work_arrangement; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.work_arrangement (id, active, created_at, name, tenant_id) FROM stdin;
\.


--
-- Data for Name: work_location; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.work_location (id, active, address, created_at, name, tenant_id) FROM stdin;
1	t	Tầng 5, tòa nhà XYZ, Nguyễn Huệ, Q1	2026-08-14 10:56:54.764189	TP.HCM – Quận 1	1
2	t	Tầng 10, tòa nhà ABC, Nguyễn Hữu Thọ, Quận 7, TP.HCM	2026-08-14 11:06:37.892354	TP.HCM – Quận 7	1
\.


--
-- Name: catalog_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.catalog_items_id_seq', 14, true);


--
-- Name: contract_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.contract_type_id_seq', 6, true);


--
-- Name: department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.department_id_seq', 5, true);


--
-- Name: education_level_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.education_level_id_seq', 9, true);


--
-- Name: email_template_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.email_template_id_seq', 5, true);


--
-- Name: employment_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.employment_type_id_seq', 8, true);


--
-- Name: experience_level_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.experience_level_id_seq', 5, true);


--
-- Name: interview_criteria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.interview_criteria_id_seq', 5, true);


--
-- Name: job_level_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.job_level_id_seq', 7, true);


--
-- Name: job_title_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.job_title_id_seq', 8, true);


--
-- Name: pipeline_stage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.pipeline_stage_id_seq', 31, true);


--
-- Name: pipeline_stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.pipeline_stages_id_seq', 4, true);


--
-- Name: pipelines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.pipelines_id_seq', 1, true);


--
-- Name: priority_level_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.priority_level_id_seq', 1, false);


--
-- Name: recruitment_pipeline_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.recruitment_pipeline_id_seq', 2, true);


--
-- Name: recruitment_source_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.recruitment_source_id_seq', 10, true);


--
-- Name: recruitment_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.recruitment_status_id_seq', 14, true);


--
-- Name: rejection_reason_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.rejection_reason_id_seq', 12, true);


--
-- Name: requisition_reason_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.requisition_reason_id_seq', 1, false);


--
-- Name: skill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.skill_id_seq', 11, true);


--
-- Name: work_arrangement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.work_arrangement_id_seq', 1, false);


--
-- Name: work_location_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.work_location_id_seq', 2, true);


--
-- Name: catalog_items catalog_items_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.catalog_items
    ADD CONSTRAINT catalog_items_pkey PRIMARY KEY (id);


--
-- Name: contract_type contract_type_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.contract_type
    ADD CONSTRAINT contract_type_pkey PRIMARY KEY (id);


--
-- Name: department department_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (id);


--
-- Name: education_level education_level_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.education_level
    ADD CONSTRAINT education_level_pkey PRIMARY KEY (id);


--
-- Name: email_template email_template_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.email_template
    ADD CONSTRAINT email_template_pkey PRIMARY KEY (id);


--
-- Name: employment_type employment_type_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.employment_type
    ADD CONSTRAINT employment_type_pkey PRIMARY KEY (id);


--
-- Name: experience_level experience_level_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.experience_level
    ADD CONSTRAINT experience_level_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: interview_criteria interview_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.interview_criteria
    ADD CONSTRAINT interview_criteria_pkey PRIMARY KEY (id);


--
-- Name: job_level job_level_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_level
    ADD CONSTRAINT job_level_pkey PRIMARY KEY (id);


--
-- Name: job_title job_title_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_title
    ADD CONSTRAINT job_title_pkey PRIMARY KEY (id);


--
-- Name: pipeline_stage pipeline_stage_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.pipeline_stage
    ADD CONSTRAINT pipeline_stage_pkey PRIMARY KEY (id);


--
-- Name: pipeline_stages pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: pipelines pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_pkey PRIMARY KEY (id);


--
-- Name: priority_level priority_level_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.priority_level
    ADD CONSTRAINT priority_level_pkey PRIMARY KEY (id);


--
-- Name: recruitment_pipeline recruitment_pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.recruitment_pipeline
    ADD CONSTRAINT recruitment_pipeline_pkey PRIMARY KEY (id);


--
-- Name: recruitment_source recruitment_source_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.recruitment_source
    ADD CONSTRAINT recruitment_source_pkey PRIMARY KEY (id);


--
-- Name: recruitment_status recruitment_status_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.recruitment_status
    ADD CONSTRAINT recruitment_status_pkey PRIMARY KEY (id);


--
-- Name: rejection_reason rejection_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.rejection_reason
    ADD CONSTRAINT rejection_reason_pkey PRIMARY KEY (id);


--
-- Name: requisition_reason requisition_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.requisition_reason
    ADD CONSTRAINT requisition_reason_pkey PRIMARY KEY (id);


--
-- Name: skill skill_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT skill_pkey PRIMARY KEY (id);


--
-- Name: work_arrangement work_arrangement_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.work_arrangement
    ADD CONSTRAINT work_arrangement_pkey PRIMARY KEY (id);


--
-- Name: work_location work_location_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.work_location
    ADD CONSTRAINT work_location_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: pipeline_stage fk9lxntts46bipb7n3hgj34yjsc; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.pipeline_stage
    ADD CONSTRAINT fk9lxntts46bipb7n3hgj34yjsc FOREIGN KEY (pipeline_id) REFERENCES public.recruitment_pipeline(id);


--
-- Name: pipeline_stages pipeline_stages_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict wzAEVSgsWB9pUcQfdpTl4ncS8z6ThQ4fTEYhXdA0QKc802T4tjUYABFeFzPaLWx

--
-- Database "ats_notification" dump
--

--
-- PostgreSQL database dump
--

\restrict Z6xExazXzQa80ag3X9bEIeUzRS5ZgFQJd9S7GOKcGE9GCF8A7tIxn0ArHiwwtOw

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_notification; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_notification WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_notification OWNER TO ats_user;

\unrestrict Z6xExazXzQa80ag3X9bEIeUzRS5ZgFQJd9S7GOKcGE9GCF8A7tIxn0ArHiwwtOw
\connect ats_notification
\restrict Z6xExazXzQa80ag3X9bEIeUzRS5ZgFQJd9S7GOKcGE9GCF8A7tIxn0ArHiwwtOw

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    action character varying(255) NOT NULL,
    actor_user_id bigint,
    created_at timestamp(6) without time zone,
    metadata text,
    resource_id bigint,
    resource_type character varying(255),
    tenant_id bigint NOT NULL
);


ALTER TABLE public.audit_log OWNER TO ats_user;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.audit_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: notification; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.notification (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    message text,
    is_read boolean NOT NULL,
    recipient_user_id bigint NOT NULL,
    resource_id bigint,
    resource_type character varying(255),
    tenant_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    CONSTRAINT notification_type_check CHECK (((type)::text = ANY ((ARRAY['REQUISITION_PENDING_APPROVAL'::character varying, 'INTERVIEW_SCHEDULED'::character varying, 'INTERVIEW_REMINDER'::character varying, 'OFFER_PENDING_CONFIRMATION'::character varying, 'EVALUATION_INCOMPLETE_REMINDER'::character varying])::text[])))
);


ALTER TABLE public.notification OWNER TO ats_user;

--
-- Name: notification_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.notification ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.audit_log (id, action, actor_user_id, created_at, metadata, resource_id, resource_type, tenant_id) FROM stdin;
1	LOGIN	1	2026-08-13 16:38:43.587419	\N	1	USER	1
2	LOGIN	4	2026-08-13 16:40:14.770101	\N	4	USER	1
3	LOGIN	1	2026-08-13 16:40:35.080107	\N	1	USER	1
4	LOGIN	3	2026-08-13 16:41:14.894038	\N	3	USER	1
5	LOGIN	2	2026-08-13 16:41:42.140124	\N	2	USER	1
6	LOGIN	1	2026-08-13 19:22:07.118619	\N	1	USER	1
7	LOGIN	1	2026-08-14 10:53:19.263421	\N	1	USER	1
8	LOGIN	2	2026-08-14 11:15:29.265227	\N	2	USER	1
9	LOGIN	3	2026-08-14 11:16:05.554805	\N	3	USER	1
10	LOGIN	2	2026-08-14 11:26:54.721255	\N	2	USER	1
11	REQUISITION_APPROVED	2	2026-08-14 11:28:15.185406	\N	1	REQUISITION	1
12	POSTING_CREATED	2	2026-08-14 11:51:29.350256	\N	1	JOB_POSTING	1
8757	APPLICATION_STAGE_CHANGED	2	\N	Ứng tuyển → Sàng lọc CV	2	APPLICATION	1
9737	APPLICATION_REJECTED	2	\N	Từ chối hồ sơ: null	1	APPLICATION	1
12842	APPLICATION_STAGE_CHANGED	2	\N	Sàng lọc CV → Sàng lọc HR	2	APPLICATION	1
60303	LOGIN	2	2026-08-14 12:47:45.870067	\N	2	USER	1
64664	REQUISITION_CHANGES_REQUESTED	2	2026-08-14 12:48:41.088456	Điều chỉnh lại mức lương	2	REQUISITION	1
251014	LOGIN	3	2026-08-14 15:16:43.049235	\N	3	USER	1
251605	LOGIN	2	2026-08-14 15:16:53.168795	\N	2	USER	1
253481	LOGIN	3	2026-08-14 15:17:52.4711	\N	3	USER	1
447489	LOGIN	2	2026-08-14 15:59:10.360488	\N	2	USER	1
618825	APPLICATION_CREATED_PUBLIC	\N	\N	Nộp qua Career Portal	1	APPLICATION	1
618826	APPLICATION_CREATED_PUBLIC	\N	\N	Nộp qua Career Portal	2	APPLICATION	1
618827	LOGIN	2	2026-08-19 10:52:08.358529	\N	2	USER	1
618828	LOGIN	2	2026-08-19 11:02:02.115897	\N	2	USER	1
618829	LOGIN	2	2026-08-19 22:24:18.477219	\N	2	USER	1
618830	LOGIN	2	2026-08-19 23:18:57.097647	\N	2	USER	1
618831	LOGIN	2	2026-08-20 22:26:49.383526	\N	2	USER	1
618832	LOGIN	2	2026-08-20 22:54:46.004245	\N	2	USER	1
618833	LOGIN	6	2026-08-20 23:22:15.344898	\N	6	USER	3
618834	LOGIN	6	2026-08-20 23:26:43.248801	\N	6	USER	3
618835	LOGIN	2	2026-08-20 23:27:08.311781	\N	2	USER	1
618836	LOGIN	2	2026-08-21 01:23:46.546272	\N	2	USER	1
618837	LOGIN	2	2026-08-21 01:24:09.754999	\N	2	USER	1
618838	LOGIN	3	2026-08-21 01:24:30.52451	\N	3	USER	1
618839	LOGIN	3	2026-08-21 01:32:40.756879	\N	3	USER	1
618840	LOGIN	2	2026-08-21 01:49:07.823702	\N	2	USER	1
618841	LOGIN	3	2026-08-21 02:18:51.339521	\N	3	USER	1
618842	LOGIN	2	2026-08-21 02:28:35.07181	\N	2	USER	1
618843	LOGIN	3	2026-08-21 02:39:40.284214	\N	3	USER	1
618844	LOGIN	2	2026-08-21 02:50:38.495077	\N	2	USER	1
618845	REQUISITION_APPROVED	2	2026-08-21 02:51:24.597914	\N	3	REQUISITION	1
618846	LOGIN	6	2026-08-21 02:55:49.079654	\N	6	USER	3
618847	LOGIN	2	2026-08-21 02:57:26.059287	\N	2	USER	1
618848	LOGIN	3	2026-08-21 02:58:32.724558	\N	3	USER	1
618849	LOGIN	2	2026-08-21 02:59:12.196802	\N	2	USER	1
618850	LOGIN	3	2026-08-21 03:12:06.041478	\N	3	USER	1
618851	LOGIN	3	2026-08-21 03:13:48.605462	\N	3	USER	1
618852	LOGIN	2	2026-08-21 03:13:59.8413	\N	2	USER	1
618853	LOGIN	3	2026-08-21 09:25:32.240299	\N	3	USER	1
618854	LOGIN	2	2026-08-21 09:25:50.357708	\N	2	USER	1
618855	LOGIN	2	2026-08-21 09:47:11.251329	\N	2	USER	1
618856	LOGIN	2	2026-08-21 10:02:25.773073	\N	2	USER	1
618857	LOGIN	2	2026-08-21 10:02:34.519304	\N	2	USER	1
618858	LOGIN	2	2026-08-21 10:02:40.603233	\N	2	USER	1
618859	LOGIN	2	2026-08-21 10:15:18.019972	\N	2	USER	1
618860	APPLICATION_STAGE_CHANGED	2	\N	Sàng lọc HR → Phỏng vấn kỹ thuật	2	APPLICATION	1
618861	LOGIN	3	2026-08-21 10:19:34.832629	\N	3	USER	1
618862	LOGIN	3	2026-08-21 10:30:00.315978	\N	3	USER	1
618863	LOGIN	2	2026-08-21 10:30:17.300842	\N	2	USER	1
618864	LOGIN	3	2026-08-21 10:32:52.484664	\N	3	USER	1
618865	LOGIN	2	2026-08-21 10:33:38.339523	\N	2	USER	1
618866	LOGIN	2	2026-08-21 11:05:24.391476	\N	2	USER	1
618867	LOGIN	3	2026-08-21 11:08:16.781296	\N	3	USER	1
618868	LOGIN	2	2026-08-21 11:11:16.977719	\N	2	USER	1
618869	LOGIN	3	2026-08-21 12:14:00.553828	\N	3	USER	1
618870	LOGIN	2	2026-08-21 12:16:08.511155	\N	2	USER	1
618871	LOGIN	3	2026-08-21 12:22:31.16108	\N	3	USER	1
618872	LOGIN	2	2026-08-21 12:35:20.356825	\N	2	USER	1
618873	LOGIN	3	2026-08-21 12:43:06.992246	\N	3	USER	1
618874	LOGIN	2	2026-08-21 12:52:24.641671	\N	2	USER	1
618875	LOGIN	1	2026-08-21 12:53:28.507737	\N	1	USER	1
618876	APPLICATION_STAGE_CHANGED	1	\N	Phỏng vấn kỹ thuật → Đã tuyển dụng	2	APPLICATION	1
618877	LOGIN	2	2026-08-21 13:00:29.848348	\N	2	USER	1
618878	LOGIN	2	2026-08-21 13:01:21.971763	\N	2	USER	1
618879	LOGIN	3	2026-08-21 13:02:24.484055	\N	3	USER	1
618880	APPLICATION_CREATED_PUBLIC	\N	\N	Nộp qua Career Portal	3	APPLICATION	1
618881	APPLICATION_CREATED_PUBLIC	\N	\N	Nộp qua Career Portal	4	APPLICATION	1
618882	LOGIN	2	2026-08-21 13:08:19.713344	\N	2	USER	1
618883	LOGIN	3	2026-08-21 13:09:19.524422	\N	3	USER	1
618884	APPLICATION_STAGE_CHANGED	1	\N	Ứng tuyển → Sàng lọc CV	3	APPLICATION	1
618885	APPLICATION_STAGE_CHANGED	1	\N	Sàng lọc CV → Phỏng vấn kỹ thuật	3	APPLICATION	1
618886	LOGIN	3	2026-08-21 13:13:54.769011	\N	3	USER	1
618887	LOGIN	2	2026-08-21 13:15:13.228276	\N	2	USER	1
618888	LOGIN	3	2026-08-21 13:17:12.364944	\N	3	USER	1
618889	LOGIN	2	2026-08-21 13:27:09.126659	\N	2	USER	1
618890	APPLICATION_STAGE_CHANGED	2	\N	Ứng tuyển → Sàng lọc CV	4	APPLICATION	1
618891	APPLICATION_STAGE_CHANGED	2	\N	Sàng lọc CV → Phỏng vấn kỹ thuật	4	APPLICATION	1
618892	LOGIN	3	2026-08-21 13:30:50.151611	\N	3	USER	1
618925	LOGIN	2	2026-08-21 14:22:54.281542	\N	2	USER	1
618926	LOGIN	3	2026-08-21 14:24:53.271352	\N	3	USER	1
618927	LOGIN	2	2026-08-21 14:26:12.534743	\N	2	USER	1
618928	LOGIN	2	2026-08-27 00:16:58.31808	\N	2	USER	1
618929	LOGIN	2	2026-08-27 00:44:46.167094	\N	2	USER	1
618930	LOGIN	2	2026-08-27 00:51:13.801945	\N	2	USER	1
618931	LOGIN	2	2026-08-27 00:54:39.888108	\N	2	USER	1
618932	LOGIN	2	2026-08-27 00:56:05.869069	\N	2	USER	1
618933	LOGIN	2	2026-08-27 01:29:28.381951	\N	2	USER	1
618934	LOGIN	2	2026-08-27 01:30:51.660153	\N	2	USER	1
618935	LOGIN	2	2026-08-27 01:31:24.873788	\N	2	USER	1
618936	LOGIN	2	2026-08-27 01:31:52.983694	\N	2	USER	1
618937	LOGIN	2	2026-08-27 01:32:30.677014	\N	2	USER	1
618938	LOGIN	2	2026-08-27 01:32:58.130489	\N	2	USER	1
618939	LOGIN	2	2026-08-27 01:33:24.599654	\N	2	USER	1
618940	LOGIN	2	2026-08-27 01:34:04.380192	\N	2	USER	1
618941	LOGIN	2	2026-08-27 01:34:39.226301	\N	2	USER	1
618942	LOGIN	2	2026-08-27 01:35:02.543771	\N	2	USER	1
618943	LOGIN	2	2026-08-27 01:35:41.797675	\N	2	USER	1
618944	LOGIN	2	2026-08-27 01:36:25.821082	\N	2	USER	1
618945	LOGIN	2	2026-08-27 01:37:09.229214	\N	2	USER	1
618946	LOGIN	2	2026-08-27 01:37:35.92328	\N	2	USER	1
618947	LOGIN	2	2026-08-27 01:38:03.410814	\N	2	USER	1
618948	LOGIN	2	2026-08-27 01:42:14.113545	\N	2	USER	1
618949	LOGIN	2	2026-08-27 01:44:29.197612	\N	2	USER	1
618950	LOGIN	3	2026-08-27 01:50:20.593901	\N	3	USER	1
618951	LOGIN	2	2026-08-27 01:50:47.808856	\N	2	USER	1
618952	LOGIN	1	2026-08-27 01:52:05.319351	\N	1	USER	1
618953	LOGIN	2	2026-08-27 01:54:32.428632	\N	2	USER	1
618954	LOGIN	2	2026-08-27 09:44:41.520404	\N	2	USER	1
618955	LOGIN	2	2026-08-27 09:49:24.972755	\N	2	USER	1
618956	LOGIN	2	2026-08-27 09:50:09.842234	\N	2	USER	1
618957	LOGIN	2	2026-08-27 09:54:30.114128	\N	2	USER	1
618958	LOGIN	2	2026-08-27 09:58:37.382958	\N	2	USER	1
618959	LOGIN	2	2026-08-27 10:48:12.93424	\N	2	USER	1
618960	LOGIN	2	2026-08-27 10:48:43.959174	\N	2	USER	1
618961	LOGIN	2	2026-08-27 10:51:31.622427	\N	2	USER	1
618962	LOGIN	2	2026-08-27 10:55:17.322914	\N	2	USER	1
618963	LOGIN	2	2026-08-27 11:01:21.808718	\N	2	USER	1
618964	LOGIN	2	2026-08-27 11:04:49.724154	\N	2	USER	1
618965	LOGIN	2	2026-08-27 11:05:30.014908	\N	2	USER	1
618966	LOGIN	2	2026-08-27 11:12:14.054747	\N	2	USER	1
618967	LOGIN	2	2026-08-27 11:26:37.780175	\N	2	USER	1
618968	LOGIN	2	2026-08-27 11:27:25.513766	\N	2	USER	1
618969	LOGIN	2	2026-08-27 11:55:41.055221	\N	2	USER	1
618970	LOGIN	2	2026-08-27 11:56:27.30468	\N	2	USER	1
618971	LOGIN	3	2026-08-27 15:24:34.298582	\N	3	USER	1
618972	LOGIN	3	2026-08-27 21:27:47.805882	\N	3	USER	1
618973	LOGIN	3	2026-08-27 21:28:48.858551	\N	3	USER	1
618974	LOGIN	2	2026-08-27 21:29:10.4721	\N	2	USER	1
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 10:36:00.924863	0	t
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.notification (id, created_at, message, is_read, recipient_user_id, resource_id, resource_type, tenant_id, title, type) FROM stdin;
1	2026-08-14 11:24:05.897935	Yêu cầu "Yêu cầu tuyển dụng Fresher Fullstack Developer " đang chờ bạn phê duyệt.	t	2	1	REQUISITION	1	Yêu cầu tuyển dụng cần bạn phê duyệt	REQUISITION_PENDING_APPROVAL
2	2026-08-14 12:47:31.181512	Yêu cầu "Yêu cầu tuyển dụng DevOps Engineer" đang chờ bạn phê duyệt.	t	2	2	REQUISITION	1	Yêu cầu tuyển dụng cần bạn phê duyệt	REQUISITION_PENDING_APPROVAL
3	2026-08-14 12:49:02.925073	Yêu cầu "Yêu cầu tuyển dụng DevOps Engineer" đang chờ bạn phê duyệt.	t	2	2	REQUISITION	1	Yêu cầu tuyển dụng cần bạn phê duyệt	REQUISITION_PENDING_APPROVAL
4	2026-08-21 02:50:26.116228	Yêu cầu "Business Analystic" đang chờ bạn phê duyệt.	t	2	3	REQUISITION	1	Yêu cầu tuyển dụng cần bạn phê duyệt	REQUISITION_PENDING_APPROVAL
5	2026-08-21 11:59:22.452717	Bạn được phân công phỏng vấn Lê Vũ Thanh Dương lúc 2026-08-24T08:00.	t	3	2	INTERVIEW	1	Lịch phỏng vấn mới	INTERVIEW_SCHEDULED
6	2026-08-21 12:16:45.925167	Bạn được phân công phỏng vấn Lê Vũ Thanh Dương lúc 2026-08-31T08:00.	t	3	3	INTERVIEW	1	Lịch phỏng vấn mới	INTERVIEW_SCHEDULED
7	2026-08-21 13:11:49.721869	Bạn được phân công phỏng vấn Nguyễn Slot Demo lúc 08:00 ngày 21/08/2026.	t	3	4	INTERVIEW	1	Lịch phỏng vấn mới	INTERVIEW_SCHEDULED
8	2026-08-21 14:57:48.168472	Bạn được phân công phỏng vấn Nguyễn Slot Demo lúc 01:00 ngày 28/08/2026.	t	3	39	INTERVIEW	1	Lịch phỏng vấn mới	INTERVIEW_SCHEDULED
9	2026-08-26 22:58:55.760383	Vui lòng hoàn tất đánh giá cho buổi phỏng vấn Lê Vũ Thanh Dương.	t	3	2	INTERVIEW	1	Bạn chưa nộp đánh giá phỏng vấn	EVALUATION_INCOMPLETE_REMINDER
\.


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 618974, true);


--
-- Name: notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.notification_id_seq', 9, true);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- PostgreSQL database dump complete
--

\unrestrict Z6xExazXzQa80ag3X9bEIeUzRS5ZgFQJd9S7GOKcGE9GCF8A7tIxn0ArHiwwtOw

--
-- Database "ats_offer" dump
--

--
-- PostgreSQL database dump
--

\restrict JzrvcdXkIoN9hddcobAmxwhl82clbW0B8vNotaZITduglyFXjjPJ37Sl9gxubbL

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_offer; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_offer WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_offer OWNER TO ats_user;

\unrestrict JzrvcdXkIoN9hddcobAmxwhl82clbW0B8vNotaZITduglyFXjjPJ37Sl9gxubbL
\connect ats_offer
\restrict JzrvcdXkIoN9hddcobAmxwhl82clbW0B8vNotaZITduglyFXjjPJ37Sl9gxubbL

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: offer; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.offer (
    id bigint NOT NULL,
    allowance numeric(38,2),
    application_id bigint NOT NULL,
    approver_id bigint NOT NULL,
    benefits text,
    candidate_name_snapshot character varying(255),
    contract_type_id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    decline_note character varying(255),
    decline_reason_id bigint,
    deleted_at timestamp(6) without time zone,
    note text,
    probation_months integer,
    reject_reason character varying(255),
    requester_id bigint NOT NULL,
    response_deadline timestamp(6) without time zone,
    salary_offered numeric(38,2) NOT NULL,
    start_date date NOT NULL,
    status character varying(255) NOT NULL,
    tenant_id bigint,
    updated_at timestamp(6) without time zone,
    candidate_id bigint,
    CONSTRAINT offer_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'ACCEPTED'::character varying, 'DECLINED'::character varying])::text[])))
);


ALTER TABLE public.offer OWNER TO ats_user;

--
-- Name: COLUMN offer.tenant_id; Type: COMMENT; Schema: public; Owner: ats_user
--

COMMENT ON COLUMN public.offer.tenant_id IS 'DEPRECATED Phase 4: ignored by single-company runtime';


--
-- Name: offer_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.offer ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.offer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: offers; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.offers (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    application_id bigint NOT NULL,
    candidate_name_snapshot character varying(255),
    salary_offered numeric(15,2) NOT NULL,
    contract_type_id bigint NOT NULL,
    contract_type_name character varying(255),
    start_date date NOT NULL,
    probation_months integer DEFAULT 2 NOT NULL,
    benefits text,
    allowance numeric(15,2) DEFAULT 0,
    note text,
    requester_id bigint NOT NULL,
    approver_id bigint NOT NULL,
    approver_name character varying(255),
    status character varying(50) DEFAULT 'APPROVED'::character varying NOT NULL,
    response_deadline timestamp without time zone,
    reject_reason text,
    decline_reason_id bigint,
    decline_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.offers OWNER TO ats_user;

--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.offers_id_seq OWNER TO ats_user;

--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 10:36:34.82218	0	t
2	1	single company offer	SQL	V1__single_company_offer.sql	310379683	ats_user	2026-08-28 10:36:41.861657	1820	t
\.


--
-- Data for Name: offer; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.offer (id, allowance, application_id, approver_id, benefits, candidate_name_snapshot, contract_type_id, created_at, decline_note, decline_reason_id, deleted_at, note, probation_months, reject_reason, requester_id, response_deadline, salary_offered, start_date, status, tenant_id, updated_at, candidate_id) FROM stdin;
\.


--
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.offers (id, tenant_id, application_id, candidate_name_snapshot, salary_offered, contract_type_id, contract_type_name, start_date, probation_months, benefits, allowance, note, requester_id, approver_id, approver_name, status, response_deadline, reject_reason, decline_reason_id, decline_note, created_at, updated_at, deleted_at) FROM stdin;
1	1	1	Nguyễn Văn Ứng Viên	25000000.00	8	Chính thức 12 tháng	2026-09-01	2	Bảo hiểm PVI, Laptop Gaming MacBook Pro	1500000.00	\N	2	3	Lê Trưởng Phòng	APPROVED	2026-08-25 18:00:00	\N	\N	\N	2026-08-13 07:59:06.919385	2026-08-13 07:59:06.919385	\N
\.


--
-- Name: offer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.offer_id_seq', 1, false);


--
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.offers_id_seq', 1, true);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: offer offer_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.offer
    ADD CONSTRAINT offer_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: ix_offer_application_id; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX ix_offer_application_id ON public.offer USING btree (application_id);


--
-- Name: ix_offer_candidate_id; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX ix_offer_candidate_id ON public.offer USING btree (candidate_id);


--
-- PostgreSQL database dump complete
--

\unrestrict JzrvcdXkIoN9hddcobAmxwhl82clbW0B8vNotaZITduglyFXjjPJ37Sl9gxubbL

--
-- Database "ats_recruitment" dump
--

--
-- PostgreSQL database dump
--

\restrict H4NaMTrZfQBHRkaoTmIYwn78RLUm9P8L1CLsugPjrQXy0TIt3HqyKJQhG7f33Nz

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_recruitment; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_recruitment WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_recruitment OWNER TO ats_user;

\unrestrict H4NaMTrZfQBHRkaoTmIYwn78RLUm9P8L1CLsugPjrQXy0TIt3HqyKJQhG7f33Nz
\connect ats_recruitment
\restrict H4NaMTrZfQBHRkaoTmIYwn78RLUm9P8L1CLsugPjrQXy0TIt3HqyKJQhG7f33Nz

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO ats_user;

--
-- Name: job_posting; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_posting (
    id bigint NOT NULL,
    benefits text,
    closed_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone,
    deleted_at timestamp(6) without time zone,
    description text,
    employment_type_id bigint NOT NULL,
    pipeline_id bigint NOT NULL,
    pipeline_locked boolean NOT NULL,
    published_at timestamp(6) without time zone,
    requirements text,
    salary_max numeric(38,2),
    salary_min numeric(38,2),
    status character varying(255) NOT NULL,
    tenant_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    work_location_id bigint NOT NULL,
    requisition_id bigint NOT NULL,
    experience_required character varying(255),
    work_arrangement_id bigint,
    work_arrangement character varying(255),
    approved_at timestamp(6) without time zone,
    approved_by bigint,
    submitted_at timestamp(6) without time zone,
    CONSTRAINT job_posting_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'PAUSED'::character varying, 'CLOSED'::character varying])::text[]))),
    CONSTRAINT job_posting_work_arrangement_check CHECK (((work_arrangement)::text = ANY ((ARRAY['ONSITE'::character varying, 'HYBRID'::character varying, 'REMOTE'::character varying])::text[])))
);


ALTER TABLE public.job_posting OWNER TO ats_user;

--
-- Name: job_posting_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.job_posting ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.job_posting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_posting_skill; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_posting_skill (
    posting_id bigint NOT NULL,
    skill_id bigint
);


ALTER TABLE public.job_posting_skill OWNER TO ats_user;

--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_postings (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    requisition_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    employment_type_id bigint NOT NULL,
    work_location_id bigint NOT NULL,
    pipeline_id bigint NOT NULL,
    salary_min numeric(15,2),
    salary_max numeric(15,2),
    description text,
    requirements text,
    benefits text,
    status character varying(50) DEFAULT 'OPEN'::character varying,
    pipeline_locked boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.job_postings OWNER TO ats_user;

--
-- Name: job_postings_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.job_postings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_postings_id_seq OWNER TO ats_user;

--
-- Name: job_postings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.job_postings_id_seq OWNED BY public.job_postings.id;


--
-- Name: job_requisition; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_requisition (
    id bigint NOT NULL,
    approved_salary_max numeric(38,2),
    approved_salary_min numeric(38,2),
    approver_id bigint NOT NULL,
    budget numeric(38,2),
    created_at timestamp(6) without time zone,
    deleted_at timestamp(6) without time zone,
    department_id bigint NOT NULL,
    description text,
    expected_salary_max numeric(38,2),
    expected_salary_min numeric(38,2),
    expected_start_date date,
    hr_note text,
    job_level_id bigint,
    job_title_id bigint NOT NULL,
    quantity integer NOT NULL,
    reject_reason character varying(255),
    requester_id bigint NOT NULL,
    status character varying(255) NOT NULL,
    tenant_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    benefits text,
    requirements text,
    employment_type_id bigint,
    experience_required character varying(255),
    note text,
    priority character varying(255),
    reason character varying(255),
    work_arrangement character varying(255),
    work_location_id bigint,
    priority_id bigint,
    reason_id bigint,
    work_arrangement_id bigint,
    CONSTRAINT job_requisition_priority_check CHECK (((priority)::text = ANY ((ARRAY['NORMAL'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
    CONSTRAINT job_requisition_reason_check CHECK (((reason)::text = ANY ((ARRAY['NEW'::character varying, 'REPLACEMENT'::character varying, 'EXPANSION'::character varying, 'NEW_PROJECT'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT job_requisition_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CHANGES_REQUESTED'::character varying])::text[]))),
    CONSTRAINT job_requisition_work_arrangement_check CHECK (((work_arrangement)::text = ANY ((ARRAY['ONSITE'::character varying, 'HYBRID'::character varying, 'REMOTE'::character varying])::text[])))
);


ALTER TABLE public.job_requisition OWNER TO ats_user;

--
-- Name: job_requisition_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

ALTER TABLE public.job_requisition ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.job_requisition_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_requisition_skill; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_requisition_skill (
    requisition_id bigint NOT NULL,
    skill_id bigint
);


ALTER TABLE public.job_requisition_skill OWNER TO ats_user;

--
-- Name: job_requisitions; Type: TABLE; Schema: public; Owner: ats_user
--

CREATE TABLE public.job_requisitions (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    department_id bigint NOT NULL,
    hiring_manager_id bigint NOT NULL,
    headcount integer DEFAULT 1 NOT NULL,
    status character varying(50) DEFAULT 'APPROVED'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.job_requisitions OWNER TO ats_user;

--
-- Name: job_requisitions_id_seq; Type: SEQUENCE; Schema: public; Owner: ats_user
--

CREATE SEQUENCE public.job_requisitions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_requisitions_id_seq OWNER TO ats_user;

--
-- Name: job_requisitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ats_user
--

ALTER SEQUENCE public.job_requisitions_id_seq OWNED BY public.job_requisitions.id;


--
-- Name: job_postings id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_postings ALTER COLUMN id SET DEFAULT nextval('public.job_postings_id_seq'::regclass);


--
-- Name: job_requisitions id; Type: DEFAULT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_requisitions ALTER COLUMN id SET DEFAULT nextval('public.job_requisitions_id_seq'::regclass);


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	ats_user	2026-08-28 10:35:14.545524	0	t
\.


--
-- Data for Name: job_posting; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_posting (id, benefits, closed_at, created_at, deleted_at, description, employment_type_id, pipeline_id, pipeline_locked, published_at, requirements, salary_max, salary_min, status, tenant_id, title, updated_at, work_location_id, requisition_id, experience_required, work_arrangement_id, work_arrangement, approved_at, approved_by, submitted_at) FROM stdin;
1	1.\tThu nhập\n•\tMức lương: 10.000.000 – 15.000.000 VNĐ/tháng, tùy theo năng lực và kết quả phỏng vấn.\n•\tReview lương định kỳ theo chính sách công ty.\n•\tCó cơ hội tăng thu nhập theo năng lực và mức độ đóng góp.\n2.\tĐào tạo và phát triển\n•\tĐược hướng dẫn trực tiếp bởi Senior/Middle Developers.\n•\tĐược đào tạo về quy trình phát triển phần mềm thực tế.\n•\tCó cơ hội làm việc với Java, Spring Boot, React, TypeScript và PostgreSQL.\n•\tĐược tham gia các dự án thực tế và sử dụng quy trình Agile/Scrum.\n•\tCó lộ trình phát triển nghề nghiệp rõ ràng từ Fresher lên Junior và các cấp bậc cao hơn.\n•\tĐược tham gia các hoạt động chia sẻ kiến thức và technical training.\n3.\tMôi trường làm việc\n•\tMôi trường làm việc chuyên nghiệp, trẻ trung và thân thiện.\n•\tVăn hóa khuyến khích học hỏi và chia sẻ kiến thức.\n•\tLàm việc cùng đội ngũ kỹ thuật có kinh nghiệm.\n•\tĐược tham gia vào quá trình phát triển sản phẩm từ phân tích yêu cầu đến triển khai.\n4.\tChế độ\n•\tTham gia BHXH, BHYT, BHTN theo quy định và chính sách công ty.\n•\tNghỉ phép và nghỉ lễ theo quy định.\n•\tHoạt động team building và company events.\n•\tCác chế độ phúc lợi khác theo chính sách của TechCorp.	2026-08-21 00:42:11.689516	2026-08-14 11:51:29.312036	\N	1.\tMục tiêu tuyển dụng\nBộ phận Công nghệ thông tin đang mở rộng đội ngũ phát triển phần mềm và cần tuyển 02 Fresher Fullstack Developer. Vị trí này dành cho các ứng viên mới tốt nghiệp hoặc có ít kinh nghiệm, có nền tảng tốt về lập trình và mong muốn phát triển theo hướng Fullstack Developer.\nỨng viên sẽ được tham gia vào các dự án thực tế, làm việc cùng các thành viên Backend, Frontend, QA và DevOps để xây dựng, cải tiến và duy trì các ứng dụng web của công ty.\n2.\tTrách nhiệm chính\n•\tTham gia phát triển các tính năng frontend và backend cho các ứng dụng web.\n•\tXây dựng giao diện người dùng bằng React/TypeScript.\n•\tPhát triển RESTful API sử dụng Java/Spring Boot.\n•\tLàm việc với PostgreSQL hoặc các hệ quản trị cơ sở dữ liệu tương đương.\n•\tTích hợp frontend với backend thông qua REST API.\n•\tViết unit test và thực hiện kiểm thử cơ bản cho các chức năng được giao.\n•\tPhân tích và sửa lỗi trong quá trình phát triển.\n•\tTham gia code review và tuân thủ coding convention của dự án.\n•\tSử dụng Git để quản lý source code và phối hợp với các thành viên trong team.\n•\tTham gia Daily Meeting, Sprint Planning và các hoạt động Agile/Scrum.\n•\tHọc hỏi và áp dụng các công nghệ, framework và best practices mới.\n•\tPhối hợp với Senior Developer, QA, BA và các thành viên khác để hoàn thành công việc.\n\n	1	1	f	2026-08-14 11:51:29.308218	3.\tYêu cầu\n•\tTốt nghiệp hoặc sắp tốt nghiệp Đại học/Cao đẳng chuyên ngành Công nghệ thông tin, Kỹ thuật phần mềm, Khoa học máy tính hoặc các ngành liên quan.\n•\tCó kiến thức cơ bản về lập trình hướng đối tượng và cấu trúc dữ liệu.\n•\tCó kiến thức cơ bản về Java.\n•\tCó kiến thức hoặc kinh nghiệm học tập với Spring Boot là lợi thế.\n•\tCó kiến thức cơ bản về HTML, CSS và JavaScript/TypeScript.\n•\tCó kiến thức hoặc kinh nghiệm sử dụng React là lợi thế.\n•\tCó kiến thức cơ bản về SQL và PostgreSQL/MySQL.\n•\tBiết sử dụng Git và GitHub/GitLab.\n•\tCó khả năng đọc hiểu tài liệu kỹ thuật bằng tiếng Anh.\n•\tCó tư duy logic và khả năng giải quyết vấn đề tốt.\n•\tCó tinh thần học hỏi và chủ động trong công việc.\n•\tCó khả năng làm việc nhóm và giao tiếp tốt.\n4.\tKỹ năng ưu tiên\n•\tJava\n•\tSpring Boot\n•\tReact\n•\tTypeScript\n•\tPostgreSQL\n•\tREST API\n•\tGit\n•\tDocker\n•\tBasic CI/CD\n4.\tĐiểm cộng\n•\tCó project cá nhân hoặc project tại trường sử dụng Java/Spring Boot.\n•\tCó project React/TypeScript.\n•\tCó kinh nghiệm xây dựng RESTful API.\n•\tCó kinh nghiệm sử dụng Docker.\n•\tCó GitHub với các project cá nhân.\n•\tCó hiểu biết cơ bản về Microservices.\n•\tCó kinh nghiệm tham gia các cuộc thi lập trình hoặc hoạt động phát triển phần mềm.	15000000.00	10000000.00	OPEN	1	Fresher Fullstack Developer 	2026-08-27 16:41:21.24737	1	1	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: job_posting_skill; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_posting_skill (posting_id, skill_id) FROM stdin;
\.


--
-- Data for Name: job_postings; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_postings (id, tenant_id, requisition_id, title, employment_type_id, work_location_id, pipeline_id, salary_min, salary_max, description, requirements, benefits, status, pipeline_locked, created_at) FROM stdin;
1	1	1	Senior Java Backend Engineer (Microservices)	5	6	1	20000000.00	35000000.00	Xây dựng hệ thống tuyển dụng ATS Microservices quy mô lớn.	Trên 3 năm kinh nghiệm với Java, Spring Boot, RabbitMQ, PostgreSQL.	Lương tháng 13, BHXH đầy đủ, Du lịch hàng năm.	OPEN	f	2026-08-13 07:59:06.677932
\.


--
-- Data for Name: job_requisition; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_requisition (id, approved_salary_max, approved_salary_min, approver_id, budget, created_at, deleted_at, department_id, description, expected_salary_max, expected_salary_min, expected_start_date, hr_note, job_level_id, job_title_id, quantity, reject_reason, requester_id, status, tenant_id, title, updated_at, benefits, requirements, employment_type_id, experience_required, note, priority, reason, work_arrangement, work_location_id, priority_id, reason_id, work_arrangement_id) FROM stdin;
3	14500000.00	12000000.00	2	\N	2026-08-21 02:50:19.84582	\N	2	Tiếp nhận, ghi nhận và làm rõ nhu cầu phần mềm/hệ thống từ khách hàng hoặc các bên liên quan (Product Owner, Dev, QA).\nTham gia phân tích quy trình nghiệp vụ (Business Workflow) và chuyển hóa thành tài liệu tả chi tiết (BRD, SRS, User Story, Acceptance Criteria).\nVẽ các biểu đồ quy trình (Sơ đồ luồng, Use Case, Wireframe/Mockup giao diện cơ bản) phục vụ việc phát triển hệ thống.\n\nĐồng hành cùng đội ngũ kỹ thuật (Developers) và kiểm thử (QA/QC) trong quá trình phát triển sản phẩm để giải đáp thắc mắc nghiệp vụ.\nHỗ trợ nghiệm thu tính năng (UAT) và tham gia đào tạo, viết tài liệu hướng dẫn sử dụng cho người dùng cuối.	\N	\N	2026-08-24		7	7	2	\N	3	APPROVED	1	Business Analystic	2026-08-21 02:51:24.621211	Lương & Thưởng: Mức lương cạnh tranh ($... -$.../tháng) + Thưởng tháng 13 + Thưởng hiệu suất dự án.\nĐào tạo & Phát triển: Được hướng dẫn trực tiếp (Mentoring 1-1) bởi Senior BA giàu kinh nghiệm; lộ trình thăng tiến rõ ràng lên Junior/Mid-level BA.\nChế độ & Phúc lợi: Đóng BHXH, BHYT, BHTN đầy đủ theo quy định Pháp luật; Gói bảo hiểm sức khỏe tự nguyện hàng năm.\nMôi trường làm việc: Trẻ trung, năng động, khuyến khích sự sáng tạo và đóng góp ý kiến cá nhân.\nKhác: Du lịch công ty (Company Trip), Teambuilding định kỳ, cung cấp trang thiết bị làm việc hiện đại.	Kinh nghiệm:\nSinh viên mới tốt nghiệp hoặc dưới 1 năm kinh nghiệm ở vị trí BA, QC, Data Analyst hoặc các vị trí liên quan.\nƯu tiên ứng viên từng làm đồ án, dự án thực tập có xây dựng tài liệu phần mềm hoặc quy trình nghiệp vụ.\nKỹ năng & Chuyên môn:\nTốt nghiệp Đại học/Cao đẳng chuyên ngành Công nghệ thông tin, Hệ thống thông tin quản lý (MIS), Khoa học máy tính hoặc Kinh tế/Quản trị kinh doanh.\nHiểu biết cơ bản về quy trình phát triển phần mềm (SDLC) và các mô hình làm việc (Agile/Scrum, Waterfall).\nTư duy logic tốt, có khả năng phân tích vấn đề và tự học hỏi nhanh.\nSử dụng cơ bản các công cụ vẽ sơ đồ và thiết kế wireframe (Draw.io, Visio, Figma, Axure) và hệ thống quản lý dự án (Jira, Confluence).\nKhả năng đọc hiểu tài liệu chuyên ngành bằng tiếng Anh; viết và giao tiếp tiếng Anh tốt là một lợi thế lớn.\nKỹ năng giao tiếp, lắng nghe và truyền đạt thông tin rõ ràng, chủ động trong công việc.	1	2 năm		NORMAL	NEW	ONSITE	1	\N	\N	\N
1	15000000.00	10000000.00	2	30000000.00	2026-08-14 11:23:11.537183	\N	2	1.\tMục tiêu tuyển dụng\nBộ phận Công nghệ thông tin đang mở rộng đội ngũ phát triển phần mềm và cần tuyển 02 Fresher Fullstack Developer. Vị trí này dành cho các ứng viên mới tốt nghiệp hoặc có ít kinh nghiệm, có nền tảng tốt về lập trình và mong muốn phát triển theo hướng Fullstack Developer.\nỨng viên sẽ được tham gia vào các dự án thực tế, làm việc cùng các thành viên Backend, Frontend, QA và DevOps để xây dựng, cải tiến và duy trì các ứng dụng web của công ty.\n2.\tTrách nhiệm chính\n•\tTham gia phát triển các tính năng frontend và backend cho các ứng dụng web.\n•\tXây dựng giao diện người dùng bằng React/TypeScript.\n•\tPhát triển RESTful API sử dụng Java/Spring Boot.\n•\tLàm việc với PostgreSQL hoặc các hệ quản trị cơ sở dữ liệu tương đương.\n•\tTích hợp frontend với backend thông qua REST API.\n•\tViết unit test và thực hiện kiểm thử cơ bản cho các chức năng được giao.\n•\tPhân tích và sửa lỗi trong quá trình phát triển.\n•\tTham gia code review và tuân thủ coding convention của dự án.\n•\tSử dụng Git để quản lý source code và phối hợp với các thành viên trong team.\n•\tTham gia Daily Meeting, Sprint Planning và các hoạt động Agile/Scrum.\n•\tHọc hỏi và áp dụng các công nghệ, framework và best practices mới.\n•\tPhối hợp với Senior Developer, QA, BA và các thành viên khác để hoàn thành công việc.\n3.\tYêu cầu\n•\tTốt nghiệp hoặc sắp tốt nghiệp Đại học/Cao đẳng chuyên ngành Công nghệ thông tin, Kỹ thuật phần mềm, Khoa học máy tính hoặc các ngành liên quan.\n•\tCó kiến thức cơ bản về lập trình hướng đối tượng và cấu trúc dữ liệu.\n•\tCó kiến thức cơ bản về Java.\n•\tCó kiến thức hoặc kinh nghiệm học tập với Spring Boot là lợi thế.\n•\tCó kiến thức cơ bản về HTML, CSS và JavaScript/TypeScript.\n•\tCó kiến thức hoặc kinh nghiệm sử dụng React là lợi thế.\n•\tCó kiến thức cơ bản về SQL và PostgreSQL/MySQL.\n•\tBiết sử dụng Git và GitHub/GitLab.\n•\tCó khả năng đọc hiểu tài liệu kỹ thuật bằng tiếng Anh.\n•\tCó tư duy logic và khả năng giải quyết vấn đề tốt.\n•\tCó tinh thần học hỏi và chủ động trong công việc.\n•\tCó khả năng làm việc nhóm và giao tiếp tốt.\n4.\tKỹ năng ưu tiên\n•\tJava\n•\tSpring Boot\n•\tReact\n•\tTypeScript\n•\tPostgreSQL\n•\tREST API\n•\tGit\n•\tDocker\n•\tBasic CI/CD\n5.\tĐiểm cộng\n•\tCó project cá nhân hoặc project tại trường sử dụng Java/Spring Boot.\n•\tCó project React/TypeScript.\n•\tCó kinh nghiệm xây dựng RESTful API.\n•\tCó kinh nghiệm sử dụng Docker.\n•\tCó GitHub với các project cá nhân.\n•\tCó hiểu biết cơ bản về Microservices.\n•\tCó kinh nghiệm tham gia các cuộc thi lập trình hoặc hoạt động phát triển phần mềm.\n	15000000.00	10000000.00	2026-09-13		7	3	2	\N	3	APPROVED	1	Yêu cầu tuyển dụng Fresher Fullstack Developer 	2026-08-14 11:28:15.210697	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2	\N	\N	2	3000000.00	2026-08-14 12:47:20.330462	\N	2	Hỗ trợ xây dựng và quản lý CI/CD pipeline.\nLàm việc với Docker và các môi trường triển khai.\nHỗ trợ quản lý Linux server và cloud infrastructure.\nTheo dõi hệ thống, xử lý lỗi và cải thiện hiệu năng.\nPhối hợp với Developer để triển khai ứng dụng.\n\nYêu cầu:\n\nSinh viên CNTT hoặc ngành liên quan.\nCó kiến thức cơ bản về Linux, Git, Docker.\nBiết CI/CD, AWS/Azure/GCP là lợi thế.\nCó tinh thần học hỏi, chủ động và làm việc nhóm tốt.	3000000.00	0.00	2026-08-30	Điều chỉnh lại mức lương	1	5	1	\N	3	PENDING_APPROVAL	1	Yêu cầu tuyển dụng DevOps Engineer	2026-08-14 12:49:03.072504	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: job_requisition_skill; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_requisition_skill (requisition_id, skill_id) FROM stdin;
3	8
\.


--
-- Data for Name: job_requisitions; Type: TABLE DATA; Schema: public; Owner: ats_user
--

COPY public.job_requisitions (id, tenant_id, title, department_id, hiring_manager_id, headcount, status, created_at) FROM stdin;
1	1	Tuyển dụng Senior Java Developer Q3	1	3	2	APPROVED	2026-08-13 07:59:06.67249
\.


--
-- Name: job_posting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.job_posting_id_seq', 1, true);


--
-- Name: job_postings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.job_postings_id_seq', 1, true);


--
-- Name: job_requisition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.job_requisition_id_seq', 3, true);


--
-- Name: job_requisitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ats_user
--

SELECT pg_catalog.setval('public.job_requisitions_id_seq', 1, true);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: job_posting job_posting_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_posting
    ADD CONSTRAINT job_posting_pkey PRIMARY KEY (id);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: job_requisition job_requisition_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_requisition
    ADD CONSTRAINT job_requisition_pkey PRIMARY KEY (id);


--
-- Name: job_requisitions job_requisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_requisitions
    ADD CONSTRAINT job_requisitions_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: ats_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: job_posting fk77u9bel2bibiu9kecq5a87wfn; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_posting
    ADD CONSTRAINT fk77u9bel2bibiu9kecq5a87wfn FOREIGN KEY (requisition_id) REFERENCES public.job_requisition(id);


--
-- Name: job_posting_skill fkk4ya7e1tqifvf5etglarpyysb; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_posting_skill
    ADD CONSTRAINT fkk4ya7e1tqifvf5etglarpyysb FOREIGN KEY (posting_id) REFERENCES public.job_posting(id);


--
-- Name: job_requisition_skill fklba4vvp8qj7vm30622d6m7p6i; Type: FK CONSTRAINT; Schema: public; Owner: ats_user
--

ALTER TABLE ONLY public.job_requisition_skill
    ADD CONSTRAINT fklba4vvp8qj7vm30622d6m7p6i FOREIGN KEY (requisition_id) REFERENCES public.job_requisition(id);


--
-- PostgreSQL database dump complete
--

\unrestrict H4NaMTrZfQBHRkaoTmIYwn78RLUm9P8L1CLsugPjrQXy0TIt3HqyKJQhG7f33Nz

--
-- Database "ats_user" dump
--

--
-- PostgreSQL database dump
--

\restrict wFslUaggjaO8YZRYPkEKq1e9j4rvSDNlQ3Daj5FqgxSydcnDx9uuabJW0Paztxr

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ats_user; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE ats_user WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE ats_user OWNER TO ats_user;

\unrestrict wFslUaggjaO8YZRYPkEKq1e9j4rvSDNlQ3Daj5FqgxSydcnDx9uuabJW0Paztxr
\connect ats_user
\restrict wFslUaggjaO8YZRYPkEKq1e9j4rvSDNlQ3Daj5FqgxSydcnDx9uuabJW0Paztxr

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict wFslUaggjaO8YZRYPkEKq1e9j4rvSDNlQ3Daj5FqgxSydcnDx9uuabJW0Paztxr

--
-- Database "postgres" dump
--

--
-- PostgreSQL database dump
--

\restrict y0txeNAxyvCq7d0Max0P10chY9Y05ft2Ec0oWc88qrpkVFto2NQq2G1PkLXfuGt

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE postgres;
--
-- Name: postgres; Type: DATABASE; Schema: -; Owner: ats_user
--

CREATE DATABASE postgres WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE postgres OWNER TO ats_user;

\unrestrict y0txeNAxyvCq7d0Max0P10chY9Y05ft2Ec0oWc88qrpkVFto2NQq2G1PkLXfuGt
\connect postgres
\restrict y0txeNAxyvCq7d0Max0P10chY9Y05ft2Ec0oWc88qrpkVFto2NQq2G1PkLXfuGt

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE postgres; Type: COMMENT; Schema: -; Owner: ats_user
--

COMMENT ON DATABASE postgres IS 'default administrative connection database';


--
-- PostgreSQL database dump complete
--

\unrestrict y0txeNAxyvCq7d0Max0P10chY9Y05ft2Ec0oWc88qrpkVFto2NQq2G1PkLXfuGt

--
-- PostgreSQL database cluster dump complete
--

