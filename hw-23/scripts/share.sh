#!/usr/bin/env bash
# Expose the local Next.js app. API (:4000) and ML (:8000) stay on this machine;
# the Next server calls them as the BFF.
#
# Uses ngrok when that slot is free. Free ngrok is one public hostname, so if
# Storybook already has it, this falls back to a Cloudflare quick tunnel.
set -euo pipefail

pick_port() {
  if [[ -n "${WEB_PORT:-}" ]]; then
    echo "$WEB_PORT"
    return
  fi
  local port
  for port in 3000 3001; do
    if curl -sf --max-time 1 "http://127.0.0.1:${port}" >/dev/null; then
      echo "$port"
      return
    fi
  done
  echo "No Next.js server on :3000 or :3001. Start the stack first: pnpm dev" >&2
  exit 1
}

ngrok_in_use() {
  python3 - <<'PY' 2>/dev/null
import json, urllib.request
try:
    data = json.load(urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels", timeout=1))
except Exception:
    raise SystemExit(1)
raise SystemExit(0 if data.get("tunnels") else 1)
PY
}

start_second_tunnel() {
  local port="$1"
  echo "ngrok is already in use (Storybook). Opening a second public URL for the app on :${port}"
  if command -v cloudflared >/dev/null; then
    if cloudflared tunnel --url "http://127.0.0.1:${port}"; then
      exit 0
    fi
    echo "Cloudflare quick tunnel failed; falling back to localtunnel." >&2
  fi
  exec npx --yes localtunnel --port "${port}" --local-host 127.0.0.1
}

PORT="$(pick_port)"

if ngrok_in_use; then
  start_second_tunnel "${PORT}"
fi

if ! command -v ngrok >/dev/null; then
  echo "ngrok is not installed. On macOS: brew install ngrok" >&2
  exit 1
fi

if ! ngrok config check >/dev/null 2>&1; then
  echo "ngrok needs an authtoken (free account)." >&2
  echo "1. Create a token at https://dashboard.ngrok.com/get-started/your-authtoken" >&2
  echo "2. Run: ngrok config add-authtoken <your-token>" >&2
  echo "3. Run this script again." >&2
  exit 1
fi

echo "Tunneling http://127.0.0.1:${PORT} (inspect: http://127.0.0.1:4040)"
exec ngrok http "${PORT}"
