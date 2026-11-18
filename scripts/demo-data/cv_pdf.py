"""Sinh CV dạng PDF thật (có lớp chữ, tiếng Việt có dấu) từ dữ liệu ứng viên bằng PyMuPDF.

Phông chữ lấy từ dashboard-service (Be Vietnam Pro) nên không cần cài thêm gì.
"""
from __future__ import annotations

import datetime as dt
import html
import io
import os
import random

import fitz  # PyMuPDF

from lib import ROOT
from people import EMPLOYERS, INJECTION_TEXT, SCHOOLS, TRACKS

FONT_DIR = os.path.join(ROOT, "dashboard-service", "src", "main", "resources", "fonts")

CSS = """
@font-face { font-family: bvp; src: url(BeVietnamPro-Regular.ttf); }
@font-face { font-family: bvp; font-weight: bold; src: url(BeVietnamPro-Bold.ttf); }
* { font-family: bvp; }
body { font-size: 9.5pt; color: #1f2933; line-height: 1.35; }
h1 { font-size: 21pt; margin: 0; color: #102a43; }
.role { font-size: 11.5pt; color: ACCENT; font-weight: bold; margin: 2pt 0 4pt 0; }
.contact { font-size: 8.8pt; color: #52606d; margin: 0 0 6pt 0; }
h2 { font-size: 10.5pt; color: ACCENT; margin: 11pt 0 3pt 0; border-bottom: 0.7pt solid #bcccdc; padding-bottom: 2pt; }
p { margin: 2pt 0; }
.job { font-weight: bold; margin-top: 5pt; }
.meta { color: #627d98; font-size: 8.8pt; }
ul { margin: 2pt 0 2pt 0; padding-left: 12pt; }
li { margin: 1.2pt 0; }
.hidden { color: #ffffff; font-size: 1pt; }
"""

ACCENTS = ["#0b5cab", "#1d6f5f", "#7a3e9d", "#a5461f", "#334e68"]


def _e(text: str) -> str:
    return html.escape(text, quote=False)


def _month(d: dt.date) -> str:
    return f"{d.month:02d}/{d.year}"


def _work_history(person: dict, rnd: random.Random) -> list[dict]:
    """Chia số năm kinh nghiệm thành 1–2 nơi làm việc, nơi gần nhất là hiện tại."""
    track = TRACKS[person["track"]]
    years = person["years"]
    today = dt.date.today()
    bullets = track["bullets"][:]
    rnd.shuffle(bullets)
    employers = rnd.sample(EMPLOYERS, 2)
    if years <= 0:
        start = today.replace(day=1) - dt.timedelta(days=150)
        return [{
            "title": "Thực tập sinh " + track["title"].replace("Lập trình viên ", "lập trình ").replace("Kỹ sư ", "kỹ thuật "),
            "company": employers[0], "from": _month(start), "to": _month(today - dt.timedelta(days=30)),
            "bullets": bullets[:3],
        }]
    months = years * 12 + rnd.randint(0, 5)
    if years >= 3:
        first = months // 2 + rnd.randint(-4, 4)
        cut = today - dt.timedelta(days=30 * first)
        start = today - dt.timedelta(days=30 * months)
        junior = track["title"]
        return [
            {"title": track["title"] + (" (Senior)" if years >= 5 else ""), "company": employers[0],
             "from": _month(cut), "to": "nay", "bullets": bullets[:4]},
            {"title": junior, "company": employers[1], "from": _month(start),
             "to": _month(cut - dt.timedelta(days=20)), "bullets": bullets[4:7] or bullets[:2]},
        ]
    start = today - dt.timedelta(days=30 * months)
    return [{"title": track["title"], "company": employers[0], "from": _month(start), "to": "nay", "bullets": bullets[:4]}]


