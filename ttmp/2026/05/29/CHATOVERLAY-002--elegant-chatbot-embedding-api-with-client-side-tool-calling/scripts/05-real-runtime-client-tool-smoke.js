import { createRequire } from 'module';

const require = createRequire('/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/package.json');
const { chromium } = require('playwright');
const baseURL = process.env.CHAT_OVERLAY_URL || 'http://127.0.0.1:5173';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByTitle('Open chat').click();
  await page.getByPlaceholder('Type a message...').fill('Use the cart.add tool to add one Retro Hiking Boot to my cart. Then briefly confirm the result.');
  await page.getByRole('button', { name: 'SEND' }).click();

  await page.getByText('browser tool').waitFor({ timeout: 90000 });
  await page.getByTestId('tool-call-name').filter({ hasText: 'cart.add' }).waitFor({ timeout: 90000 });
  await page.getByTestId('tool-call-status').filter({ hasText: 'success' }).waitFor({ timeout: 90000 });
  await page.getByTestId('demo-cart-count').filter({ hasText: '1 item' }).waitFor({ timeout: 90000 });

  console.log('OK: real-runtime frontend tool smoke passed');
} finally {
  await browser.close();
}
