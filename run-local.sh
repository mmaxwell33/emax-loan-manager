#!/usr/bin/env bash
# ──────────────────────────────────────────────
# E-Max Loan Manager — local dev server
# Serves the /refined folder on http://localhost:8080
# Needs python3 (preferred) OR node.
# ──────────────────────────────────────────────

set -e

PORT=8080
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "E-Max Loan Manager — local preview"
echo "Serving: $DIR"
echo "Open:    http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop."
echo ""

cd "$DIR"

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m SimpleHTTPServer "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes http-server -p "$PORT" -c-1 .
else
  echo "No python or node found. Install one and retry."
  exit 1
fi
