import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const repo = '/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio';
const playwrightPackage = '/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/package.json';
const require = createRequire(playwrightPackage);
const { chromium } = require('playwright');

const defaultUrl = process.env.PINOCCHIO_WEBCHAT_URL || 'http://127.0.0.1:5174';
const evidencePath = process.env.EVIDENCE_PATH || path.join(os.tmpdir(), 'pinocchio-chatprovider-timeline-adapter-hydration.json');

function runDevctl(args, { allowFailure = false } = {}) {
  const result = spawnSync('devctl', args, { cwd: repo, stdio: 'inherit', env: process.env });
  if (!allowFailure && result.status !== 0) throw new Error(`devctl ${args.join(' ')} failed with exit code ${result.status}`);
}

function devctlViteURL(fallback) {
  try {
    const state = JSON.parse(readFileSync(`${repo}/.devctl/state.json`, 'utf8'));
    const vite = (state.services || []).find((service) => service.name === 'vite');
    return vite?.health_url || fallback;
  } catch {
    return fallback;
  }
}

async function main() {
  runDevctl(['down'], { allowFailure: true });
  runDevctl(['up', '--force']);
  const url = devctlViteURL(defaultUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const evidence = { startedAt: new Date().toISOString(), url, checks: [] };

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('Web Chat').waitFor({ timeout: 15000 });
    await page.locator('select').first().selectOption('mock_parity');
    await page.getByRole('textbox', { name: 'Ask something…' }).fill('hydrate deterministic parity');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText('Mock parity run complete', { exact: false }).waitFor({ timeout: 90000 });
    evidence.sessionUrl = page.url();
    evidence.checks.push('initial mock run rendered');

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Mock parity run complete', { exact: false }).waitFor({ timeout: 15000 });
    await page.locator('[data-part="card"]').filter({ hasText: 'agentmode: mode switched' }).first().waitFor({ timeout: 15000 });
    await page.locator('[data-part="card"]').filter({ hasText: 'mock.search' }).first().waitFor({ timeout: 15000 });
    const body = await page.locator('body').innerText();
    if (body.includes('type.googleapis.com/pinocchio.chatapp.v1.AgentModeEntity')) {
      throw new Error('hydrated AgentMode rendered as raw protobuf Any payload');
    }
    if (body.includes('type.googleapis.com/pinocchio.chatapp.v1.ToolCallEntity')) {
      throw new Error('hydrated ChatToolCall rendered as raw protobuf Any payload');
    }
    evidence.checks.push('hydrated adapter-owned entities rendered as app cards');
    console.log(`OK: timeline adapter hydration smoke passed (${evidencePath})`);
  } finally {
    mkdirSync(path.dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    console.log(`wrote evidence: ${evidencePath}`);
    await browser.close();
  }
}

await main();
