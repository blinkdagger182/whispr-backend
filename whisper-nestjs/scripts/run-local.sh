#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

RABBITMQ_USER="${RABBITMQ_USER:-whispr}"
RABBITMQ_PASS="${RABBITMQ_PASS:-SuperSecurePassword}"
RABBITMQ_URL="amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@localhost:5672"
export RABBITMQ_URL

WHISPER_PORT="${WHISPER_PORT:-8080}"
WHISPER_BASE_URL="http://localhost:${WHISPER_PORT}/whisper"
export WHISPER_BASE_URL

if docker ps -a --format '{{.Names}}' | rg -q '^rabbitmq$'; then
  if [[ "${RESET_RABBITMQ:-}" == "true" ]]; then
    docker rm -f rabbitmq >/dev/null
  fi
fi

if ! docker ps --format '{{.Names}}' | rg -q '^rabbitmq$'; then
  docker run -d \
    --name rabbitmq \
    -e "RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}" \
    -e "RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASS}" \
    -p 5672:5672 \
    rabbitmq:3 >/dev/null
fi

if docker ps -a --format '{{.Names}}' | rg -q '^whisper-api$'; then
  if [[ "${RESET_WHISPER:-}" == "true" ]]; then
    docker rm -f whisper-api >/dev/null
  fi
fi

if ! docker ps --format '{{.Names}}' | rg -q '^whisper-api$'; then
  docker run -d \
    --name whisper-api \
    -p "${WHISPER_PORT}:8080" \
    whispr-whisper:latest >/dev/null
fi

rm -rf dist
bun run build

PORT="${PORT:-3001}"
export PORT

if command -v lsof >/dev/null 2>&1; then
  if lsof -ti :"${PORT}" >/dev/null 2>&1; then
    lsof -ti :"${PORT}" | xargs -r kill >/dev/null 2>&1 || true
  fi
fi

if command -v nc >/dev/null 2>&1; then
  for _ in {1..20}; do
    if nc -z localhost 5672 >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  for _ in {1..20}; do
    if nc -z localhost "${WHISPER_PORT}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
else
  sleep 2
fi

printf '' > /tmp/whispr-worker.log
printf '' > /tmp/whispr-api.log

bun run src/main-worker.ts > /tmp/whispr-worker.log 2>&1 &
WORKER_PID=$!

PORT="${PORT}" bun run start:dev > /tmp/whispr-api.log 2>&1 &
API_PID=$!

cleanup() {
  kill "$API_PID" "$WORKER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 3

if [[ -n "${TEST_FILE:-}" ]]; then
  RESPONSE="$(curl -s -w "\n%{http_code}\n" -F "file=@${TEST_FILE}" "http://localhost:${PORT}/transcribe")"
  BODY="$(printf "%s" "$RESPONSE" | sed '$d')"
  STATUS_CODE="$(printf "%s" "$RESPONSE" | tail -n 1)"
  echo "$BODY"
  echo "$STATUS_CODE"

  if [[ "$STATUS_CODE" == "202" ]]; then
    JOB_ID="$(BODY="$BODY" python3 - <<'PY'
import json
import os

body = os.environ.get("BODY", "")
if not body:
    print("")
else:
    print(json.loads(body).get("job_id", ""))
PY
)"
    if [[ -n "$JOB_ID" ]]; then
      for _ in {1..60}; do
        STATUS_JSON="$(curl -s "http://localhost:${PORT}/jobs/${JOB_ID}")"
        echo "$STATUS_JSON"
        STATUS="$(STATUS_JSON="$STATUS_JSON" python3 - <<'PY'
import json
import os

body = os.environ.get("STATUS_JSON", "")
try:
    print(json.loads(body).get("status", ""))
except Exception:
    print("")
PY
)"
        if [[ "$STATUS" == "completed" || "$STATUS" == "failed" || "$STATUS" == "dlq" ]]; then
          break
        fi
        sleep 1
      done
    fi
  fi
  exit 0
fi

echo "API running on http://localhost:${PORT}"
echo "Worker running; logs: /tmp/whispr-worker.log"
wait
