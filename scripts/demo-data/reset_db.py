"""Reset demo: xoá TOÀN BỘ dữ liệu và tài khoản trong mọi DB ats_*, giữ nguyên schema và lịch sử migration.

    ai-service/.venv/Scripts/python.exe scripts/demo-data/reset_db.py            # hỏi lại trước khi xoá
    ai-service/.venv/Scripts/python.exe scripts/demo-data/reset_db.py --yes      # xoá luôn

Sau khi xoá:
  1. Tạo lại đúng 2 thứ mà API không tự tạo được (không có API "đăng ký quản trị đầu tiên"):
     dòng `company` duy nhất và tài khoản Quản trị doanh nghiệp đầu tiên (mật khẩu băm bằng pgcrypto/bcrypt).
  2. Khởi động lại masterdata-service để `DefaultDataSeeder` nạp lại danh mục mặc định lĩnh vực IT
     (phòng ban, chức danh, cấp bậc, kỹ năng, nguồn, lý do từ chối, tiêu chí, mẫu email, quy trình 6 giai đoạn).

KHÔNG xoá file trên S3 (CV, ảnh): chỉ dữ liệu trong Postgres.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys

from lib import (ADMIN_EMAIL, ADMIN_NAME, COMPANY_NAME, DATABASES, KEEP_TABLES, PASSWORD, ROOT, Api, db_exists, log,
                 psql, sql_str, wait_until)


def truncate_all() -> None:
    keep = ",".join(sql_str(t) for t in KEEP_TABLES)
    for db in DATABASES:
        if not db_exists(db):
            continue
        tables = psql(db, f"select tablename from pg_tables where schemaname='public' and tablename not in ({keep})")
        if not tables:
            log(f"  {db}: không có bảng")
            continue
        names = ", ".join(f'public."{t}"' for t in tables)
        psql(db, f"truncate table {names} restart identity cascade;")
        log(f"  {db}: đã xoá {len(tables)} bảng")


def bootstrap_auth() -> None:
    """Chỉnh DB có kiểm soát: công ty + quản trị viên đầu tiên. Mọi tài khoản khác được tạo qua API."""
    psql("ats_auth", f"""
        create extension if not exists pgcrypto;
        insert into role(name) select n from (values ('COMPANY_ADMIN'),('RECRUITER'),('HIRING_MANAGER'),('CANDIDATE')) v(n)
            where not exists (select 1 from role r where r.name = v.n);
        insert into company(name) values ({sql_str(COMPANY_NAME)});
        insert into app_user(email, password_hash, full_name, role_id, status, email_verified)
        values ({sql_str(ADMIN_EMAIL)}, crypt({sql_str(PASSWORD)}, gen_salt('bf', 10)), {sql_str(ADMIN_NAME)},
                (select id from role where name = 'COMPANY_ADMIN'), 'ACTIVE', true);
    """)
    log(f"  đã tạo công ty và quản trị viên {ADMIN_EMAIL}")


def git_bash() -> str:
    """Trên Windows, `bash` trong PATH của Python thường là bash của WSL; cần bash của Git để chạy svc.sh."""
    git = shutil.which("git")
    if os.name == "nt" and git:
        root = os.path.dirname(os.path.dirname(os.path.abspath(git)))
        for candidate in (os.path.join(root, "bin", "bash.exe"), os.path.join(os.path.dirname(root), "bin", "bash.exe")):
            if os.path.exists(candidate):
                return candidate
    return "bash"


def reseed_masterdata(restart: bool = True) -> None:
    if restart:
        log("  khởi động lại masterdata-service để nạp danh mục mặc định…")
        script = "scripts/dev/svc.sh"
        try:
            subprocess.run([git_bash(), script, "restart", "masterdata-service"], cwd=ROOT, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except (OSError, subprocess.CalledProcessError) as e:
            log(f"  !! không tự khởi động lại được ({e}). Hãy tự khởi động lại masterdata-service rồi chạy tiếp.")
    admin = wait_until(lambda: Api(ADMIN_EMAIL), timeout=120, every=3, what="đăng nhập quản trị")
    wait_until(lambda: len(admin.get("/masterdata/departments")) >= 6 and len(admin.get("/masterdata/pipelines")) >= 1,
               timeout=300, every=3, what="masterdata nạp danh mục mặc định")
    log("  danh mục mặc định đã sẵn sàng")


def reset(restart_masterdata: bool = True) -> None:
    log("Xoá dữ liệu mọi DB ats_* …")
    truncate_all()
    bootstrap_auth()
    reseed_masterdata(restart_masterdata)


if __name__ == "__main__":
    if "--yes" not in sys.argv:
        answer = input("Xoá TOÀN BỘ dữ liệu và tài khoản trong các DB ats_* trên máy này? Gõ 'xoa' để tiếp tục: ")
        if answer.strip().lower() != "xoa":
            sys.exit("Đã huỷ.")
    reset(restart_masterdata="--no-restart" not in sys.argv)
    log("Xong. Đăng nhập: " + ADMIN_EMAIL + " / " + PASSWORD)
