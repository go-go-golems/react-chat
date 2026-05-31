import { createRequire } from 'module';
import { spawnSync } from 'node:child_process';

const repo = '/home/manuel/workspaces/2026-05-29/chatbot-react/2026-03-16--gec-rag';
const playwrightPackage = '/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/package.json';
const require = createRequire(playwrightPackage);
const { chromium } = require('playwright');
const url = process.env.COINVAULT_URL || 'http://127.0.0.1:5173';

function run(cmd, args, { cwd = repo, allowFailure = false } = {}) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

async function main() {
  run('devctl', ['down'], { allowFailure: true });
  run('pnpm', ['install'], { cwd: `${repo}/web` });
  run('devctl', ['up', '--force']);
  run('devctl', ['status', '--tail-lines', '5']);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) consoleErrors.push(msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('CoinVault Pro').first().waitFor({ timeout: 20000 });
    await page.getByText('INVENTORY OVERVIEW').waitFor({ timeout: 20000 });
    await page.getByText('Total SKUs').waitFor({ timeout: 20000 });
    await page.getByText('STOCK ALERTS').waitFor({ timeout: 20000 });

    const ok = page.getByText('OK');
    if (await ok.count()) await ok.first().click();
    await page.getByRole('button', { name: 'Show me all low stock items' }).click();
    await page.getByText('▶Show me all low stock items').waitFor({ timeout: 30000 });
    await page.waitForURL(/conv_id=/, { timeout: 30000 });

    if (consoleErrors.length > 0) throw new Error(`console errors: ${consoleErrors.join('\n')}`);
    console.log('OK: CoinVault devctl Playwright smoke passed');
  } finally {
    await browser.close();
  }
}

await main();
