#!/usr/bin/env python3
"""Pretend to be Home Assistant for desktop testing.

    python3 tools/serve.py [folder] [port]

Serves `folder` (default ha/www/haven) at http://localhost:8123/local/haven/, the same
path Home Assistant uses, with CORS headers so a desktop browser preview can read it.
Then open app/index.html?base=http://localhost:8123/local/haven/ in Chrome.
"""
import functools
import http.server
import os
import sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "ha", "www", "haven"))
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8123
PREFIX = "/local/haven"


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split("?", 1)[0]
        if not path.startswith(PREFIX):
            return os.path.join(ROOT, "__nothing_here__")
        return super().translate_path(path[len(PREFIX):] or "/")

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


if __name__ == "__main__":
    print(f"Serving {ROOT} at http://localhost:{PORT}{PREFIX}/")
    http.server.ThreadingHTTPServer(("", PORT), functools.partial(Handler, directory=ROOT)).serve_forever()
