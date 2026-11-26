"""Sơ đồ use case tổng quát của hệ thống ATS, vẽ theo phong cách Visual Paradigm (SVG).

Chạy: python docs/bao-cao/so-do/usecase_tong_quat.py  → ghi usecase_tong_quat.svg cạnh file này.

Nguồn đối chiếu (đã rà trong code):
- Vai trò & menu: frontend/src/routes/AppRoutes.tsx, frontend/src/layouts/RoleShell.tsx (menuFor)
- Quyền API: */security/AuthorizationPolicy.java + require*() trong từng Controller/Service
"""
from pathlib import Path

W, H = 1720, 1400
FONT = "Arial, Helvetica, sans-serif"
BOUND = (300, 200, 1400, 1290)          # khung hệ thống x1, y1, x2, y2

LCX, LRX = 540, 165                     # cột trái: ứng viên + chức năng chung
CCX, CRX = 850, 110                     # cột giữa: use case phụ (AI, đặt lại mật khẩu)
RCX, RRX = 1185, 180                    # cột phải: nội bộ doanh nghiệp
RY = 25

UC_FILL, UC_STROKE = "#FFF2B3", "#333333"
BOUND_FILL = "#DDEBD6"
LINE = "#222222"

out: list[str] = []


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def usecase(cx, cy, rx, label):
    out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{RY}" fill="{UC_FILL}" stroke="{UC_STROKE}" stroke-width="1.2"/>')
    out.append(f'<text x="{cx}" y="{cy + 5}" text-anchor="middle" font-size="14">{esc(label)}</text>')


def actor(x, y, label, abstract=False):
    """Tác nhân kiểu Visual Paradigm; y là tâm thân."""
    out.append(f'<g stroke="{LINE}" stroke-width="1.3" fill="none">'
               f'<circle cx="{x}" cy="{y - 38}" r="11" fill="#D2B4CC"/>'
               f'<line x1="{x}" y1="{y - 27}" x2="{x}" y2="{y + 10}"/>'
               f'<line x1="{x - 18}" y1="{y - 12}" x2="{x + 18}" y2="{y - 12}"/>'
               f'<line x1="{x}" y1="{y + 10}" x2="{x - 15}" y2="{y + 36}"/>'
               f'<line x1="{x}" y1="{y + 10}" x2="{x + 15}" y2="{y + 36}"/></g>')
    style = ' font-style="italic"' if abstract else ""
    for i, part in enumerate(label.split("\n")):
        out.append(f'<text x="{x}" y="{y + 56 + i * 17}" text-anchor="middle" font-size="14"{style}>{esc(part)}</text>')


def line(x1, y1, x2, y2):
    out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{LINE}" stroke-width="1"/>')


def polyline(points):
    pts = " ".join(f"{x},{y}" for x, y in points)
    out.append(f'<polyline points="{pts}" fill="none" stroke="{LINE}" stroke-width="1"/>')


def triangle(tx, ty, direction):
    """Đầu mũi tên tổng quát hoá (tam giác rỗng), đỉnh tại (tx, ty)."""
    s = 12
    if direction == "down":
        p = [(tx, ty), (tx - s * .65, ty - s), (tx + s * .65, ty - s)]
    else:  # up
        p = [(tx, ty), (tx - s * .65, ty + s), (tx + s * .65, ty + s)]
    out.append('<polygon points="' + " ".join(f"{a:.1f},{b:.1f}" for a, b in p)
               + f'" fill="#fff" stroke="{LINE}" stroke-width="1"/>')


def dashed(x1, y1, x2, y2, label, lx, ly):
    out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{LINE}" stroke-width="1" '
               f'stroke-dasharray="6 4" marker-end="url(#open)"/>')
    out.append(f'<text x="{lx}" y="{ly}" text-anchor="middle" font-size="12">{esc(label)}</text>')


# ------------------------------------------------------------------ khung hệ thống
x1, y1, x2, y2 = BOUND
out.append(f'<rect x="{x1}" y="{y1}" width="{x2 - x1}" height="{y2 - y1}" fill="{BOUND_FILL}" stroke="{LINE}" stroke-width="1.2"/>')
out.append(f'<text x="{LCX}" y="{y1 + 28}" text-anchor="middle" font-size="16">Hệ thống quản lý tuyển dụng ATS</text>')

# ------------------------------------------------------------------ cột trái
L = {
    "dang_ky": (275, "Đăng ký tài khoản"),
    "xem_tin": (345, "Xem, tìm kiếm tin tuyển dụng"),
    "ho_so": (450, "Quản lý hồ sơ cá nhân và CV"),
    "ung_tuyen": (520, "Ứng tuyển vào tin tuyển dụng"),
    "don": (590, "Theo dõi, rút đơn ứng tuyển"),
    "lich": (660, "Phản hồi lịch phỏng vấn"),
    "thu_moi": (730, "Phản hồi thư mời nhận việc"),
    "dang_nhap": (905, "Đăng nhập"),
    "tai_khoan": (975, "Quản lý tài khoản cá nhân"),
    "thong_bao": (1045, "Xem thông báo"),
}
for y, label in L.values():
    usecase(LCX, y, LRX, label)

