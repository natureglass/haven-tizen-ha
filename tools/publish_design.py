#!/usr/bin/env python3
"""Copy the design files to Home Assistant (or anywhere else).

    python3 tools/publish_design.py TARGET

TARGET is the haven folder on Home Assistant, for example the Samba share:
    Windows:  python tools\\publish_design.py \\\\homeassistant\\config\\www\\haven
    macOS:    python3 tools/publish_design.py /Volumes/config/www/haven
Copies app/design/style.css and app/design/design.js into TARGET/design/.
The TV picks the change up on its next check (launch, return to Haven, or every 15 min).
"""
import os
import shutil
import sys

if len(sys.argv) != 2:
    sys.exit(__doc__)

src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "design")
dst = os.path.join(sys.argv[1], "design")
os.makedirs(dst, exist_ok=True)
for name in ("style.css", "design.js"):
    shutil.copyfile(os.path.join(src, name), os.path.join(dst, name))
    print("copied", os.path.join(dst, name))
