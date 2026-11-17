"""Phần dùng chung của bộ script dữ liệu demo: cấu hình, gọi psql trong container, gọi API qua gateway, đồng hồ giả lập.

Chạy bằng Python của ai-service (đã có requests, PyMuPDF, Pillow):
    ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py
"""
from __future__ import annotations

import datetime as dt
import os
import subprocess
import sys
import time

import requests

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
API = os.environ.get("ATS_API", "http://localhost:8080/api")
PG_CONTAINER = os.environ.get("ATS_PG_CONTAINER", "ats-postgres")
PG_USER = os.environ.get("ATS_PG_USER", "ats_user")
PASSWORD = "Password123!"
ADMIN_EMAIL = "le.quan@example.com"
ADMIN_NAME = "Lê Minh Quân"
COMPANY_NAME = "Mộc Lam Software"
# Mọi DB của hệ thống. ats_user / ats_dashboard hiện không có bảng nhưng vẫn quét để script không phải sửa khi có.
DATABASES = [
    "ats_auth", "ats_masterdata", "ats_recruitment", "ats_candidate", "ats_application", "ats_interview",
    "ats_offer", "ats_notification", "ats_dashboard", "ats_ai", "ats_ai_test", "ats_user",
]
# Bảng không bao giờ xoá: lịch sử migration và bảng vai trò cố định (4 dòng, mã nguồn tham chiếu theo tên).
KEEP_TABLES = ("flyway_schema_history", "alembic_version", "role")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def log(msg: str) -> None:
    print(f"[{dt.datetime.now():%H:%M:%S}] {msg}", flush=True)


# ---------------------------------------------------------------- Postgres (psql trong container)
def psql(db: str, sql: str, check: bool = True) -> list[str]:
    """Chạy SQL bằng psql trong container Postgres, trả về các dòng kết quả (cột ngăn bằng '|')."""
    proc = subprocess.run(
        ["docker", "exec", "-i", PG_CONTAINER, "psql", "-U", PG_USER, "-d", db, "-At", "-q", "-v", "ON_ERROR_STOP=1"],
        input=sql.encode("utf-8"), capture_output=True,
    )
    if proc.returncode != 0 and check:
        raise RuntimeError(f"psql {db} lỗi: {proc.stderr.decode('utf-8', 'replace')[-800:]}\nSQL: {sql[:400]}")
    return [line for line in proc.stdout.decode("utf-8", "replace").splitlines() if line.strip()]


def db_exists(db: str) -> bool:
    return bool(psql("postgres", f"select 1 from pg_database where datname='{db}'", check=False))


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


# ---------------------------------------------------------------- API
class ApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, body: str):
        super().__init__(f"{method} {path} -> {status}: {body[:400]}")
        self.status = status
        self.body = body


class Api:
    """Một phiên đăng nhập. Mọi lời gọi đi qua gateway như giao diện thật."""

    def __init__(self, email: str | None = None, password: str = PASSWORD):
        self.s = requests.Session()
        self.email = email
        self.password = password
        if email:
            self.login(email, password)

    def login(self, email: str, password: str = PASSWORD) -> None:
        r = self.s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
        if r.status_code != 200:
            raise ApiError("POST", "/auth/login", r.status_code, r.text)
        self.s.headers["Authorization"] = "Bearer " + r.json()["accessToken"]
        self.email = email

    def call(self, method: str, path: str, **kw):
        last: Exception | None = None
        for attempt in range(4):
            try:
                r = self.s.request(method, API + path, timeout=kw.pop("timeout", 90), **kw)
            except requests.RequestException as e:  # gateway đang khởi động lại…
                last = e
                time.sleep(3)
                continue
            if r.status_code in (502, 503, 504) and attempt < 3:
                last = ApiError(method, path, r.status_code, r.text)
                time.sleep(4)
                continue
            if r.status_code == 401 and self.email and attempt == 0 and not path.startswith("/auth/login"):
                # Access token chỉ sống vài chục phút mà script chạy lâu hơn: đăng nhập lại rồi gọi lại.
                self.login(self.email, self.password)
                continue
            if r.status_code >= 400:
                raise ApiError(method, path, r.status_code, r.text)
            if not r.content:
                return None
            ctype = r.headers.get("content-type", "")
            return r.json() if "json" in ctype else r.content
        raise last or RuntimeError("không gọi được API")

    def get(self, path: str, **params):
        return self.call("GET", path, params={k: v for k, v in params.items() if v is not None})

    def post(self, path: str, body=None, **kw):
        return self.call("POST", path, json=body if body is not None else {}, **kw)

    def put(self, path: str, body=None):
        return self.call("PUT", path, json=body if body is not None else {})

    def patch(self, path: str, body=None):
        return self.call("PATCH", path, json=body) if body is not None else self.call("PATCH", path)

    def upload(self, path: str, filename: str, data: bytes, mime: str, **params):
        return self.call("POST", path, files={"file": (filename, data, mime)}, params=params)


