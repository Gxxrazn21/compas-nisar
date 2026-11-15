import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

// Usa el servidor existente; nunca lo inicia ni compila la aplicación.
const base = 'http://127.0.0.1:8000/';
const out = 'docs/screenshots';
const group = process.argv[2] ?? 'all';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const failedHosts = new Set();
  page.on('requestfailed', request => {
    const host = new URL(request.url()).host;
    if (!failedHosts.has(host)) {
      failedHosts.add(host);
      console.warn(`Request failed: ${host}: ${request.failure()?.errorText}`);
    }
  });
  page.setDefaultTimeout(90000);
  page.setDefaultNavigationTimeout(90000);
  const wait = ms => page.waitForTimeout(ms);
  const load = async (hash = '', ms = 10000) => {
    await page.goto(`${base}#lang=en${hash}`, { waitUntil: 'domcontentloaded' });
    // Los enlaces se interpretan al cargar; cambiar solo el hash conserva la vista anterior.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await wait(ms);
  };
  const closeHint = async () => {
    const hint = page.locator('.pista-cerrar');
    if (await hint.isVisible()) await hint.click();
  };
  const shot = async name => {
    await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 85, timeout: 90000 });
    console.log(JSON.stringify({ image: name, url: page.url(), title: await page.locator('.recorrido-titulo').allTextContents(), step: await page.locator('.recorrido-cuenta').allTextContents() }));
  };
  const tour = async () => {
    await load('', 6000);
    await page.locator('.recorrido-boton').click();
    await page.locator('.recorrido-controles .principal').click();
  };
  const step = async (n, title) => {
    const chapter = n >= 27 ? 4 : n >= 15 ? 3 : n >= 9 ? 2 : 1;
    const start = [1, 9, 15, 27][chapter - 1];
    await page.locator(`.recorrido-capitulos button:nth-child(${chapter})`).click();
    for (let current = start; current < n; current++) {
      await page.locator('.recorrido-controles button[aria-label]:last-of-type').click();
      await wait(700);
    }
    await wait(35000);
    const count = await page.locator('.recorrido-cuenta').innerText();
    const actual = await page.locator('.recorrido-titulo').innerText();
    if (count !== `Step ${n} of 31` || actual !== title) throw new Error(`Unexpected tour step: ${count}: ${actual}`);
  };
  if (group === 'all' || group === 'tour') {
    await load('', 10000);
    await shot('01-cover');
    await tour();
    await step(1, 'This is NISAR, right now');
    await shot('10-nisar-now');
    await step(2, 'Its real measurements');
    await shot('02-satellite-measurements');
    await step(5, 'Two radars in one');
    await shot('03-two-radars');
    await step(10, 'It looks sideways');
    await shot('04-side-looking-radar');
    await step(13, 'HH and HV');
    await shot('05-hh-hv');
    await page.getByRole('button', { name: 'Close the tour', exact: true }).click();
  }
  if (group === 'all' || group === 'data') {
    await load('&s=mojana&l=change_hh', 15000);
    await closeHint();
    await shot('06-mojana-hh-change');
    await load('&s=mojana&l=classes', 15000);
    await closeHint();
    await shot('07-mojana-signals');
  }
  if (group === 'all' || group === 'data' || group === 'context') {
    await load('&s=mojana&l=change_hh&cx=c60', 15000);
    await closeHint();
    for (let i = 0; i < 6; i++) {
      await page.locator('.zoom .icono:nth-of-type(2)').click();
      await wait(700);
    }
    await wait(35000);
    await shot('08-land-cover-context');
  }
  if (group === 'all' || group === 'data') {
    await page.keyboard.press('2');
    await wait(15000);
    await closeHint();
    await shot('09-explore');
  }
  if (group === 'all' || group === 'mobile') {
    await page.setViewportSize({ width: 390, height: 844 });
    await tour();
    await step(2, 'Its real measurements');
    await shot('11-mobile-tour');
  }
} finally {
  await browser.close();
}
