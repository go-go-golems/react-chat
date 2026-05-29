#!/usr/bin/env node
const WebSocket = require('/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/node_modules/ws');

const baseHttp = process.env.BASE_HTTP || 'http://localhost:8080';
const baseWs = process.env.BASE_WS || 'ws://localhost:8080';

async function main() {
  const session = await (await fetch(`${baseHttp}/api/chat/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })).json();
  const sid = session.sessionId;
  console.log('Session:', sid);

  const ws = new WebSocket(`${baseWs}/api/chat/ws`);
  let sawUser = false;
  let sawAssistantPatch = false;
  let sawWidget = false;

  ws.on('open', async () => {
    ws.send(JSON.stringify({ subscribe: { sessionId: sid, sinceSnapshotOrdinal: '0' } }));
    setTimeout(async () => {
      const response = await fetch(`${baseHttp}/api/chat/sessions/${sid}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: 'show me boots' }),
      });
      console.log('Submit:', response.status, await response.text());
    }, 200);
  });

  ws.on('message', (raw) => {
    const text = String(raw);
    console.log(text.slice(0, 260));
    if (text.includes('ChatUserMessageAccepted')) sawUser = true;
    if (text.includes('ChatTextPatch')) sawAssistantPatch = true;
    if (text.includes('ChatWidgetInstanceStarted')) sawWidget = true;
    if (sawUser && sawAssistantPatch && sawWidget) {
      console.log('OK: saw user, assistant patch, and widget start events');
      ws.close();
      process.exit(0);
    }
  });

  ws.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  setTimeout(() => {
    console.error('Timed out waiting for expected websocket events', { sawUser, sawAssistantPatch, sawWidget });
    process.exit(1);
  }, 5000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