def content_of(page):
    """API danh sách trả mảng hoặc trang {content: [...]}."""
    if isinstance(page, dict) and "content" in page:
        return page["content"]
    return page or []


def wait_until(fn, timeout: float = 60, every: float = 1.0, what: str = ""):
    end = time.time() + timeout
    while True:
        try:
            v = fn()
            if v:
                return v
        except ApiError:
            pass
        if time.time() > end:
            raise TimeoutError(f"quá {timeout:.0f}s vẫn chưa xong: {what}")
        time.sleep(every)


# ---------------------------------------------------------------- Đồng hồ giả lập
class Clock:
    """Trải dữ liệu ra 3 tháng mà vẫn tạo bằng API thật.

    API luôn ghi thời điểm "bây giờ". Script đánh dấu: "từ lúc này, việc đang làm xảy ra vào thời điểm giả X".
    Cuối cùng `backdate()` dời mọi cột thời gian nằm trong khoảng script chạy về thời điểm giả tương ứng
    (giữ nguyên khoảng cách vài giây giữa các thao tác trong cùng một mốc). Giá trị ở tương lai (lịch phỏng vấn
    sắp tới, hạn nộp, hạn phản hồi) nằm ngoài khoảng nên không bị đụng tới.
    """

    def __init__(self):
        self.start = dt.datetime.now()
        self.marks: list[tuple[dt.datetime, dt.datetime]] = []

    def at(self, fake: dt.datetime) -> None:
        # Chờ sự kiện bất đồng bộ của mốc trước (thông báo, nhật ký qua RabbitMQ) ghi xong rồi mới sang mốc mới.
        time.sleep(0.7)
        now = dt.datetime.now()
        limit = now - dt.timedelta(minutes=5)
        self.marks.append((now, min(fake, limit)))

    def backdate(self) -> None:
        end = dt.datetime.now() + dt.timedelta(seconds=5)
        values = ",".join(f"(timestamp '{r:%Y-%m-%d %H:%M:%S.%f}', timestamp '{f:%Y-%m-%d %H:%M:%S}')" for r, f in self.marks)
        for db in DATABASES:
            if not db_exists(db):
                continue
            cols = psql(db, """
                select table_name, column_name, data_type from information_schema.columns
                where table_schema='public' and data_type in ('timestamp without time zone','timestamp with time zone')
                  and table_name not in ('flyway_schema_history','alembic_version')""")
            if not cols:
                continue
            # Tắt trigger trong phiên này: offer-service khoá sửa thư mời đã niêm phong, ở đây chỉ dời mốc thời gian.
            sql = ["set session_replication_role = replica;",
                   f"create temp table _marks(real_ts timestamp, fake_ts timestamp); insert into _marks values {values};"]
            for line in cols:
                table, col, dtype = line.split("|")
                # Cột có múi giờ (ai-service) so theo giờ Việt Nam để khớp với đồng hồ máy chạy script.
                local = f'("{col}" at time zone \'Asia/Ho_Chi_Minh\')' if "with time zone" in dtype else f'"{col}"'
                back = " at time zone 'Asia/Ho_Chi_Minh'" if "with time zone" in dtype else ""
                sql.append(f"""
                    update public."{table}" t set "{col}" = (
                        select (m.fake_ts + ({local} - m.real_ts)){back} from _marks m
                        where m.real_ts <= {local} order by m.real_ts desc limit 1)
                    where {local} >= timestamp '{self.marks[0][0]:%Y-%m-%d %H:%M:%S.%f}'
                      and {local} <= timestamp '{end:%Y-%m-%d %H:%M:%S}';""")
            psql(db, "\n".join(sql))
            log(f"  đã dời thời gian trong {db} ({len(cols)} cột)")
