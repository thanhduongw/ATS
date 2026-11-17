"""Reset demo + tạo lại toàn bộ dữ liệu demo lĩnh vực IT bằng API thật.

    ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py            # reset rồi tạo lại (mất khoảng 30–45 phút)
    ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py --no-reset # chỉ tạo (DB phải đang trống)

Cần: 11 service + gateway đang chạy, Postgres trong container `ats-postgres`, RabbitMQ, ai-service có khoá LLM.
Mọi tài khoản dùng mật khẩu `Password123!`, email miền example.com (hệ thống không gửi thư thật tới miền này).

Mọi dữ liệu nghiệp vụ được tạo bằng API qua gateway để AI chấm thật và thông báo / nhật ký sinh thật.
NHỮNG CHỖ CHỈNH DB CÓ KIỂM SOÁT (API không cho làm):
  1. reset_db.bootstrap_auth: dòng `company` và tài khoản Quản trị đầu tiên.
  2. activate(): bỏ qua bước nhập mã OTP gửi qua email của ứng viên (đặt ACTIVE + email_verified).
  3. shift_interview(): lịch phỏng vấn chỉ tạo được ở tương lai → dời `scheduled_at` về quá khứ để có buổi đã diễn ra.
  4. expire_offer(): đặt hạn phản hồi của một thư mời về quá khứ; job của offer-service tự chuyển sang "Hết hạn".
  5. Clock.backdate(): dời mọi mốc thời gian sinh ra trong lúc script chạy về 3 tháng gần đây (xem lib.Clock).
  6. fixups(): vài mốc phụ thuộc job nền (thư mời hết hạn) cho khớp với dòng thời gian.
"""
from __future__ import annotations

import datetime as dt
import json
import random
import sys
import time

from cv_pdf import build_cv
from images import logo, poster
from jobs import BENEFITS, CAREERS_HERO, COMMON_BENEFITS, COMPANY, LIFE_PHOTOS, REQUISITIONS, STAFF
from lib import ADMIN_EMAIL, PASSWORD, Api, ApiError, Clock, content_of, log, psql, sql_str, wait_until
from people import APPS, CANDIDATES, SCHOOLS, TRACKS
from reset_db import reset

NOW = dt.datetime.now()
RND = random.Random(20261116)
clock = Clock()


def ago(days: float, hour: int | None = None, minute: int | None = None) -> dt.datetime:
    d = NOW - dt.timedelta(days=days)
    if hour is not None:
        d = d.replace(hour=hour, minute=minute or 0, second=0, microsecond=0)
    return d


def workday(d: dt.datetime) -> dt.datetime:
    """Lùi/tiến khỏi Chủ nhật cho tự nhiên (công ty làm thứ Hai – thứ Bảy sáng thì vẫn coi như ngày làm việc)."""
    return d + dt.timedelta(days=1) if d.weekday() == 6 else d