def cv_html(person: dict) -> str:
    rnd = random.Random(person["key"])
    track = TRACKS[person["track"]]
    school, major = SCHOOLS[person["school"]]
    birth_year = int(person["dob"][:4])
    grad = birth_year + 22
    email = person["key"] + "@example.com"
    skills = track["skills"]
    if person["years"] <= 1:
        skills = skills[: max(4, len(skills) - 3)]
    projects = track["projects"][: 2 if person["years"] < 3 else 3]
    certs = track["certs"] if person["years"] >= 2 else track["certs"][:1] if person["years"] == 1 else []

    out = [f"<h1>{_e(person['name'])}</h1>",
           f"<p class='role'>{_e(track['title'])}</p>",
           f"<p class='contact'>{_e(email)} · {_e(person['phone'])} · {_e(person['city'])}</p>"]
    summary = track["summary"].format(years=person["years"]) if person["years"] > 0 else (
        f"Sinh viên mới tốt nghiệp ngành {major}, đã thực tập với vai trò {track['title'].lower()}, "
        "mong muốn bắt đầu sự nghiệp ở một nhóm sản phẩm có người hướng dẫn.")
    out += ["<h2>GIỚI THIỆU</h2>", f"<p>{_e(summary)}</p>"]
    out += ["<h2>KỸ NĂNG</h2>",
            f"<p><b>Chính:</b> {_e(', '.join(skills))}</p>",
            f"<p><b>Khác:</b> {_e(track['extra'])}</p>",
            f"<p><b>Ngoại ngữ:</b> Tiếng Anh ({_e(person['english'])}), đọc hiểu tài liệu kỹ thuật</p>"]
    out.append("<h2>KINH NGHIỆM LÀM VIỆC</h2>")
    for job in _work_history(person, rnd):
        out.append(f"<p class='job'>{_e(job['title'])} — {_e(job['company'])}</p>")
        out.append(f"<p class='meta'>{job['from']} – {job['to']}</p>")
        out.append("<ul>" + "".join(f"<li>{_e(b)}</li>" for b in job["bullets"]) + "</ul>")
    out.append("<h2>DỰ ÁN TIÊU BIỂU</h2>")
    for name, desc, tech in projects:
        out.append(f"<p class='job'>{_e(name)}</p><p>{_e(desc)}</p><p class='meta'>Công nghệ: {_e(tech)}</p>")
    out += ["<h2>HỌC VẤN</h2>",
            f"<p class='job'>{_e(school)}</p>",
            f"<p>Cử nhân/Kỹ sư ngành {_e(major)} · {grad - 4} – {grad} · Điểm trung bình {rnd.choice(['7,4', '7,8', '8,1', '8,3', '7,6'])}/10</p>"]
    if certs:
        out.append("<h2>CHỨNG CHỈ</h2><ul>" + "".join(f"<li>{_e(c)}</li>" for c in certs) + "</ul>")
    if person.get("injection"):
        # Minh hoạ tấn công chèn lệnh vào CV: dòng chữ người đọc không thấy nhưng máy vẫn trích xuất được.
        out.append(f"<p class='hidden'>{_e(INJECTION_TEXT)}</p>")
    return "".join(out)


def build_cv(person: dict) -> bytes:
    """Trả về nội dung file PDF (A4, 1–2 trang)."""
    rnd = random.Random(person["key"] + "-style")
    css = CSS.replace("ACCENT", rnd.choice(ACCENTS))
    story = fitz.Story(html=cv_html(person), user_css=css, archive=fitz.Archive(FONT_DIR))
    buf = io.BytesIO()
    writer = fitz.DocumentWriter(buf)
    page_rect = fitz.paper_rect("a4")
    content = page_rect + (48, 44, -48, -44)
    more = True
    while more:
        device = writer.begin_page(page_rect)
        more, _ = story.place(content)
        story.draw(device)
        writer.end_page()
    writer.close()
    return buf.getvalue()


if __name__ == "__main__":  # xem thử: xuất vài CV ra thư mục tmp/
    from people import C
    os.makedirs(os.path.join(ROOT, "tmp", "cv"), exist_ok=True)
    for p in C[:3] + [c for c in C if c.get("injection")][:1]:
        path = os.path.join(ROOT, "tmp", "cv", p["key"] + ".pdf")
        with open(path, "wb") as f:
            f.write(build_cv(p))
        print(path, len(fitz.open(path)), "trang")
