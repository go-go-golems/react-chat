import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const repo = '/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio';
const playwrightPackage = '/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/package.json';
const require = createRequire(playwrightPackage);
const { chromium } = require('playwright');

const defaultUrl = process.env.PINOCCHIO_WEBCHAT_URL || 'http://127.0.0.1:5174';
const evidencePath = process.env.EVIDENCE_PATH || path.join(os.tmpdir(), 'pinocchio-phase6-webchat-parity-smoke.json');

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

async function collectPageEvidence(page, label) {
  return await page.evaluate((label) => {
    const text = document.body.innerText;
    const parts = Array.from(document.querySelectorAll('[data-part]')).map((node) => node.getAttribute('data-part'));
    const pills = Array.from(document.querySelectorAll('[data-part="pill"], [data-part="pill-button"]')).map((node) => node.textContent?.trim()).filter(Boolean);
    const turns = Array.from(document.querySelectorAll('[data-part="turn"]')).map((node) => ({
      role: node.getAttribute('data-role'),
      text: node.textContent?.trim().slice(0, 240),
    }));
    return {
      label,
      url: window.location.href,
      title: document.title,
      hasWebChatRoot: !!document.querySelector('[data-pwchat][data-part="root"]'),
      hasProviderDemoText: /ChatProvider API Demo|capabilities demo|demo\.capability_card/.test(text),
      sessionIdParam: new URL(window.location.href).searchParams.get('sessionId'),
      storedSessionId: window.localStorage.getItem('pinocchio.web-chat.sessionId'),
      parts: Array.from(new Set(parts)).sort(),
      pills,
      turns,
      bodySnippet: text.slice(0, 1000),
    };
  }, label);
}

async function main() {
  runDevctl(['down'], { allowFailure: true });
  runDevctl(['up', '--force']);
  runDevctl(['status', '--tail-lines', '5']);
  const url = devctlViteURL(defaultUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) consoleErrors.push(msg.text());
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push({ url: request.url(), errorText: failure?.errorText });
  });

  const evidence = { startedAt: new Date().toISOString(), url, steps: [], consoleErrors, failedRequests };

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('Web Chat').waitFor({ timeout: 15000 });
    await page.getByText(/ws:/).waitFor({ timeout: 15000 });
    evidence.steps.push(await collectPageEvidence(page, 'initial-load'));

    await page.getByRole('button', { name: 'Debug' }).click();
    await page.getByRole('button', { name: /Stream Debug/ }).waitFor({ timeout: 5000 });

    const prompt = `phase 6 parity smoke ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Ask something…' }).fill(prompt);
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText(prompt).waitFor({ timeout: 15000 });
    await page.getByText(/ws: connected/).waitFor({ timeout: 20000 });
    await page.getByText('finished').waitFor({ timeout: 90000 });

    await page.getByRole('button', { name: /Stream Debug/ }).click();
    await page.getByPlaceholder('filter').fill('ui-event');
    await page.getByText(/ui-event|parsed-frame|snapshot/).first().waitFor({ timeout: 10000 });

    const exportButton = page.getByRole('button', { name: /Export/ });
    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportButton.click();
      await page.getByText('Timeline JSON').waitFor({ timeout: 5000 });
    }

    evidence.steps.push(await collectPageEvidence(page, 'after-send-debug-export'));
    if (consoleErrors.length > 0) throw new Error(`console errors: ${consoleErrors.join('\n')}`);
    const latest = evidence.steps.at(-1);
    if (!latest.sessionIdParam) throw new Error('expected sessionId query parameter after provider session creation');
    if (latest.hasProviderDemoText) throw new Error('provider demo/capability text leaked into production chat route');
    console.log(`OK: phase6 web-chat parity smoke passed (${evidencePath})`);
  } finally {
    mkdirSync(path.dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    if (existsSync(evidencePath)) console.log(`wrote evidence: ${evidencePath}`);
    await browser.close();
  }
}

await main();
