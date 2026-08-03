#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if command -v python3 >/dev/null 2>&1; then
  exec python3 offline-server.py
fi

if command -v node >/dev/null 2>&1; then
  exec node offline-server.mjs
fi

echo "RaptorQR needs Python 3 or Node.js to start the local offline server." >&2
echo "Install either runtime before entering the offline environment." >&2
exit 1
