#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
SESSION_ID="$(curl -s -X POST "$BASE_URL/api/chat/sessions" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq -r '.sessionId')"

echo "Session: $SESSION_ID"

curl -s -X POST "$BASE_URL/api/chat/sessions/$SESSION_ID/messages" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"show me boots"}' | jq .

sleep 1
curl -s "$BASE_URL/api/chat/sessions/$SESSION_ID" \
  | jq '[.entities[] | {kind,id,status:.payload.status, widget:.payload.widget_name, content:.payload.content}]'
