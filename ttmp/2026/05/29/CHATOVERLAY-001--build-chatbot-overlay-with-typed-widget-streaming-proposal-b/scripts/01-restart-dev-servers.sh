#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm"
SESSION="chat-overlay"

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux new-session -d -s "$SESSION" -n servers
  tmux split-window -h -t "$SESSION"
fi

tmux send-keys -t "$SESSION:0.0" C-c 2>/dev/null || true
sleep 1
tmux send-keys -t "$SESSION:0.0" "cd $ROOT && go run ./cmd/chat-overlay serve --serve-port 8080" C-m

tmux send-keys -t "$SESSION:0.1" C-c 2>/dev/null || true
sleep 1
tmux send-keys -t "$SESSION:0.1" "cd $ROOT/web && npx vite --port 5173" C-m

sleep 3
echo "Started backend on :8080 and frontend on :5173 in tmux session '$SESSION'."
