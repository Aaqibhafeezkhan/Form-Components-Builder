import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = path.resolve(root, relativePath);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const content = await readFile(filePath);
    response.writeHead(200, { 'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/`;
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  await context.addInitScript(() => {
    window.QRCode = class {
      constructor(target, options) {
        target.dataset.encodedText = options.text;
        target.dataset.generated = 'true';
      }
    };
  });

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.FF && window.FF._initialized));

  const hasHorizontalOverflow = () => page.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await hasHorizontalOverflow(), false, 'desktop layout should not overflow horizontally');

  await page.setViewportSize({ width: 768, height: 900 });
  assert.equal(await hasHorizontalOverflow(), false, 'tablet layout should not overflow horizontally');
  assert.ok(await page.locator('#panel-canvas').evaluate(element => element.getBoundingClientRect().width > 0));

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await hasHorizontalOverflow(), false, 'mobile layout should not overflow horizontally');
  await page.locator('#btn-mobile-palette').click();
  assert.equal(await page.locator('#panel-palette').evaluate(element => getComputedStyle(element).display), 'flex');
  await page.locator('#palette-collapse-btn').click();
  assert.equal(await page.locator('#panel-palette').evaluate(element => getComputedStyle(element).display), 'none');
  await page.locator('#btn-mobile-properties').click();
  assert.equal(await page.locator('#panel-properties').evaluate(element => getComputedStyle(element).display), 'flex');
  await page.locator('#properties-collapse-btn').click();
  assert.equal(await page.locator('#panel-properties').evaluate(element => getComputedStyle(element).display), 'none');

  await page.evaluate(() => {
    window.FF.appState.elements = [
      { id: 'default-text', type: 'text', props: { label: 'Name', required: true, defaultValue: 'Default name' } },
      { id: 'default-checkbox', type: 'checkbox', props: { label: 'Updates', defaultValue: true } },
      { id: 'default-dropdown', type: 'dropdown', props: { label: 'Plan', required: true, options: ['Basic', 'Pro'], defaultValue: 'Pro' } },
      { id: 'default-radio', type: 'radio', props: { label: 'Choice', required: true, options: ['One', 'Two'], defaultValue: 'Two' } },
      { id: 'default-checkbox-group', type: 'checkbox-group', props: { label: 'Topics', required: true, options: ['One', 'Two'], defaultValue: ['Two'] } },
      { id: 'default-multi', type: 'multi-select', props: { label: 'Tags', options: ['One', 'Two', 'Three'], defaultValue: ['One', 'Three'] } },
      { id: 'default-slider', type: 'slider', props: { label: 'Score', validation: { min: 0, max: 100 }, defaultValue: '37' } },
      { id: 'default-rating', type: 'rating', props: { label: 'Rating', defaultValue: '4' } }
    ];
  });
  await page.locator('#btn-preview').click();
  assert.equal(await page.locator('#pv-default-text').inputValue(), 'Default name');
  assert.equal(await page.locator('#pv-default-checkbox').isChecked(), true);
  assert.equal(await page.locator('#pv-default-dropdown').inputValue(), 'Pro');
  assert.equal(await page.locator('#preview-form input[name="pv-default-radio"]:checked').inputValue(), 'Two');
  assert.equal(await page.locator('#preview-form input[name="pv-default-checkbox-group"]:checked').inputValue(), 'Two');
  assert.equal(await page.locator('#pv-default-multi').evaluate(select => [...select.selectedOptions].map(option => option.value).join(',')), 'One,Three');
  assert.equal(await page.locator('#pv-default-slider').inputValue(), '37');
  assert.equal(await page.locator('#preview-form input[name="pv-default-rating"]:checked').inputValue(), '4');

  await page.locator('#pv-default-text').fill('Changed');
  await page.locator('#pv-default-checkbox').uncheck();
  await page.locator('#pv-default-dropdown').selectOption('Basic');
  await page.locator('#btn-preview-reset').click();
  assert.equal(await page.locator('#pv-default-text').inputValue(), 'Default name');
  assert.equal(await page.locator('#pv-default-checkbox').isChecked(), true);
  assert.equal(await page.locator('#pv-default-dropdown').inputValue(), 'Pro');
  await page.locator('#preview-form button[type="submit"]').click();
  assert.equal(await page.locator('#preview-success-msg').isVisible(), true, 'preview defaults should satisfy configured required fields');

  await page.locator('#modal-preview-close').click();
  await page.evaluate(() => {
    window.FF.appState.formConfig = { title: 'QR smoke test' };
    window.FF.appState.elements = [
      { id: 'qr-field', type: 'text', props: { label: 'QR test field' } }
    ];
  });
  await page.locator('#btn-export').click();
  await page.locator('#btn-export-qr').click();
  const qrText = await page.locator('#qr-code-inner').getAttribute('data-encoded-text');
  const qrPrefix = 'data:application/json;charset=utf-8,';
  assert.ok(qrText && qrText.startsWith(qrPrefix), 'QR generation should receive a Form JSON data URL');
  const qrJson = JSON.parse(decodeURIComponent(qrText.slice(qrPrefix.length)));
  assert.equal(qrJson.formConfig.title, 'QR smoke test');
  assert.equal(qrJson.elements[0].id, 'qr-field');
  assert.equal(qrJson.version, await page.evaluate(() => window.FF.SCHEMA_VERSION));

  const generatedHtml = await page.evaluate(() => window.FF.Export.buildHtml({
    formConfig: { title: 'Validation smoke test', submitLabel: 'Submit' },
    elements: [
      { id: 'required-name', type: 'text', props: { label: 'Name', required: true, validation: { minLength: 3 } } },
      { id: 'required-topics', type: 'checkbox-group', props: { label: 'Topics', required: true, options: ['One', 'Two'] } }
    ]
  }));
  const exportedPage = await context.newPage();
  await exportedPage.setContent(generatedHtml);
  assert.equal(await exportedPage.locator('#main-form').evaluate(form => form.noValidate), false);
  assert.equal(await exportedPage.locator('#required-name').evaluate(input => input.validity.valueMissing), true);
  await exportedPage.locator('#required-name').fill('Aaqib');
  await exportedPage.locator('#main-form button[type="submit"]').click();
  const requiredGroupCheckbox = exportedPage.locator('[data-required-group="true"] input[type="checkbox"]').first();
  assert.equal(await requiredGroupCheckbox.evaluate(input => input.validity.customError), true);
  assert.equal(await exportedPage.locator('#success-msg').isVisible(), false);
  await requiredGroupCheckbox.check();
  await exportedPage.locator('#main-form button[type="submit"]').click();
  assert.equal(await exportedPage.locator('#success-msg').isVisible(), true, 'exported HTML should show success only after validation');

  assert.deepEqual(pageErrors, [], 'application should not throw browser runtime errors');
  console.log('Browser smoke tests passed: desktop, tablet, mobile drawers, preview defaults/reset, QR export, generated HTML validation.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