def future_slot(days: int, hour: int, minute: int = 0) -> dt.datetime:
    d = (NOW + dt.timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return workday(d)


def iso(d: dt.datetime) -> str:
    return d.strftime("%Y-%m-%dT%H:%M:%S")


def pick(items: list[dict], keyword: str, what: str) -> dict:
    k = keyword.casefold()
    for it in items:
        if k in str(it.get("name", "")).casefold():
            return it
    raise RuntimeError(f"Không thấy {what} chứa '{keyword}' trong danh mục: {[i.get('name') for i in items]}")


# ================================================================ 1. Danh mục, công ty, người dùng
class Ctx:
    cat: dict[str, list[dict]] = {}
    users: dict[str, dict] = {}      # khoá nhân viên -> {id, email, api, dept}
    postings: dict[str, dict] = {}   # khoá tin -> JobPostingResponse (+ hr, hm)
    cands: dict[str, dict] = {}      # khoá ứng viên -> {id, api}
    apps: list[dict] = []


def load_catalogs(admin: Api) -> None:
    for key, path in {
        "dept": "departments", "title": "job-titles", "level": "job-levels", "emp": "employment-types",
        "loc": "work-locations", "contract": "contract-types", "edu": "education-levels",
        "source": "recruitment-sources", "reason": "rejection-reasons", "criteria": "interview-criteria",
        "skill": "skills", "pipeline": "pipelines",
    }.items():
        Ctx.cat[key] = content_of(admin.get(f"/masterdata/{path}"))
    log("Danh mục: " + ", ".join(f"{k}={len(v)}" for k, v in Ctx.cat.items()))


def skill_ids(names: list[str]) -> list[int]:
    by_name = {s["name"].casefold(): s["id"] for s in Ctx.cat["skill"]}
    return [by_name[n.casefold()] for n in names if n.casefold() in by_name]


def setup_company(admin: Api) -> None:
    clock.at(ago(92, 9, 15))
    logo_url = admin.upload("/auth/files/images", "logo-moc-lam.png", logo(COMPANY["brandColor"]), "image/png", folder="logo")["url"]
    body = dict(COMPANY)
    body["logoUrl"] = logo_url
    body["benefits"] = json.dumps([{"title": b["title"], "description": b["description"]} for b in BENEFITS], ensure_ascii=False)
    admin.put("/auth/company", body)
    photos = []
    for kind, title, caption in LIFE_PHOTOS:
        url = admin.upload("/auth/files/images", f"{kind}.png", poster(kind, title), "image/png", folder="careers")["url"]
        photos.append({"url": url, "caption": caption})
    config = {
        "visible": {"hero": True, "featured": True, "life": True, "benefits": True, "offices": True, "footer": True},
        # Không đặt ảnh bìa: phần đầu trang dùng màu thương hiệu.
        "hero": {"coverUrl": "", **CAREERS_HERO},
        "featured": {"title": "Vị trí nổi bật", "count": 3},
        "life": {"title": "Một tuần ở Mộc Lam", "photos": photos},
        "benefits": {"title": "Chăm lo để bạn tập trung làm điều giỏi nhất", "items": BENEFITS},
        "offices": {"title": "Văn phòng"},
    }
    admin.put("/auth/careers-page/draft", {"config": json.dumps(config, ensure_ascii=False)})
    admin.post("/auth/careers-page/publish")
    log("Đã cấu hình công ty và xuất bản trang tuyển dụng")


def create_staff(admin: Api) -> None:
    clock.at(ago(91, 10, 0))
    for key, name, email, role, dept_kw, phone in STAFF:
        dept = pick(Ctx.cat["dept"], dept_kw, "phòng ban")
        admin.post("/auth/admin/users", {
            "email": email, "fullName": name, "tempPassword": PASSWORD, "role": role, "phone": phone,
            "departmentId": dept["id"], "status": "ACTIVE",
        })
    listing = {u["email"]: u for u in admin.get("/auth/users")}
    for key, name, email, role, dept_kw, phone in STAFF:
        Ctx.users[key] = {"id": listing[email]["id"], "email": email, "name": name, "api": Api(email),
                          "dept": listing[email]["departmentId"]}
    Ctx.users["admin"] = {"id": listing[ADMIN_EMAIL]["id"], "email": ADMIN_EMAIL, "api": admin, "dept": None}
    # Người phụ trách bảo vệ dữ liệu = chuyên viên tuyển dụng thứ nhất.
    company = admin.get("/auth/company")
    company["dataProtectionOfficerId"] = Ctx.users["hr1"]["id"]
    admin.put("/auth/company", {k: v for k, v in company.items() if k not in ("id", "privacyPolicyUpdatedAt")})
    log(f"Đã tạo {len(STAFF)} tài khoản nội bộ")


# ================================================================ 2. Yêu cầu tuyển dụng và tin
def create_requisitions() -> None:
    pipeline = next(p for p in Ctx.cat["pipeline"] if p.get("isDefault") and p.get("active", True))
    for r in REQUISITIONS:
        hm, hr = Ctx.users[r["hm"]], Ctx.users[r["hr"]]
        published = r.get("published")
        created = (published + 6) if published else r["created"]
        office = pick(Ctx.cat["loc"], r["office"], "văn phòng")
        emp = pick(Ctx.cat["emp"], r.get("employment", "Toàn thời gian"), "loại hình")
        clock.at(ago(created, 14, 20))
        req = hm["api"].post("/recruitment/requisitions", {
            "title": r["title"], "departmentId": hm["dept"],
            "jobTitleId": pick(Ctx.cat["title"], r["jobTitle"], "chức danh")["id"],
            "jobLevelId": pick(Ctx.cat["level"], r["level"], "cấp bậc")["id"],
            "quantity": r["quantity"], "employmentTypeId": emp["id"], "workLocationId": office["id"],
            "workArrangement": r["arrangement"], "experienceRequired": r["experience"], "reason": r["reason"],
            "priority": r["priority"], "note": r["note"],
            "expectedSalaryMin": r["salary"][0], "expectedSalaryMax": r["salary"][1],
            "expectedStartDate": (NOW + dt.timedelta(days=30)).strftime("%Y-%m-%d"),
            "description": r["description"], "requirements": r["requirements"], "benefits": COMMON_BENEFITS,
            "skillIds": skill_ids(r["skills"]),
        })
        rid = req["id"]
        if r["final"] == "DRAFT":
            continue
        clock.at(ago(created - 0.05, 15, 5))
        hm["api"].post(f"/recruitment/requisitions/{rid}/submit")
        if r["final"] == "PENDING_APPROVAL":
            continue
        clock.at(ago(created - 2, 9, 40))
        if r["final"] == "CHANGES_REQUESTED":
            hr["api"].post(f"/recruitment/requisitions/{rid}/request-changes", {"note": r["changeNote"]})
            continue
        if r["final"] == "REJECTED":
            hr["api"].post(f"/recruitment/requisitions/{rid}/reject", {"reason": r["rejectReason"]})
            continue
        hr["api"].post(f"/recruitment/requisitions/{rid}/approve", {
            "approvedSalaryMin": r["approved"][0], "approvedSalaryMax": r["approved"][1],
            "note": "Đã thống nhất khung lương với phòng. Chuyên viên tuyển dụng sẽ soạn tin trong tuần.",
        })
        # --- tin tuyển dụng
        clock.at(ago(published + 1, 10, 30))
        posting = hr["api"].post("/recruitment/postings", {
            "requisitionId": rid, "title": r["title"], "employmentTypeId": emp["id"], "workLocationId": office["id"],
            "workArrangement": r["arrangement"], "experienceRequired": r["experience"], "pipelineId": pipeline["id"],
            "salaryMin": r["approved"][0], "salaryMax": r["approved"][1], "description": r["description"],
            "requirements": r["requirements"], "benefits": COMMON_BENEFITS, "skillIds": skill_ids(r["skills"]),
            "applicationDeadline": (NOW + dt.timedelta(days=28)).strftime("%Y-%m-%d"),
            "urgent": r.get("urgent", False), "showSalary": True,
        })
        hr["api"].patch(f"/recruitment/postings/{posting['id']}/submit-review")
        clock.at(ago(published, 8, 45))
        posting = hr["api"].patch(f"/recruitment/postings/{posting['id']}/publish")
        posting.update(hr=hr, hm=hm, spec=r, stages=pipeline["stages"])
        Ctx.postings[r["key"]] = posting
    log(f"Đã tạo {len(REQUISITIONS)} yêu cầu tuyển dụng, {len(Ctx.postings)} tin đang mở")


# ================================================================ 3. Ứng viên và đơn ứng tuyển
def activate(email: str) -> None:
    """Chỉnh DB có kiểm soát: thay cho bước nhập mã OTP gửi qua email."""
    psql("ats_auth", f"update app_user set status='ACTIVE', email_verified=true where email={sql_str(email)};")


def profile_body(c: dict) -> dict:
    track = TRACKS[c["track"]]
    edu = pick(Ctx.cat["edu"], "Đại học", "trình độ")
    return {
        "fullName": c["name"], "phone": c["phone"].replace(" ", ""), "dateOfBirth": c["dob"], "gender": c["gender"],
        "address": c["city"], "currentPosition": track["title"], "educationLevelId": edu["id"],
        "skillIds": skill_ids(track["skills"]),
    }


def create_candidate(key: str, first_applied: dt.datetime, hr: dict) -> None:
    c = CANDIDATES[key]
    email = key + "@example.com"
    pdf = build_cv(c)
    filename = "CV_" + "_".join(c["name"].split()) + ".pdf"
    if c.get("account", True):
        clock.at(first_applied - dt.timedelta(minutes=14))
        Api().post("/auth/register", {
            "fullName": c["name"], "email": email, "password": PASSWORD, "confirmPassword": PASSWORD,
            "phone": c["phone"].replace(" ", ""), "consentAccepted": True,
        })
        activate(email)
        api = wait_until(lambda: Api(email), timeout=30, what=f"đăng nhập {email}")
        wait_until(lambda: api.get("/candidate/me"), timeout=60, what=f"hồ sơ ứng viên {email}")
        api.call("PATCH", "/candidate/me", json=profile_body(c))
        api.upload("/candidate/me/resume", filename, pdf, "application/pdf")
        Ctx.cands[key] = {"id": None, "api": api, "spec": c}
    else:
        clock.at(first_applied - dt.timedelta(minutes=9))
        body = profile_body(c)
        body.update(email=email, internalNote=f"Nguồn: {c['source']}. Hồ sơ do chuyên viên tuyển dụng nhập.")
        created = hr["api"].post("/candidate/candidates", body)
        hr["api"].upload(f"/candidate/candidates/{created['id']}/cv", filename, pdf, "application/pdf")
        Ctx.cands[key] = {"id": created["id"], "api": None, "spec": c}


def wait_ai(hr: dict, app_id: int) -> dict:
    """Chờ AI chấm xong đơn này (để mọi mốc của đơn nằm gọn trong cùng một mốc thời gian giả)."""
    pending = {None, "", "PENDING", "QUEUED", "PROCESSING", "RUNNING", "IN_PROGRESS"}
    try:
        return wait_until(lambda: (lambda a: a if a.get("aiStatus") not in pending else None)(
            hr["api"].get(f"/application/applications/{app_id}")), timeout=240, every=3, what=f"AI chấm đơn {app_id}")
    except TimeoutError:
        log(f"  !! AI chưa chấm xong đơn {app_id} sau 4 phút, đi tiếp")
        return hr["api"].get(f"/application/applications/{app_id}")


def rescore(hr: dict, app_id: int, tries: int = 3) -> dict:
    """Mô hình ngôn ngữ đôi lúc báo quá tải (503) làm lần chấm đầu thất bại: gọi "Chấm lại" như nút trên giao diện."""
    app = hr["api"].get(f"/application/applications/{app_id}")
    for attempt in range(tries):
        if app.get("aiStatus") == "COMPLETED":
            break
        time.sleep(6 * (attempt + 1))
        try:
            hr["api"].call("POST", f"/v1/ai/scores/{app_id}/rescore", timeout=150)
        except ApiError as e:
            log(f"  chấm lại đơn {app_id} lần {attempt + 1} chưa được: {str(e)[:120]}")
        time.sleep(2)
        app = wait_ai(hr, app_id)
    return app


def create_applications() -> None:
    sources = Ctx.cat["source"]
    self_sources = ["Trang tuyển dụng của công ty", "Trang tuyển dụng của công ty", "ITviec", "TopDev", "LinkedIn", "Nhóm Facebook"]
    order = sorted(APPS, key=lambda a: -a[3])
    first_seen: dict[str, dt.datetime] = {}
    for cand_key, post_key, outcome, days, opts in order:
        applied = ago(days, RND.choice([8, 9, 10, 11, 13, 14, 16, 19, 20, 21]), RND.randint(2, 57))
        posting = Ctx.postings[post_key]
        hr = posting["hr"]
        if cand_key not in Ctx.cands:
            first_seen[cand_key] = applied
            create_candidate(cand_key, applied, hr)
        cand = Ctx.cands[cand_key]
        clock.at(applied)
        if cand["api"]:
            source = pick(sources, RND.choice(self_sources), "nguồn")
            app = cand["api"].post("/application/applications", {
                "jobPostingId": posting["id"], "recruitmentSourceId": source["id"], "consentAccepted": True,
                "note": None,
            })
        else:
            source = pick(sources, cand["spec"]["source"], "nguồn")
            app = hr["api"].post("/application/applications", {
                "candidateId": cand["id"], "jobPostingId": posting["id"], "recruitmentSourceId": source["id"],
                "assignedRecruiterId": hr["id"],
            })
        scored = wait_ai(hr, app["id"])
        if scored.get("aiStatus") != "COMPLETED":
            scored = rescore(hr, app["id"])
        Ctx.apps.append({"id": app["id"], "cand": cand, "cand_key": cand_key, "posting": posting, "outcome": outcome,
                         "applied": applied, "days": days, "opts": opts, "hr": hr, "hm": posting["hm"]})
        log(f"  đơn #{app['id']} {cand['spec']['name']} → {post_key} ({outcome}); AI: {scored.get('aiStatus')} "
            f"{scored.get('aiScore')} {scored.get('aiTier')}{' ⚠ CV bất thường' if scored.get('aiInjectionDetected') else ''}")
    log(f"Đã tạo {len(Ctx.cands)} ứng viên, {len(Ctx.apps)} đơn ứng tuyển")


# ================================================================ 4. Kịch bản từng đơn
def after(app: dict, days: float, hour: int, minute: int = 0) -> dt.datetime:
    d = (app["applied"] + dt.timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return min(workday(d), NOW - dt.timedelta(minutes=20))


def opt(app: dict, name: str, default: float) -> float:
    return app["opts"].get(name, default)


def assign(app: dict) -> None:
    if app["cand"]["api"] is None:
        return  # đơn do chuyên viên nhập đã có người phụ trách
    clock.at(after(app, 1, 9, RND.randint(5, 50)))
    app["hr"]["api"].patch(f"/application/applications/{app['id']}/assign-recruiter", {"assignedRecruiterId": app["hr"]["id"]})


def advance(app: dict, when: dt.datetime, note: str | None = None) -> dict:
    clock.at(when)
    return app["hr"]["api"].patch(f"/application/applications/{app['id']}/advance-stage", {"note": note})


def reject(app: dict, when: dt.datetime, reason_kw: str, note: str) -> None:
    clock.at(when)
    reason = pick(Ctx.cat["reason"], reason_kw, "lý do từ chối")
    app["hr"]["api"].patch(f"/application/applications/{app['id']}/reject", {"rejectionReasonId": reason["id"], "note": note})


def comment(app: dict, when: dt.datetime, who: dict, text: str) -> None:
    clock.at(when)
    who["api"].post(f"/application/applications/{app['id']}/comments", {"content": text})


MEETING = "https://meet.google.com/"


def schedule(app: dict, when: dt.datetime, slot: dt.datetime, online: bool, second: bool = False,
             replace: int | None = None) -> dict:
    clock.at(when)
    interviewers = [app["hm"]["id"]] + ([app["hr"]["id"]] if second else [])
    body = {
        "applicationId": app["id"], "scheduledAt": iso(slot), "durationMinutes": 60,
        "format": "ONLINE" if online else "OFFLINE", "interviewerIds": interviewers,
        "note": "Phỏng vấn chuyên môn 45 phút, 15 phút cuối dành cho câu hỏi của ứng viên.",
    }
    if online:
        code = "".join(RND.choice("abcdefghijkmnopqrstuvwxyz") for _ in range(10))
        body["meetingLink"] = f"{MEETING}{code[:3]}-{code[3:7]}-{code[7:]}"
    else:
        body["workLocationId"] = app["posting"]["workLocationId"]
    if replace:
        body["replaceInterviewId"] = replace
    return app["hr"]["api"].post("/interview/interviews", body)


def hm_confirm(app: dict, iv: dict, when: dt.datetime) -> None:
    clock.at(when)
    try:
        app["hm"]["api"].patch(f"/interview/interviews/{iv['id']}/hm-confirm")
    except ApiError as e:
        if e.status != 400:  # đã tự xác nhận vì người tạo lịch cũng là người phỏng vấn
            raise


def cand_confirm(app: dict, iv: dict, when: dt.datetime) -> None:
    clock.at(when)
    app["cand"]["api"].patch(f"/interview/interviews/{iv['id']}/confirm")


def shift_interview(iv: dict, real: dt.datetime) -> None:
    """Chỉnh DB có kiểm soát: lịch chỉ tạo được ở tương lai, dời về thời điểm đã diễn ra."""
    psql("ats_interview", f"update interview set scheduled_at = timestamp '{real:%Y-%m-%d %H:%M:%S}' where id = {iv['id']};")


EVAL_NOTES = {
    "STRONG_YES": "Nắm rất chắc nền tảng, trả lời rõ ràng kèm ví dụ từ dự án thật. Phần thiết kế hệ thống đưa ra được phương án và nêu được điểm đánh đổi. Đề xuất tuyển.",
    "YES": "Kiến thức đủ cho vị trí, kinh nghiệm dự án đúng với việc nhóm đang cần. Còn hơi chậm ở phần thiết kế nhưng tiếp thu gợi ý nhanh. Đồng ý tuyển.",
    "NO": "Trả lời được phần lý thuyết cơ bản nhưng chưa giải được bài thực hành trong thời gian cho phép, kinh nghiệm thực tế còn mỏng so với yêu cầu của vị trí.",
}
EVAL_SCORES = {"STRONG_YES": [5, 5, 4, 5, 5, 4, 5, 4], "YES": [4, 4, 3, 4, 4, 4, 5, 3], "NO": [3, 2, 2, 2, 3, 4, 4, 3]}


def evaluate(app: dict, iv: dict, who: dict, when: dt.datetime, rec: str, salary: int | None = None) -> None:
    clock.at(when)
    scores = [{"criteriaId": c["id"], "score": EVAL_SCORES[rec][i % 8]} for i, c in enumerate(Ctx.cat["criteria"]) if c.get("active", True)]
    body = {"overallRecommendation": rec, "generalComment": EVAL_NOTES[rec], "scores": scores}
    if salary:
        body["salaryProposed"] = salary
        body["salaryNote"] = "Mức đề xuất nằm trong khung đã duyệt, phù hợp với kinh nghiệm của ứng viên."
    who["api"].post(f"/interview/interviews/{iv['id']}/evaluations", body)


def past_interview(app: dict, rec: str | None, second: bool = False, second_pending: bool = False,
                   salary: int | None = None) -> dict:
    """Một buổi phỏng vấn đã diễn ra: đặt lịch → hai bên xác nhận → (dời về quá khứ) → nộp đánh giá."""
    iv_day = opt(app, "iv", 9)
    slot_real = after(app, iv_day, RND.choice([9, 10, 14, 15]), RND.choice([0, 30]))
    iv = schedule(app, after(app, opt(app, "to_iv", 4), 11, 10), dt.datetime.now() + dt.timedelta(hours=3),
                  online=RND.random() < 0.5, second=second)
    hm_confirm(app, iv, after(app, opt(app, "to_iv", 4), 15, 40))
    cand_confirm(app, iv, after(app, opt(app, "to_iv", 4) + 1, 8, 25))
    shift_interview(iv, slot_real)
    iv["real"] = slot_real
    if rec:
        done = slot_real + dt.timedelta(hours=2, minutes=RND.randint(5, 50))
        evaluate(app, iv, app["hm"], done, rec, salary)
        if second and not second_pending:
            evaluate(app, iv, app["hr"], done + dt.timedelta(hours=1), "YES" if rec != "NO" else "NO")
    return iv


def make_offer(app: dict, when: dt.datetime, deadline: dt.datetime, start: dt.date) -> dict:
    advance(app, when - dt.timedelta(minutes=25), "Hội đồng phỏng vấn thống nhất mời nhận việc.")
    clock.at(when)
    contract = pick(Ctx.cat["contract"], "12 tháng", "loại hợp đồng")
    salary = app["opts"].get("salary", app["posting"]["salaryMin"])
    # DB bắt hạn phản hồi phải trước ngày đi làm, mà hạn phản hồi chỉ đặt được ở tương lai: tạo với ngày đi làm ở
    # tương lai, ngày thật (trong quá khứ, với thư đã có phản hồi) được đặt lại ở fixups().
    api_start = max(start, (deadline + dt.timedelta(days=7)).date())
    app["offer_start"] = start if start != api_start else None
    return app["hr"]["api"].post("/offer/offers", {
        "applicationId": app["id"], "salaryOffered": salary, "contractTypeId": contract["id"],
        "startDate": api_start.strftime("%Y-%m-%d"), "startTime": "08:30:00", "probationMonths": 2,
        "reportingManager": app["hm"]["name"], "workLocationId": app["posting"]["workLocationId"],
        "currency": "VND", "payFrequency": "Hằng tháng",
        "performanceBonus": "Thưởng theo quý, tối đa 1,5 tháng lương mỗi quý",
        "annualLeaveDays": 15, "responseDeadline": iso(deadline),
        "benefits": COMMON_BENEFITS, "allowance": 1_500_000,
        "note": "Mức lương theo đề xuất của trưởng bộ phận sau phỏng vấn.",
        "candidateVisibleNote": "Rất mong được đón bạn về nhóm. Nếu cần trao đổi thêm, bạn cứ gọi cho mình.",
        "approverId": app["hr"]["id"],
    })


def run_scenario(app: dict) -> None:
    o = app["outcome"]
    hr, hm, cand = app["hr"], app["hm"], app["cand"]
    name = cand["spec"]["name"].split()[-1]
    if o == "new":
        if app["days"] >= 2:
            assign(app)
        return
    assign(app)
    if o == "rej_applied":
        reject(app, after(app, 3, 10, 15), app["opts"]["reason"], "Kinh nghiệm chưa liên quan tới vị trí. Đã gửi thư cảm ơn.")
        return
    advance(app, after(app, opt(app, "screen", 2), 9, RND.randint(10, 55)), "Hồ sơ đạt yêu cầu cơ bản, chuyển sàng lọc.")
    if o == "screen":
        if app["days"] >= 5:
            comment(app, after(app, 3, 16, 20), hr, f"Đã gọi cho {name}, bạn ấy có thể phỏng vấn vào buổi chiều các ngày trong tuần.")
        return
    if o == "auto_closed":
        return
    if o == "rej_screen":
        reject(app, after(app, 5, 14, 5), app["opts"]["reason"], "Đã trao đổi qua điện thoại, chưa phù hợp ở thời điểm này.")
        return
    if o == "withdraw":
        clock.at(after(app, 4, 20, 40))
        cand["api"].patch(f"/application/applications/my/{app['id']}/withdraw")
        return

    # ----- các kết cục có phỏng vấn
    to_iv = opt(app, "to_iv", 4)
    advance(app, after(app, to_iv, 10, 35), "Qua vòng sàng lọc, mời phỏng vấn chuyên môn.")
    if o.startswith("iv_") and o not in ("iv_done", "iv_noshow"):
        slot = future_slot(app["opts"]["iv_in"], RND.choice([9, 10, 14, 15]), RND.choice([0, 30]))
        online = o in ("iv_confirmed", "iv_declined", "iv_wait_cand")
        iv = schedule(app, after(app, to_iv, 11, 5), slot, online)
        if o == "iv_wait_hm":
            return
        if o == "iv_hm_propose":
            clock.at(after(app, to_iv + 1, 9, 20))
            hm["api"].patch(f"/interview/interviews/{iv['id']}/hm-reject", {
                "proposedScheduledAt": iso(slot + dt.timedelta(days=1, hours=1)),
                "note": "Sáng hôm đó tôi có buổi họp kế hoạch quý, xin dời sang hôm sau.",
            })
            return
        hm_confirm(app, iv, after(app, to_iv, 16, 15))
        if o == "iv_wait_cand":
            return
        if o == "iv_confirmed":
            cand_confirm(app, iv, after(app, to_iv + 1, 8, 50))
            return
        if o == "iv_declined":
            clock.at(after(app, to_iv + 1, 21, 10))
            cand["api"].patch(f"/interview/interviews/{iv['id']}/candidate-decline", {
                "reason": "Em có lịch bảo vệ đồ án vào đúng buổi đó, xin phép dời sang tuần sau ạ.",
            })
            return
        if o == "iv_cancelled":
            clock.at(after(app, to_iv + 3, 9, 30))
            hr["api"].patch(f"/interview/interviews/{iv['id']}/cancel")
            comment(app, after(app, to_iv + 3, 9, 35), hr, "Trưởng bộ phận đi công tác đột xuất, huỷ buổi cũ và đặt lại lịch mới.")
            schedule(app, after(app, to_iv + 3, 9, 50), future_slot(app["opts"]["iv_in"], 14, 0), online=False)
            return
    if o == "iv_noshow":
        iv = past_interview(app, None)
        clock.at(iv["real"] + dt.timedelta(minutes=40))
        hm["api"].patch(f"/interview/interviews/{iv['id']}/no-show")
        reject(app, iv["real"] + dt.timedelta(days=1), "Không phản hồi", "Ứng viên không tham gia buổi phỏng vấn và không nghe máy.")
        return
    if o == "iv_done":
        past_interview(app, "YES", second=app["opts"].get("second_interviewer", False),
                       second_pending=app["opts"].get("second_pending", False))
        return
    if o == "rej_interview":
        iv = past_interview(app, "NO")
        reject(app, iv["real"] + dt.timedelta(days=2), "Chưa đạt bài phỏng vấn", "Cảm ơn bạn đã dành thời gian. Hồ sơ được lưu lại cho các vị trí phù hợp hơn.")
        return

    # ----- thư mời
    salary = app["opts"].get("salary")
    rec = "STRONG_YES" if o == "hired" else "YES"
    iv = past_interview(app, rec, second=app["opts"].get("second_interviewer", False), salary=salary)
    offer_at = after(app, opt(app, "offer", 11), 14, 30)
    sent_at = after(app, opt(app, "sent", 12), 9, 15)
    respond_at = after(app, opt(app, "respond", 14), 19, 45)
    start = (respond_at + dt.timedelta(days=17)).date()
    if o in ("offer_draft", "offer_sent"):
        start = (NOW + dt.timedelta(days=21)).date()
    deadline = NOW + dt.timedelta(days=4 if o != "offer_expired" else 1)
    deadline = deadline.replace(hour=17, minute=0, second=0, microsecond=0)
    offer = make_offer(app, offer_at, deadline, start)
    app["offer_id"] = offer["id"]
    app["offer_deadline"] = (sent_at + dt.timedelta(days=5)).replace(hour=17, minute=0, second=0)
    if o == "offer_draft":
        return
    clock.at(sent_at)
    hr["api"].patch(f"/offer/offers/{offer['id']}/send")
    if o == "offer_sent":
        return
    if o == "offer_expired":
        expired = (sent_at + dt.timedelta(days=5)).replace(hour=17, minute=0, second=0)
        psql("ats_offer", "set session_replication_role = replica; "
             f"update offer set response_deadline = timestamp '{expired:%Y-%m-%d %H:%M:%S}' where id = {offer['id']};")
        app["expired_offer"] = (offer["id"], expired)
        return
    clock.at(respond_at)
    if o == "hired":
        cand["api"].patch(f"/offer/offers/{offer['id']}/accept")
        wait_until(lambda: hr["api"].get(f"/application/applications/{app['id']}").get("currentStageType") == "HIRED",
                   timeout=60, what=f"đơn {app['id']} chuyển Đã tuyển")
        time.sleep(1.5)  # các đơn khác của ứng viên tự đóng
    elif o == "offer_declined":
        reason = pick(Ctx.cat["reason"], "Đã nhận việc ở công ty khác", "lý do")
        cand["api"].patch(f"/offer/offers/{offer['id']}/decline", {
            "declineReasonId": reason["id"], "note": "Em cảm ơn công ty, em đã nhận lời một nơi gần nhà hơn ạ.",
        })


def run_scenarios() -> None:
    # Đơn cũ trước: hợp với thứ tự thực tế và để "đã nhận việc" đóng các đơn khác sau khi chúng đã có lịch sử riêng.
    for app in sorted(Ctx.apps, key=lambda a: (a["outcome"] == "hired", -a["days"])):
        try:
            run_scenario(app)
            log(f"  kịch bản đơn #{app['id']} ({app['outcome']}) xong")
        except Exception as e:  # ghi rõ rồi đi tiếp để không mất cả lượt chạy vì một đơn
            log(f"  !! đơn #{app['id']} {app['cand_key']} ({app['outcome']}): {e}")


# ================================================================ 5. Kết thúc
def close_postings() -> None:
    for key, days in (("DE", 20), ("DO", 10)):
        p = Ctx.postings[key]
        clock.at(ago(days, 17, 10))
        status = "CLOSED" if p["spec"]["posting"] == "CLOSED" else "PAUSED"
        p["hr"]["api"].patch(f"/recruitment/postings/{p['id']}/status", {"status": status})
    log("Đã tạm dừng tin DevOps, đóng tin Kỹ sư Dữ liệu")


def wait_expiry() -> None:
    pending = [a for a in Ctx.apps if a.get("expired_offer")]
    if not pending:
        return
    log("Chờ job của offer-service chuyển thư mời quá hạn sang Hết hạn (tối đa 6 phút)…")
    for a in pending:
        oid = a["expired_offer"][0]
        try:
            wait_until(lambda: a["hr"]["api"].get(f"/offer/offers/{oid}").get("status") == "EXPIRED",
                       timeout=400, every=10, what="thư mời hết hạn")
        except TimeoutError:
            log(f"  !! thư mời {oid} chưa chuyển Hết hạn — job sẽ tự chạy sau")


def fixups() -> None:
    """Chỉnh DB có kiểm soát sau khi dời thời gian."""
    for a in Ctx.apps:
        if a.get("expired_offer"):
            oid, when = a["expired_offer"]
            stamp = f"timestamp '{when:%Y-%m-%d %H:%M:%S}'"
            psql("ats_offer", f"set session_replication_role = replica; update offer set expired_at = {stamp} where id = {oid} and status = 'EXPIRED';")
            psql("ats_notification", f"update audit_log set created_at = {stamp} where action = 'OFFER_EXPIRED' and resource_id = {oid};")
    # Thư mời đã có phản hồi: ngày đi làm và hạn phản hồi thật nằm trong quá khứ (xem make_offer).
    for a in Ctx.apps:
        if a.get("offer_start") and a["outcome"] in ("hired", "offer_declined", "offer_expired"):
            psql("ats_offer", "set session_replication_role = replica; "
                 f"update offer set start_date = date '{a['offer_start']:%Y-%m-%d}', "
                 f"response_deadline = timestamp '{a['offer_deadline']:%Y-%m-%d %H:%M:%S}' where id = {a['offer_id']};")
    align_ai_timestamps()
    # Thông báo cũ hơn 10 ngày coi như đã đọc, để chuông không báo hàng chục tin từ ba tháng trước.
    cols = psql("ats_notification", "select column_name from information_schema.columns where table_name='notification'")
    if "is_read" in cols:
        psql("ats_notification", "update notification set is_read = true where created_at < now() - interval '10 days';")
    elif "read" in cols:
        psql("ats_notification", "update notification set read = true where created_at < now() - interval '10 days';")


def align_ai_timestamps() -> None:
    """ai-service ghi giờ UTC nên Clock.backdate không dời được: đặt mốc chấm điểm = lúc nộp đơn + 1 phút."""
    rows = psql("ats_application", "select id, to_char(applied_at - interval '7 hours' + interval '1 minute', 'YYYY-MM-DD HH24:MI:SS') from application")
    if not rows:
        return
    values = ",".join(f"({r.split('|')[0]}, timestamp '{r.split('|')[1]}')" for r in rows)
    psql("ats_ai", f"""
        create temp table _t(app_id bigint, ts timestamp); insert into _t values {values};
        update ai_scores s set scored_at = t.ts, created_at = t.ts - interval '40 seconds', updated_at = t.ts
            from _t t where s.application_id = t.app_id;
        update ai_jobs j set created_at = s.created_at, started_at = s.created_at, completed_at = s.scored_at
            from ai_scores s where s.ai_job_id = j.id;
        update cv_extractions c set created_at = s.created_at, updated_at = s.created_at
            from ai_scores s where s.cv_extraction_id = c.id;""", check=False)
    psql("ats_application", "update application set ai_updated_at = applied_at + interval '1 minute' where ai_updated_at is not null;")


def rescore_failed() -> None:
    """Chạy riêng: `seed.py --rescore-failed` — chấm lại các đơn AI chấm lỗi (vd. mô hình quá tải lúc tạo dữ liệu)."""
    hr = {"api": Api("tran.ha@example.com")}
    for a in content_of(hr["api"].get("/application/applications", size=500)):
        if a.get("aiStatus") != "COMPLETED":
            done = rescore(hr, a["id"])
            log(f"  đơn #{a['id']} {a['candidateName']}: {done.get('aiStatus')} {done.get('aiScore')} {done.get('aiTier')}")
    align_ai_timestamps()


def summary() -> None:
    hr = Ctx.users["hr1"]["api"]
    apps = content_of(hr.get("/application/applications", size=500))
    by_stage: dict[str, int] = {}
    for a in apps:
        k = a["currentStageType"] + ("/" + a["closedReason"] if a.get("closedReason") else "")
        by_stage[k] = by_stage.get(k, 0) + 1
    ivs = content_of(hr.get("/interview/interviews"))
    by_iv: dict[str, int] = {}
    for i in ivs:
        by_iv[i["status"]] = by_iv.get(i["status"], 0) + 1
    offers = content_of(hr.get("/offer/offers", size=200))
    by_offer: dict[str, int] = {}
    for o in offers:
        by_offer[o["status"]] = by_offer.get(o["status"], 0) + 1
    log(f"Đơn ứng tuyển ({len(apps)}): {by_stage}")
    log(f"Phỏng vấn ({len(ivs)}): {by_iv}")
    log(f"Thư mời ({len(offers)}): {by_offer}")
    log("AI: " + str({a['aiTier'] or a['aiStatus']: sum(1 for x in apps if (x['aiTier'] or x['aiStatus']) == (a['aiTier'] or a['aiStatus'])) for a in apps}))


SERVICE_PORTS = {
    "api-gateway": 8080, "auth-service": 8081, "masterdata-service": 8082, "recruitment-service": 8083,
    "candidate-service": 8084, "interview-service": 8085, "notification-service": 8086, "dashboard-service": 8087,
    "ai-service": 8088, "application-service": 8089, "offer-service": 8090,
}


def preflight() -> None:
    """Thiếu một service thì dữ liệu tạo ra sẽ dở dang — kiểm tra trước khi xoá gì."""
    import socket
    down = []
    for name, port in SERVICE_PORTS.items():
        with socket.socket() as sock:
            sock.settimeout(2)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                down.append(name)
    if down:
        sys.exit("Chưa chạy: " + ", ".join(down) + ". Khởi động đủ service rồi chạy lại (scripts/dev/svc.sh restart <tên>).")


def main() -> None:
    if "--rescore-failed" in sys.argv:
        rescore_failed()
        return
    preflight()
    if "--no-reset" not in sys.argv:
        reset()
    global clock
    clock = Clock()
    admin = Api(ADMIN_EMAIL)
    load_catalogs(admin)
    setup_company(admin)
    create_staff(admin)
    create_requisitions()
    create_applications()
    run_scenarios()
    close_postings()
    wait_expiry()
    log("Dời thời gian về 3 tháng gần đây…")
    clock.backdate()
    fixups()
    summary()
    log(f"Xong. Quản trị: {ADMIN_EMAIL} · Tuyển dụng: tran.ha@example.com · Trưởng bộ phận: nguyen.long@example.com · "
        f"Ứng viên: nguyen.khanh@example.com · Mật khẩu chung: {PASSWORD}")


if __name__ == "__main__":
    main()