AXL = 120
KHACH_Y, UV_Y, ND_Y = 300, 590, 975
actor(AXL, KHACH_Y, "Khách vãng lai")
actor(AXL, UV_Y, "Ứng viên")
actor(AXL, ND_Y, "Người dùng", abstract=True)

for k in ("dang_ky", "xem_tin"):
    line(AXL + 22, KHACH_Y - 12, LCX - LRX, L[k][0])
for k in ("xem_tin", "ho_so", "ung_tuyen", "don", "lich", "thu_moi"):
    line(AXL + 22, UV_Y - 12, LCX - LRX, L[k][0])
for k in ("dang_nhap", "tai_khoan", "thong_bao"):
    line(AXL + 22, ND_Y - 12, LCX - LRX, L[k][0])

# Ứng viên là một Người dùng
line(AXL, UV_Y + 80, AXL, ND_Y - 50)
triangle(AXL, ND_Y - 50, "down")

# ------------------------------------------------------------------ cột giữa
AI_Y, QMK_Y = 520, 905
usecase(CCX, AI_Y, CRX, "Chấm điểm CV bằng AI")
usecase(CCX, QMK_Y, CRX, "Đặt lại mật khẩu")
dashed(LCX + LRX, L["ung_tuyen"][0], CCX - CRX, AI_Y, "«include»", (LCX + LRX + CCX - CRX) / 2, AI_Y - 13)
dashed(CCX - CRX, QMK_Y, LCX + LRX, L["dang_nhap"][0], "«extend»", (LCX + LRX + CCX - CRX) / 2, QMK_Y - 13)

AI_X, AI_ACTOR_Y = CCX, 90
actor(AI_X, AI_ACTOR_Y, "Dịch vụ AI (Gemini)")
line(AI_X, AI_ACTOR_Y + 85, AI_X, AI_Y - RY)

# ------------------------------------------------------------------ cột phải
R = [
    ("dd", "Quản lý yêu cầu tuyển dụng"),
    ("dd", "Xác nhận lịch phỏng vấn được phân công"),
    ("dd", "Đánh giá, đề xuất lương sau phỏng vấn"),
    ("dd", "Theo dõi ứng viên và kết quả tuyển dụng"),
    ("hr", "Duyệt yêu cầu tuyển dụng"),
    ("hr", "Quản lý tin tuyển dụng"),
    ("hr", "Quản lý hồ sơ ứng tuyển"),
    ("hr", "Quản lý lịch phỏng vấn"),
    ("hr", "So sánh và chọn ứng viên"),
    ("hr", "Quản lý thư mời nhận việc"),
    ("hr+qt", "Quản lý danh mục dùng chung"),
    ("qt", "Quản lý người dùng và phân quyền"),
    ("qt", "Quản lý thông tin doanh nghiệp"),
    ("qt", "Quản lý trang tuyển dụng"),
    ("qt", "Xem tổng quan, xuất báo cáo"),
    ("qt", "Xem nhật ký hệ thống"),
]
R_TOP, R_STEP = 275, 64
ry_of = [R_TOP + i * R_STEP for i in range(len(R))]
for (who, label), y in zip(R, ry_of):
    usecase(RCX, y, RRX, label)

AXR = 1545


def center_of(role):
    ys = [y for (who, _), y in zip(R, ry_of) if role in who.split("+")]
    return (min(ys) + max(ys)) // 2


ACT_R = {"dd": center_of("dd"), "hr": center_of("hr"), "qt": center_of("qt")}
actor(AXR, ACT_R["dd"], "Đại diện\nphòng ban")
actor(AXR, ACT_R["hr"], "Chuyên viên\ntuyển dụng")
actor(AXR, ACT_R["qt"], "Quản trị\ndoanh nghiệp")
for (who, _), y in zip(R, ry_of):
    for role in who.split("+"):
        line(AXR - 22, ACT_R[role] - 12, RCX + RRX, y)

# Ba tác nhân nội bộ cũng là Người dùng: đường tổng quát hoá đi vòng dưới khung hệ thống
BUS_X, BUS_Y = 1655, 1350
for role, y in ACT_R.items():
    polyline([(AXR + 22, y - 12), (BUS_X, y - 12)])
polyline([(BUS_X, ACT_R["dd"] - 12), (BUS_X, BUS_Y), (AXL, BUS_Y), (AXL, ND_Y + 82)])
triangle(AXL, ND_Y + 70, "up")

# ------------------------------------------------------------------ ghi file
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">'
       '<defs><marker id="open" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">'
       f'<path d="M0,1 L10,6 L0,11" fill="none" stroke="{LINE}" stroke-width="1.2"/></marker></defs>'
       f'<rect width="{W}" height="{H}" fill="#fff"/>' + "".join(out) + "</svg>")
target = Path(__file__).with_suffix(".svg")
target.write_text(svg, encoding="utf-8")
print(target)
