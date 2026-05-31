import { createRequire } from 'module';
import { spawnSync } from 'node:child_process';

const repo = '/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm';
const require = createRequire(`${repo}/web/package.json`);
const { chromium } = require('playwright');
const url = process.env.CHAT_OVERLAY_URL || 'http://127.0.0.1:15173';

function runDevctl(args, { allowFailure = false } = {}) {
  const result = spawnSync('devctl', args, { cwd: repo, stdio: 'inherit', env: process.env });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`devctl ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

async function main() {
  runDevctl(['down'], { allowFailure: true });
  runDevctl(['up', '--force']);
  runDevctl(['status', '--tail-lines', '5']);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByTitle('Open chat').click();

    await page.getByPlaceholder('Type a message...').fill('show me boots');
    await page.getByRole('button', { name: 'SEND' }).click();
    await page.getByText('TrailBlazer Pro').waitFor({ timeout: 20000 });
    await page.getByText('RECOMMENDED BOOTS').waitFor({ timeout: 20000 });

    await page.getByPlaceholder('Type a message...').fill('add boots to cart');
    await page.getByRole('button', { name: 'SEND' }).click();
    await page.getByTestId('tool-call-name').filter({ hasText: 'cart.add' }).waitFor({ timeout: 20000 });
    await page.getByTestId('tool-call-status').filter({ hasText: 'success' }).waitFor({ timeout: 20000 });
    await page.getByTestId('demo-cart-count').filter({ hasText: '1 item' }).waitFor({ timeout: 20000 });
    await page.getByText('The browser ran cart.add and the demo cart now contains 1 item(s).').waitFor({ timeout: 20000 });

    console.log('OK: chat-overlay devctl Playwright smoke passed');
  } finally {
    await browser.close();
  }
}

await main();
