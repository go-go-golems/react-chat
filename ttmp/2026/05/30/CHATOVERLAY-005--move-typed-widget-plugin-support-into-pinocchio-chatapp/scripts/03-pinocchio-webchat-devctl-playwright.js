import { createRequire } from 'module';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const repo = '/home/manuel/workspaces/2026-05-29/chatbot-react/pinocchio';
const playwrightPackage = '/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/package.json';
const require = createRequire(playwrightPackage);
const { chromium } = require('playwright');
const defaultUrl = process.env.PINOCCHIO_WEBCHAT_URL || 'http://127.0.0.1:5174';

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
  runDevctl(['status', '--tail-lines', '5']);
  const url = devctlViteURL(defaultUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) consoleErrors.push(msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('Web Chat').waitFor({ timeout: 15000 });
    await page.getByText(/ws:/).waitFor({ timeout: 15000 });

    const prompt = `hello from playwright smoke ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Ask something…' }).fill(prompt);
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText(prompt).waitFor({ timeout: 15000 });
    await page.getByText(/ws: connected/).waitFor({ timeout: 20000 });
    await page.getByText('finished').waitFor({ timeout: 90000 });

    if (consoleErrors.length > 0) throw new Error(`console errors: ${consoleErrors.join('\n')}`);
    console.log('OK: pinocchio web-chat devctl Playwright smoke passed');
  } finally {
    await browser.close();
  }
}

await main();
