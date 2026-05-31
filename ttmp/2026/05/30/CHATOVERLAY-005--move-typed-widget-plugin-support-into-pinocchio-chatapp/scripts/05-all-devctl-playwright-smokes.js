import { spawnSync } from 'node:child_process';
import path from 'node:path';

const scriptsDir = '/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts';
const scripts = [
  '02-chatoverlay-devctl-playwright.js',
  '03-pinocchio-webchat-devctl-playwright.js',
  '04-coinvault-devctl-playwright.js',
];

for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync('node', [path.join(scriptsDir, script)], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\nOK: all devctl Playwright smokes passed');
