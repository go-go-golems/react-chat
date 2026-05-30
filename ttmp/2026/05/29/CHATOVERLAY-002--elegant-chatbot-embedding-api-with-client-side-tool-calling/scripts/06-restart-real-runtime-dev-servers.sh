#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm"
SESSION="chat-overlay"
PROFILE="${CHAT_OVERLAY_PROFILE:-gpt-5-mini-low}"
TURNS_DB="${CHAT_OVERLAY_TURNS_DB:-$ROOT/var/chat-overlay-turns.db}"
TIMELINE_DB="${CHAT_OVERLAY_TIMELINE_DB:-$ROOT/var/chat-overlay-timeline.db}"

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux new-session -d -s "$SESSION" -n servers
  tmux split-window -h -t "$SESSION"
fi

tmux send-keys -t "$SESSION:0.0" C-c 2>/dev/null || true
sleep 1
tmux send-keys -t "$SESSION:0.0" "cd $ROOT && go run ./cmd/chat-overlay serve --serve-port 8080 --real-runtime --profile $PROFILE --timeline-db $TIMELINE_DB --turns-db $TURNS_DB --log-level debug --with-caller" C-m

tmux send-keys -t "$SESSION:0.1" C-c 2>/dev/null || true
sleep 1
tmux send-keys -t "$SESSION:0.1" "cd $ROOT/web && npx vite --host 127.0.0.1 --port 5173" C-m

sleep 3
echo "Started real-runtime backend on :8080 with profile '$PROFILE', timeline DB '$TIMELINE_DB', turns DB '$TURNS_DB', and frontend on :5173 in tmux session '$SESSION'."
echo "Open http://localhost:5173 and ask the assistant to use cart.add."
