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
const evidencePath = process.env.EVIDENCE_PATH || path.join(os.tmpdir(), 'pinocchio-phase6-mock-profile-parity-smoke.json');

function runDevctl(args, { allowFailure = false } = {}) {
  const result = spawnSync('devctl', args, { cwd: repo, stdio: 'inherit', env: process.env });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`devctl ${args.join(' ')} failed with exit code ${result.status}`);
  }
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
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) consoleErrors.push(msg.text());
  });

  const evidence = { startedAt: new Date().toISOString(), url, checks: [], consoleErrors };
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('Web Chat').waitFor({ timeout: 15000 });
    await page.locator('select').first().selectOption('mock_parity');
    evidence.checks.push('selected mock_parity profile');

    await page.getByRole('textbox', { name: 'Ask something…' }).fill('run deterministic parity');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText('Mock parity run complete', { exact: false }).waitFor({ timeout: 90000 });
    evidence.checks.push('assistant text stream rendered');

    await page.getByText('Inspecting deterministic inputs', { exact: false }).waitFor({ timeout: 15000 });
    evidence.checks.push('reasoning stream rendered');

    await page.getByTestId('tool-call-name').filter({ hasText: 'mock.search' }).first().waitFor({ timeout: 15000 });
    evidence.checks.push('backend tool call rendered');

    await page.getByText(/mock profile selected/i).waitFor({ timeout: 15000 });
    evidence.checks.push('agent-mode special event rendered');

    if (consoleErrors.length > 0) throw new Error(`console errors: ${consoleErrors.join('\n')}`);
    console.log(`OK: phase6 mock profile parity smoke passed (${evidencePath})`);
  } finally {
    mkdirSync(path.dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    console.log(`wrote evidence: ${evidencePath}`);
    await browser.close();
  }
}

await main();
