#!/usr/bin/env python3
"""Make TV-sized copies of your pictures for Haven and write the list the TV reads.

    python3 haven_wallpapers.py SOURCE_DIR TARGET_DIR [--budget SECONDS]

SOURCE_DIR  your picture folder, read only (e.g. /media/Pictures). Subfolders included.
TARGET_DIR  /config/www/haven/wallpapers (served to the TV at /local/haven/wallpapers/)

- Every picture becomes a 1920x1080 JPEG of a few hundred KB. Landscape pictures (4:3 up
  to 21:9) are cropped to fill the screen; portrait or panorama ones are centred on a
  blurred copy of themselves instead of being cut in half.
- Phone rotation (EXIF) is respected. Location and other metadata are not copied.
- Only new or changed pictures are processed, so repeated runs are cheap. Copies whose
  original was deleted are removed. The originals are never modified.
- Stops after --budget seconds (default 50, Home Assistant kills shell commands at 60)
  and continues on the next run, so a big first import finishes over a few runs.
- Writes list.json last, atomically, so the TV never reads a half-written list.

Needs Pillow, which ships with Home Assistant.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time

try:
    from PIL import Image, ImageFilter, ImageOps
except ImportError:
    sys.exit("haven_wallpapers: Pillow is not available in this Python. Run it inside Home Assistant's container.")

W, H = 1920, 1080
EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif")
INDEX = ".haven-index.json"  # target file -> {source, mtime, caption}


def slug(rel):
    base = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(rel)[0].lower()).strip("-")[:60] or "picture"
    return f"{base}-{hashlib.sha1(rel.encode('utf-8')).hexdigest()[:8]}.jpg"


def caption(rel):
    name = os.path.splitext(os.path.basename(rel))[0]
    name = re.sub(r"[-_]+", " ", name).strip()
    # camera names like IMG 20240812 103455 say nothing; leave those blank
    return "" if re.match(r"^(img|dsc|pxl|photo|image|dji)?\s*[\d\s]+$", name, re.I) else name


def render(src_path, out_path):
    with Image.open(src_path) as im:
        im.draft("RGB", (W * 2, H * 2))  # fast JPEG downscale while decoding
        im = ImageOps.exif_transpose(im).convert("RGB")
        ratio = im.width / im.height
        if 1.3 <= ratio <= 2.4:
            out = ImageOps.fit(im, (W, H), Image.LANCZOS)
        else:
            bg = ImageOps.fit(im, (W // 8, H // 8), Image.BILINEAR).filter(ImageFilter.GaussianBlur(6))
            bg = bg.resize((W, H), Image.BILINEAR).point(lambda v: int(v * 0.55))
            fg = im.copy()
            fg.thumbnail((W, H), Image.LANCZOS)
            bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
            out = bg
        tmp = out_path + ".tmp"
        out.save(tmp, "JPEG", quality=82, optimize=True, progressive=True)
        os.replace(tmp, out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("target")
    ap.add_argument("--budget", type=float, default=50)
    args = ap.parse_args()
    started = time.time()

    if not os.path.isdir(args.source):
        sys.exit(f"haven_wallpapers: source folder not found: {args.source}")
    os.makedirs(args.target, exist_ok=True)

    index_path = os.path.join(args.target, INDEX)
    try:
        with open(index_path) as f:
            index = json.load(f)
    except (OSError, ValueError):
        index = {}

    seen, made, failed, out_of_time = set(), 0, 0, False
    for root, dirs, files in os.walk(args.source):
        dirs[:] = sorted(d for d in dirs if not d.startswith("."))
        for name in sorted(files):
            if name.startswith(".") or not name.lower().endswith(EXTS):
                continue
            src = os.path.join(root, name)
            rel = os.path.relpath(src, args.source)
            target = slug(rel)
            seen.add(target)
            mtime = os.path.getmtime(src)
            entry = index.get(target)
            if entry and entry.get("mtime") == mtime and os.path.exists(os.path.join(args.target, target)):
                continue
            if time.time() - started > args.budget:
                out_of_time = True
                continue
            try:
                render(src, os.path.join(args.target, target))
                index[target] = {"source": rel, "mtime": mtime, "caption": caption(rel)}
                made += 1
            except Exception as e:  # unreadable or unsupported picture: skip it, keep going
                failed += 1
                print(f"skipped {rel}: {e}", file=sys.stderr)

    removed = 0
    for target in list(index):
        if target not in seen:
            try:
                os.remove(os.path.join(args.target, target))
            except OSError:
                pass
            del index[target]
            removed += 1

    with open(index_path + ".tmp", "w") as f:
        json.dump(index, f)
    os.replace(index_path + ".tmp", index_path)

    listing = [{"file": t, "caption": index[t]["caption"]}
               for t in sorted(index) if os.path.exists(os.path.join(args.target, t))]
    list_path = os.path.join(args.target, "list.json")
    with open(list_path + ".tmp", "w") as f:
        json.dump(listing, f, indent=1)
    os.replace(list_path + ".tmp", list_path)

    print(f"haven_wallpapers: {len(listing)} wallpapers, {made} new, {removed} removed, {failed} skipped"
          + (" (time budget reached, the rest continues next run)" if out_of_time else ""))


if __name__ == "__main__":
    main()
