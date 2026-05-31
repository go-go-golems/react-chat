import { createRequire } from 'module';

const require = createRequire('/home/manuel/workspaces/2026-05-29/chatbot-react/2026-05-29--chatbot-overlay-glm/web/package.json');
const { chromium } = require('playwright');
const baseURL = process.env.CHAT_OVERLAY_URL || 'http://127.0.0.1:5173';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByTitle('Open chat').click();
  await page.getByPlaceholder('Type a message...').fill('show me boots');
  await page.getByRole('button', { name: 'SEND' }).click();

  await page.getByText('Here are some great boots I found for you:').waitFor({ timeout: 15000 });
  await page.getByText('RECOMMENDED BOOTS').waitFor({ timeout: 15000 });
  await page.getByText('TrailBlazer Pro').waitFor({ timeout: 15000 });

  console.log('OK: widget browser smoke passed');
} finally {
  await browser.close();
}
