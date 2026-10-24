#!/usr/bin/env python3
"""Render Haven's nature wallpapers procedurally (no downloaded images, no licensing questions).

Usage:  python3 make_wallpapers.py [output_dir]
Needs:  numpy, Pillow
Output: wall-01.jpg ... wall-06.jpg at 1920x1080, plus walls.js (the list the app loads).
Run from the project root:  python3 tools/make_wallpapers.py app/img
Each scene is darker toward the bottom so the dock stays readable.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 1920, 1080
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def vgrad(stops):
    """Vertical gradient from a list of (position 0..1, hex)."""
    pos = np.array([p for p, _ in stops], dtype=np.float32)
    cols = np.stack([rgb(c) for _, c in stops])
    t = np.linspace(0, 1, H, dtype=np.float32)
    out = np.stack([np.interp(t, pos, cols[:, k]) for k in range(3)], axis=1)
    return np.broadcast_to(out[:, None, :], (H, W, 3)).copy()


def noise1d(rng, n, octaves=6, base=6, persistence=0.5):
    """Fractal value noise along x, roughly in -1..1."""
    x = np.linspace(0, 1, n, dtype=np.float32)
    total = np.zeros(n, dtype=np.float32)
    amp, freq, norm = 1.0, base, 0.0
    for _ in range(octaves):
        pts = rng.uniform(-1, 1, int(freq) + 2).astype(np.float32)
        xs = np.linspace(0, 1, len(pts), dtype=np.float32)
        # cosine interpolation between control points
        idx = np.clip(np.searchsorted(xs, x) - 1, 0, len(pts) - 2)
        t = (x - xs[idx]) / (xs[idx + 1] - xs[idx])
        t = (1 - np.cos(t * np.pi)) / 2
        total += amp * (pts[idx] * (1 - t) + pts[idx + 1] * t)
        norm += amp
        amp *= persistence
        freq *= 2
    return total / norm


def coverage(height_line):
    """Anti-aliased mask: 1 below the line, 0 above."""
    return np.clip(YY - height_line[None, :] + 0.5, 0, 1)[..., None]


def lay(img, mask, color):
    return img * (1 - mask) + color * mask


def layer_color(top_hex, bottom_hex, y0, y1):
    t = np.clip((YY - y0) / max(1.0, (y1 - y0)), 0, 1)[..., None]
    return rgb(top_hex) * (1 - t) + rgb(bottom_hex) * t


def glow(cx, cy, radius, color, strength=1.0):
    d = np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2) / radius
    g = np.exp(-d * d) * strength
    return g[..., None] * rgb(color)


def stars(rng, img, count, y_max, bright=1.0):
    xs = rng.integers(0, W, count)
    ys = rng.integers(0, int(y_max), count)
    b = rng.uniform(0.25, 1.0, count) ** 3 * bright
    fade = np.clip(1 - ys / y_max, 0, 1)
    for x, y, v, f in zip(xs, ys, b, fade):
        img[y, x] = np.clip(img[y, x] + v * f, 0, 1)
    return img


def pine_line(rng, base, count, hmin, hmax, wscale=0.32):
    """Silhouette top line of a row of pine trees."""
    line = np.full(W, base, dtype=np.float32)
    x = np.arange(W, dtype=np.float32)
    for _ in range(count):
        cx = rng.uniform(-40, W + 40)
        h = rng.uniform(hmin, hmax)
        w = h * wscale
        top = base - h
        # tiered triangle: small notches make it read as a conifer
        prof = top + np.abs(x - cx) / (w / 2) * h
        notch = 6 * np.abs(np.sin((x - cx) * 0.09)) * (prof < base)
        prof = prof + notch
        line = np.minimum(line, prof)
    return line


def finish(img, rng, bottom_dark=0.55, vignette=0.35, grain=0.012):
    # darker bottom band for dock legibility
    t = np.clip((YY - H * 0.62) / (H * 0.38), 0, 1)[..., None]
    img = img * (1 - bottom_dark * t ** 1.4)
    # vignette
    d = np.sqrt(((XX - W / 2) / (W / 2)) ** 2 + ((YY - H / 2) / (H / 2)) ** 2)
    img = img * (1 - vignette * np.clip(d - 0.55, 0, 1)[..., None] ** 1.5)
    # film grain hides banding in the gradients
    img = img + rng.normal(0, grain, img.shape).astype(np.float32)
    return np.clip(img, 0, 1)


# ---------------------------------------------------------------- scenes

def dawn_ridges(rng):
    img = vgrad([(0, "#1b2a4a"), (0.35, "#5b5f8f"), (0.55, "#d49a8c"), (0.68, "#f3c9a1"), (1, "#f3c9a1")])
    img += glow(W * 0.66, H * 0.6, 520, "#ffd9a8", 0.55)
    layers = [
        (H * 0.52, 120, "#9a90b0", "#b5a3b6", 0.0),
        (H * 0.60, 140, "#6f6a92", "#8a7c9e", 0.0),
        (H * 0.69, 150, "#4b4a73", "#5b5579", 0.0),
        (H * 0.78, 130, "#2d2f52", "#35355a", 0.0),
        (H * 0.88, 110, "#171a33", "#1c1f3a", 0.0),
    ]
    for i, (base, amp, top, bot, _) in enumerate(layers):
        line = base + amp * noise1d(rng, W, octaves=7, base=3 + i, persistence=0.52)
        img = lay(img, coverage(line), layer_color(top, bot, base - amp, H))
    return img


def alpine_lake(rng):
    water_y = int(H * 0.66)
    img = vgrad([(0, "#0f2c4a"), (0.4, "#3f7aa6"), (0.62, "#a9d1e3"), (1, "#a9d1e3")])
    img += glow(W * 0.28, H * 0.18, 420, "#ffffff", 0.18)
    # ridged noise gives sharp alpine peaks instead of rounded humps
    ridged = (1 - np.abs(noise1d(rng, W, octaves=7, base=3, persistence=0.5))) ** 2.2
    far = water_y - 90 - 300 * ridged + 25 * noise1d(rng, W, octaves=8, base=40, persistence=0.6)
    snow = layer_color("#f4f8fc", "#9fb3c7", far.min(), water_y - 60)
    img = lay(img, coverage(far), snow)
    # rock below a ragged snowline: thick snow on the peaks, none in the saddles
    height = (water_y - far)
    rock = far + 18 + 0.55 * np.clip(height - 120, 0, None) + 18 * noise1d(rng, W, 6, 30, 0.6)
    img = lay(img, coverage(rock), layer_color("#5a7590", "#2f455c", float(rock.min()), water_y))
    trees = pine_line(rng, water_y + 4, 260, 30, 95)
    img = lay(img, coverage(trees), layer_color("#1d3a3c", "#13282b", water_y - 95, water_y))
    # reflection: mirror the land above the waterline with ripples
    land = img[:water_y].copy()
    refl = land[::-1]
    rows = H - water_y
    ripple = (np.sin(np.arange(rows) * 0.9) * np.linspace(0.5, 6, rows)).astype(int)
    out = img.copy()
    for r in range(rows):
        src = refl[min(r, refl.shape[0] - 1)]
        out[water_y + r] = np.roll(src, ripple[r], axis=0)
    tint = rgb("#123048")
    t = np.linspace(0.35, 0.8, rows, dtype=np.float32)[:, None, None]
    out[water_y:] = out[water_y:] * (1 - t) + tint * t
    out[water_y:water_y + 2] = out[water_y:water_y + 2] * 0.8 + 0.2
    return out


def misty_forest(rng):
    img = vgrad([(0, "#c8d5cf"), (0.5, "#a7bab3"), (1, "#5d736d")])
    img += glow(W * 0.5, H * 0.25, 700, "#fff6e0", 0.25)
    rows = [
        (H * 0.55, 80, 140, "#93a9a2", 90),
        (H * 0.66, 120, 220, "#6f8a82", 70),
        (H * 0.79, 170, 300, "#3e5852", 50),
        (H * 0.96, 240, 420, "#1a2a27", 34),
    ]
    for base, hmin, hmax, col, count in rows:
        line = pine_line(rng, base, count, hmin, hmax, wscale=0.30)
        img = lay(img, coverage(line), rgb(col))
        # fog band sitting in front of each row
        fog = np.exp(-((YY - base) / 70.0) ** 2)[..., None] * 0.35
        img = img * (1 - fog) + rgb("#dfe8e3") * fog
    return img


def aurora_night(rng):
    img = vgrad([(0, "#020611"), (0.45, "#06162a"), (0.75, "#0d2a3a"), (1, "#0d2a3a")])
    img = stars(rng, img, 1400, H * 0.7, 0.9)
    # aurora curtains: wavy ribbons with vertical streaks
    x = np.arange(W, dtype=np.float32)
    for k, (col, yb, amp, width, phase) in enumerate([
        ("#3dffb0", H * 0.34, 90, 120, 0.0),
        ("#2fd4c8", H * 0.27, 70, 90, 1.7),
        ("#9b7bff", H * 0.20, 60, 70, 3.1),
    ]):
        centre = yb + amp * np.sin(x / 260 + phase) + 30 * noise1d(rng, W, 5, 6)
        streak = 0.55 + 0.45 * np.abs(noise1d(rng, W, 4, 140, 0.6))
        above = centre[None, :] - YY
        band = np.where(above > 0, np.exp(-(above / (width * 1.6)) ** 2), np.exp(-(above / 14) ** 2))
        a = (band * streak[None, :] * (0.55 if k else 0.8))[..., None]
        img = img + a * rgb(col)
    hills = H * 0.80 + 60 * noise1d(rng, W, 6, 2, 0.45)
    img = lay(img, coverage(hills), layer_color("#3b5a6e", "#0c1a24", hills.min(), H))
    trees = pine_line(rng, H * 0.95, 70, 70, 190)
    img = lay(img, coverage(trees), rgb("#050b10"))
    return img


def golden_dunes(rng):
    img = vgrad([(0, "#3e6fa8"), (0.45, "#e9b98a"), (0.6, "#f6d6a3"), (1, "#f6d6a3")])
    img += glow(W * 0.78, H * 0.5, 70, "#fffaf0", 1.6) + glow(W * 0.78, H * 0.5, 300, "#ffd9a0", 0.35)
    for i, base in enumerate([H * 0.58, H * 0.68, H * 0.80, H * 0.93]):
        line = base + (90 + 30 * i) * noise1d(rng, W, octaves=4, base=2 + i, persistence=0.35)
        slope = np.convolve(np.gradient(line), np.ones(41) / 41, mode="same")
        lit = np.clip(0.5 - slope * 0.35, 0, 1)[None, :, None]
        depth = np.clip((YY - line[None, :]) / 220, 0, 1)[..., None]
        sun_side = rgb("#e7a565") * (1 - 0.15 * i)
        shade = rgb("#8a4f3a") * (1 - 0.18 * i)
        col = shade * (1 - lit) + sun_side * lit
        col = col * (1 - 0.35 * depth)
        img = lay(img, coverage(line), col)
    return img


def dusk_sea(rng):
    hz = int(H * 0.58)
    img = vgrad([(0, "#1d1f45"), (0.3, "#5a3f73"), (0.5, "#e37d6e"), (0.58, "#ffc08a"),
                 (0.585, "#3c4a72"), (1, "#0f1631")])
    sun = glow(W * 0.5, hz - 30, 60, "#fff4d6", 2.2) + glow(W * 0.5, hz - 30, 360, "#ffb37a", 0.5)
    img += sun * (YY < hz)[..., None]
    # glints on the water, concentrated in a column under the sun
    col = np.exp(-((XX - W * 0.5) / np.maximum(180 + (YY - hz) * 0.9, 20)) ** 2)
    waves = np.sin(YY * 0.55 + 12 * noise1d(rng, W, 4, 60)[None, :]) * np.sin(XX * 0.07 + YY * 0.2)
    gl = np.clip(waves, 0, 1) ** 6 * col * (YY > hz)
    img += gl[..., None] * rgb("#ffd6a0") * 1.4
    # far headland
    taper = np.clip((W * 0.36 - XX[0]) / (W * 0.12), 0, 1) ** 1.5
    land = hz + 2 - (14 + 55 * np.clip(noise1d(rng, W, 6, 3) + 0.35, 0, 1)) * taper
    img = lay(img, coverage(land) * (YY < hz + 1)[..., None], rgb("#2b2346"))
    return img


SCENES = [
    ("wall-01.jpg", "Dawn ridges", dawn_ridges),
    ("wall-02.jpg", "Alpine lake", alpine_lake),
    ("wall-03.jpg", "Misty forest", misty_forest),
    ("wall-04.jpg", "Northern lights", aurora_night),
    ("wall-05.jpg", "Golden dunes", golden_dunes),
    ("wall-06.jpg", "Dusk at sea", dusk_sea),
]


def make_icon(wall_path, icon_path):
    """Smart Hub icon (512x423): a crop of the first wallpaper with a small dock."""
    from PIL import ImageDraw
    w, h = 512, 423
    src = Image.open(wall_path)
    crop = src.crop((W * 0.30, H * 0.22, W * 0.30 + 900, H * 0.22 + 900 * h / w)).resize((w, h), Image.LANCZOS)
    d = ImageDraw.Draw(crop, "RGBA")
    d.rounded_rectangle((96, 300, 416, 372), radius=36, fill=(255, 255, 255, 60), outline=(255, 255, 255, 110), width=3)
    for i, x in enumerate((176, 256, 336)):
        r = 20 if i == 0 else 16
        d.ellipse((x - r, 336 - r, x + r, 336 + r), fill=(255, 255, 255, 235 if i == 0 else 150))
    crop.save(icon_path)
    print(f"{icon_path}  {os.path.getsize(icon_path) // 1024} KB")


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    meta = []
    for i, (name, caption, fn) in enumerate(SCENES):
        rng = np.random.default_rng(1000 + i)
        img = finish(fn(rng), rng)
        im = Image.fromarray((img * 255 + 0.5).astype(np.uint8))
        im = im.filter(ImageFilter.GaussianBlur(0.6))
        path = os.path.join(out, name)
        im.save(path, quality=84, optimize=True, progressive=True)
        meta.append({"src": "img/" + name, "caption": caption})
        print(f"{path}  {os.path.getsize(path) // 1024} KB")
    make_icon(os.path.join(out, SCENES[0][0]), os.path.join(out, "..", "icon.png"))
    # A plain script (not JSON) so the app needs no XHR to load the list
    with open(os.path.join(out, "walls.js"), "w") as f:
        f.write("/* Generated by tools/make_wallpapers.py. Add your own: {src, caption}. */\n")
        f.write("window.HAVEN_WALLS = " + json.dumps(meta, indent=2) + ";\n")


if __name__ == "__main__":
    main()
