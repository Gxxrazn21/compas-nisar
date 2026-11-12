// Capturas de pantalla con el Chrome del sistema (sin descargar navegadores).
// Uso: node scripts/shot.mjs <url> <salida.png> [ancho=1440] [alto=900] [esperaMs=4000] [pasos.json]
// pasos.json (opcional): [{"click":"selector"},{"wait":1500},{"key":"ArrowRight"},{"shot":"otra.png"},{"eval":"código"}]
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const [url, out, width = '1440', height = '900', wait = '4000', stepsFile] = process.argv.slice(2);
if (!url || !out) {
  console.error('Uso: node scripts/shot.mjs <url> <salida.png> [ancho] [alto] [esperaMs] [pasos.json]');
  process.exit(1);
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: +width, height: +height }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (message) => { if (message.type() === 'error') problems.push(`consola: ${message.text()}`); });
page.on('pageerror', (error) => problems.push(`excepción: ${error.message}`));
page.on('requestfailed', (request) => problems.push(`falló: ${request.url().slice(0, 140)}`));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(+wait);

if (stepsFile) {
  for (const step of JSON.parse(readFileSync(stepsFile, 'utf8'))) {
    if (step.click) await page.click(step.click, { timeout: 15000 });
    if (step.key) await page.keyboard.press(step.key);
    if (step.eval) await page.evaluate(step.eval);
    if (step.wait) await page.waitForTimeout(step.wait);
    if (step.shot) await page.screenshot({ path: step.shot });
  }
}

await page.screenshot({ path: out });
console.log(`captura: ${out}`);
if (problems.length) console.log(`problemas (${problems.length}):\n` + [...new Set(problems)].slice(0, 25).join('\n'));
await browser.close();
