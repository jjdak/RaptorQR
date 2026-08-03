#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

IS_WSL=0
case "${WSL_DISTRO_NAME:-}" in
  ?*) IS_WSL=1 ;;
esac

if [ "$IS_WSL" -eq 0 ]; then
  case "$(uname -r 2>/dev/null)" in
    *[Mm]icrosoft*) IS_WSL=1 ;;
  esac
fi

run_server() {
  runtime=$1
  script=$2

  if [ "$IS_WSL" -eq 1 ]; then
    echo "WSL detected. Automatic browser launch is disabled."
    echo "Open the URL shown below in your Windows browser."
    exec "$runtime" "$script" --no-browser
  fi

  exec "$runtime" "$script"
}

if command -v python3 >/dev/null 2>&1; then
  run_server python3 offline-server.py
fi

if command -v node >/dev/null 2>&1; then
  run_server node offline-server.mjs
fi

echo "RaptorQR needs Python 3 or Node.js to start the local offline server." >&2
echo "Install either runtime before entering the offline environment." >&2
exit 1
