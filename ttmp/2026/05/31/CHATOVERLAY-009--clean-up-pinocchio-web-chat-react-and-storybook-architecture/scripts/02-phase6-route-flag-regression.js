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
const evidencePath = process.env.EVIDENCE_PATH || path.join(os.tmpdir(), 'pinocchio-phase6-route-flag-regression.json');

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

async function classify(page, url, label) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const text = await page.locator('body').innerText();
  const hasWebChat = await page.locator('[data-pwchat][data-part="root"]').count();
  const hasDebugUi = /Debug UI|timeline lanes|projection/i.test(text);
  const hasProviderDemo = /ChatProvider API Demo|capabilities demo|demo\.capability_card|left provider|right provider/i.test(text);
  return {
    label,
    url: page.url(),
    hasWebChat: hasWebChat > 0,
    hasDebugUi,
    hasProviderDemo,
    snippet: text.slice(0, 800),
  };
}

async function main() {
  runDevctl(['down'], { allowFailure: true });
  runDevctl(['up', '--force']);
  const base = devctlViteURL(defaultUrl).replace(/\/$/, '');
  const cases = [
    { label: 'default', suffix: '/' },
    { label: 'removed-providerDemo-flag', suffix: '/?providerDemo=1' },
    { label: 'removed-providerMultiDemo-flag', suffix: '/?providerMultiDemo=1' },
    { label: 'debug-still-works', suffix: '/?debug=1' },
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const evidence = { startedAt: new Date().toISOString(), base, cases: [] };

  try {
    for (const c of cases) {
      evidence.cases.push(await classify(page, `${base}${c.suffix}`, c.label));
    }
    for (const c of evidence.cases) {
      if (c.label === 'debug-still-works') {
        if (!c.hasDebugUi) throw new Error('debug flag no longer opens debug UI');
      } else {
        if (!c.hasWebChat) throw new Error(`${c.label} did not render production web-chat`);
        if (c.hasProviderDemo) throw new Error(`${c.label} leaked removed provider demo UI`);
      }
    }
    console.log(`OK: phase6 route flag regression passed (${evidencePath})`);
  } finally {
    mkdirSync(path.dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    console.log(`wrote evidence: ${evidencePath}`);
    await browser.close();
  }
}

await main();
