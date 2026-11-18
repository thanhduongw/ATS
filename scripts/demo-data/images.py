"""Ảnh cho công ty demo, vẽ bằng Pillow: logo dạng chữ và ba tấm áp phích cho khối "Đời sống".

Không dùng ảnh chụp hay sơ đồ kiến trúc; chỉ hình khối phẳng và chữ.
"""
from __future__ import annotations

import io
import os

from PIL import Image, ImageDraw, ImageFont

from lib import ROOT

FONT_DIR = os.path.join(ROOT, "dashboard-service", "src", "main", "resources", "fonts")


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    name = "BeVietnamPro-Bold.ttf" if bold else "BeVietnamPro-Regular.ttf"
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


def _png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def logo(color: str, letters: str = "ML") -> bytes:
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=112, fill=color)
    font = _font(236)
    box = d.textbbox((0, 0), letters, font=font)
    d.text(((size - (box[2] - box[0])) / 2 - box[0], (size - (box[3] - box[1])) / 2 - box[1]), letters, font=font, fill="white")
    return _png(img)


POSTERS = {
    # nền, màu khối phụ, màu chữ
    "tech-talk": ("#0F6E66", "#15857B", "#F2FBF9"),
    "hackathon": ("#1F2A44", "#2D3C61", "#F4F6FB"),
    "da-lat": ("#C56A2D", "#D98445", "#FFF8F1"),
}


def poster(kind: str, title: str) -> bytes:
    w, h = 1200, 800
    bg, block, fg = POSTERS[kind]
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img)
    # Vài khối phẳng lệch nhau để tấm ảnh không trống.
    d.rectangle((760, 0, w, 300), fill=block)
    d.rectangle((0, 560, 420, h), fill=block)
    d.ellipse((840, 420, 1140, 720), outline=fg, width=6)
    d.line((90, 120, 330, 120), fill=fg, width=6)
    font = _font(118)
    y = 190
    for line in title.split("\n"):
        d.text((90, y), line, font=font, fill=fg)
        y += 140
    d.text((90, h - 110), "Mộc Lam Software", font=_font(34, bold=False), fill=fg)
    return _png(img)
