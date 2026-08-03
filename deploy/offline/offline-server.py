#!/usr/bin/env python3
"""Dependency-free local static server for the RaptorQR offline bundle."""

import argparse
import http.server
import mimetypes
import os
import threading
import webbrowser
from pathlib import Path


WEB_ROOT = Path(__file__).resolve().parent / "web"
DEFAULT_PORT = 4173


class OfflineHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def send_head(self):
        requested = self.translate_path(self.path)
        if not os.path.exists(requested):
            path_without_query = self.path.split("?", 1)[0]
            if not Path(path_without_query).suffix:
                original_path = self.path
                self.path = "/index.html"
                try:
                    return super().send_head()
                finally:
                    self.path = original_path
        return super().send_head()

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")


def parse_args():
    parser = argparse.ArgumentParser(description="Serve RaptorQR without Internet access")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-browser", action="store_true")
    return parser.parse_args()


def create_server(host, initial_port):
    for port in range(initial_port, initial_port + 20):
        try:
            return http.server.ThreadingHTTPServer((host, port), OfflineHandler), port
        except OSError:
            continue
    raise RuntimeError(f"No free port found in range {initial_port}-{initial_port + 19}")


def main():
    args = parse_args()
    if not (WEB_ROOT / "index.html").is_file():
        raise SystemExit(f"Offline web files are missing: {WEB_ROOT}")

    mimetypes.add_type("application/wasm", ".wasm")
    server, port = create_server(args.host, args.port)
    local_url = f"http://localhost:{port}/"
    print(f"RaptorQR is available on this computer at {local_url}")
    print("Press Ctrl-C to stop.")

    if not args.no_browser:
        threading.Timer(0.2, lambda: webbrowser.open(local_url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping RaptorQR...")
    finally:
        server.server_close()
if __name__ == "__main__":
    main()
