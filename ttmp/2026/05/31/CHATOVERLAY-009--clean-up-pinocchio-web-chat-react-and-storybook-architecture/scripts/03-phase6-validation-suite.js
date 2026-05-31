import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = '/home/manuel/workspaces/2026-05-29/chatbot-react';
const pinocchio = `${root}/pinocchio`;
const web = `${pinocchio}/cmd/web-chat/web`;
const overlay = `${root}/2026-05-29--chatbot-overlay-glm`;
const ticketScripts = `${overlay}/ttmp/2026/05/31/CHATOVERLAY-009--clean-up-pinocchio-web-chat-react-and-storybook-architecture/scripts`;
const evidencePath = process.env.EVIDENCE_PATH || path.join(os.tmpdir(), 'pinocchio-phase6-validation-suite.json');

const commands = [
  { name: 'web:typecheck', cwd: web, cmd: 'npm', args: ['run', 'typecheck'] },
  { name: 'web:lint', cwd: web, cmd: 'npm', args: ['run', 'lint'] },
  { name: 'web:build', cwd: web, cmd: 'npm', args: ['run', 'build'] },
  { name: 'web:build-storybook', cwd: web, cmd: 'npm', args: ['run', 'build-storybook'] },
  { name: 'web:route-mode-test', cwd: web, cmd: 'npx', args: ['vitest', 'run', 'src/app/routeMode.test.ts'] },
  { name: 'go:web-chat-app-and-chatapp', cwd: pinocchio, cmd: 'go', args: ['test', './cmd/web-chat/app', './pkg/chatapp', '-count=1'] },
  { name: 'playwright:main-parity', cwd: overlay, cmd: 'node', args: [`${ticketScripts}/01-phase6-webchat-parity-smoke.js`] },
  { name: 'playwright:route-flags', cwd: overlay, cmd: 'node', args: [`${ticketScripts}/02-phase6-route-flag-regression.js`] },
];

function run(command) {
  const startedAt = new Date();
  console.log(`\n==> ${command.name}`);
  console.log(`$ ${command.cmd} ${command.args.join(' ')}`);
  const result = spawnSync(command.cmd, command.args, {
    cwd: command.cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 20,
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  const finishedAt = new Date();
  return {
    name: command.name,
    cwd: command.cwd,
    command: `${command.cmd} ${command.args.join(' ')}`,
    status: result.status,
    signal: result.signal,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    stdoutTail: (result.stdout || '').slice(-4000),
    stderrTail: (result.stderr || '').slice(-4000),
  };
}

const evidence = { startedAt: new Date().toISOString(), commands: [] };
let failed = false;
for (const command of commands) {
  const result = run(command);
  evidence.commands.push(result);
  if (result.status !== 0) {
    failed = true;
    break;
  }
}
evidence.finishedAt = new Date().toISOString();
evidence.ok = !failed;
mkdirSync(path.dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(`\nwrote evidence: ${evidencePath}`);
if (failed) process.exit(1);
console.log('OK: phase6 validation suite passed');
