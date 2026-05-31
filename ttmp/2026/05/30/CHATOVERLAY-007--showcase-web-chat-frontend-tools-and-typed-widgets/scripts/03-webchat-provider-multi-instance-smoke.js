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

function withProviderMultiDemo(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('providerMultiDemo', '1');
  parsed.searchParams.set('smokeRun', String(Date.now()));
  return parsed.toString();
}

async function nonEmptyText(page, testId, timeout = 15000) {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ timeout });
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      return !!el && !!el.textContent && el.textContent.trim() !== '' && el.textContent.trim() !== '(pending)';
    },
    testId,
    { timeout },
  );
  return (await locator.textContent())?.trim() || '';
}

async function main() {
  runDevctl(['down'], { allowFailure: true });
  runDevctl(['up', '--force']);
  runDevctl(['status', '--tail-lines', '5']);
  const url = withProviderMultiDemo(devctlViteURL(defaultUrl));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    window.localStorage.removeItem('pinocchio.web-chat.multi.left.sessionId');
    window.localStorage.removeItem('pinocchio.web-chat.multi.right.sessionId');
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) consoleErrors.push(msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('ChatProvider multi-instance smoke').waitFor({ timeout: 15000 });

    const leftSession = await nonEmptyText(page, 'multi-session-left');
    const rightSession = await nonEmptyText(page, 'multi-session-right');
    if (leftSession === rightSession) {
      throw new Error(`expected distinct provider sessions, both were ${leftSession}`);
    }

    await page.getByTestId('multi-send-left').click();
    await page.getByTestId('multi-send-right').click();

    await page.getByTestId('multi-timeline-left').getByText('hello from left provider').waitFor({ timeout: 30000 });
    await page.getByTestId('multi-timeline-right').getByText('hello from right provider').waitFor({ timeout: 30000 });

    const leftTimeline = (await page.getByTestId('multi-timeline-left').textContent()) || '';
    const rightTimeline = (await page.getByTestId('multi-timeline-right').textContent()) || '';
    if (leftTimeline.includes('hello from right provider')) throw new Error('left provider timeline contains right prompt');
    if (rightTimeline.includes('hello from left provider')) throw new Error('right provider timeline contains left prompt');

    if (consoleErrors.length > 0) throw new Error(`console errors: ${consoleErrors.join('\n')}`);
    console.log('OK: web-chat ChatProvider multi-instance smoke passed');
  } finally {
    await browser.close();
  }
}

await main();
