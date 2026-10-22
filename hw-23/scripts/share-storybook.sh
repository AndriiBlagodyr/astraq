#!/usr/bin/env bash
# Expose local Storybook (default :6006). Needs `pnpm dev:storybook` already running.
set -euo pipefail

if ! command -v ngrok >/dev/null; then
  echo "ngrok is not installed. On macOS: brew install ngrok" >&2
  exit 1
fi

if ! ngrok config check >/dev/null 2>&1; then
  echo "ngrok needs an authtoken. Run: ngrok config add-authtoken <your-token>" >&2
  exit 1
fi

PORT="${STORYBOOK_PORT:-6006}"
if ! curl -sf --max-time 1 "http://127.0.0.1:${PORT}" >/dev/null; then
  echo "No Storybook on :${PORT}. Start it first: pnpm dev:storybook" >&2
  exit 1
fi

echo "Tunneling Storybook at http://127.0.0.1:${PORT} (inspect: http://127.0.0.1:4040)"
echo "Free ngrok is one hostname. Keep this for Storybook and run \`pnpm share\` for the app (Cloudflare fallback)."
exec ngrok http "${PORT}"
