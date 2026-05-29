#!/usr/bin/env bash
set -euo pipefail

TICKET_DIR="/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/29/CHATOVERLAY-002--elegant-chatbot-embedding-api-with-client-side-tool-calling"
SOURCES_DIR="$TICKET_DIR/sources"
mkdir -p "$SOURCES_DIR"

add_frontmatter() {
  local file="$1"
  local title="$2"
  if ! head -n 1 "$file" | grep -qx -- "---"; then
    local tmp
    tmp="$(mktemp)"
    cat > "$tmp" <<EOF
---
Title: $title
Ticket: CHATOVERLAY-002
Status: reference
Topics:
    - chat-overlay
    - research
DocType: reference
Intent: reference
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Downloaded external research source for CHATOVERLAY-002.
---

EOF
    cat "$file" >> "$tmp"
    mv "$tmp" "$file"
  fi
}

fetch() {
  local slug="$1"
  local title="$2"
  local url="$3"
  echo "Fetching $url -> $slug.md"
  defuddle parse "$url" --md -o "$SOURCES_DIR/$slug.md"
  add_frontmatter "$SOURCES_DIR/$slug.md" "$title"
}

fetch 01-copilotkit-use-frontend-tool "CopilotKit useFrontendTool" "https://docs.copilotkit.ai/reference/hooks/useFrontendTool"
fetch 02-copilotkit-use-human-in-the-loop "CopilotKit useHumanInTheLoop" "https://docs.copilotkit.ai/reference/hooks/useHumanInTheLoop"
fetch 03-copilotkit-ag-ui "CopilotKit AG-UI" "https://docs.copilotkit.ai/agentic-protocols/ag-ui"
fetch 04-ai-sdk-tools-and-tool-calling "AI SDK tools and tool calling" "https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling"
fetch 05-ai-sdk-chatbot-tool-usage "AI SDK chatbot tool usage" "https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage"
fetch 06-ai-sdk-generative-user-interfaces "AI SDK generative user interfaces" "https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces"
fetch 07-ai-sdk-stream-ui "AI SDK stream UI" "https://ai-sdk.dev/docs/reference/ai-sdk-rsc/stream-ui"
fetch 08-assistant-ui-tools "assistant-ui tools" "https://www.assistant-ui.com/docs/guides/tools"
fetch 09-assistant-ui-tool-ui "assistant-ui Tool UI" "https://www.assistant-ui.com/docs/guides/tool-ui"

# Capture current ChatGPT transcript if surf has a ChatGPT tab selected. This may
# export the current active page if ChatGPT is not active; keep it as evidence.
surf chatgpt transcript --export-file "$SOURCES_DIR/10-last-chatgpt-session.md" --export-format markdown || true
if [ -f "$SOURCES_DIR/10-last-chatgpt-session.md" ]; then
  add_frontmatter "$SOURCES_DIR/10-last-chatgpt-session.md" "Last ChatGPT transcript attempt"
fi

echo "Done. Sources written to $SOURCES_DIR"
