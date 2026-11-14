// Convierte la composición (video/composition) en un MP4 de 1920 x 1080 a 30 cuadros por segundo.
// Uso:  node video/render.mjs <en|es>                      → video/out/compas-<idioma>.mp4
//       node video/render.mjs <en|es> --frame 24.5 a.jpg   → un solo cuadro, para revisar (o varios: 2,8,24)
//       node video/render.mjs <en|es> --from 13 --to 23    → solo un tramo
// Con --audio <archivo> la pista se mezcla en el MP4. Necesita ffmpeg y Google Chrome instalados.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const args = process.argv.slice(2);
const lang = args[0] === 'es' ? 'es' : 'en';
const option = (name) => { const i = args.indexOf(name); return i === -1 ? null : args.slice(i + 1); };

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer((request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname)));
  if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  response.end(readFileSync(path));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;

// Cuántos cuadros tiene cada toma grabada con capture.mjs.
const footageDir = join(here, 'footage', lang);
if (!existsSync(footageDir)) {
  console.error(`Faltan las tomas en ${footageDir}. Grábalas con: node video/capture.mjs ${lang}`);
  process.exit(1);
}
const footage = {};
for (const entry of readdirSync(footageDir, { withFileTypes: true })) {
  if (entry.isDirectory()) footage[entry.name] = readdirSync(join(footageDir, entry.name)).filter((f) => f.startsWith('f_')).length;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.error(`error en la composición: ${error.message}`));
await page.addInitScript((data) => { window.FOOTAGE = data; window.RENDER = true; }, footage);
await page.goto(`${base}/video/composition/index.html?lang=${lang}`, { waitUntil: 'load' });
await page.evaluate(() => window.ready);
const { fps, duration } = await page.evaluate(() => window.SCRIPT);
const cdp = await page.context().newCDPSession(page);
const grab = async (t, quality = 94) => {
  await page.evaluate((time) => window.seek(time), t);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality });
  return Buffer.from(data, 'base64');
};

try {
  const single = option('--frame');
  if (single) {
    // Varios tiempos separados por comas → a-1.jpg, a-2.jpg…
    const times = single[0].split(',').map(Number);
    for (const [i, time] of times.entries()) {
      const file = times.length === 1 ? single[1] : single[1].replace(/(\.\w+)$/, `-${i + 1}$1`);
      writeFileSync(file, await grab(time, 90));
      console.log(`cuadro ${time} s → ${file}`);
    }
  } else {
    const from = Number(option('--from')?.[0] ?? 0);
    const to = Number(option('--to')?.[0] ?? duration);
    const audio = option('--audio')?.[0];
    const partial = from > 0 || to < duration;
    mkdirSync(join(here, 'out'), { recursive: true });
    const out = join(here, 'out', partial ? `compas-${lang}-${from}-${to}.mp4` : `compas-${lang}.mp4`);
    const input = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
    if (audio && !partial) input.push('-i', audio);
    const output = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart'];
    if (audio && !partial) output.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    const ffmpeg = spawn('ffmpeg', [...input, ...output, out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((done, fail) => ffmpeg.on('close', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg terminó con código ${code}`)))));
    const first = Math.round(from * fps);
    const last = Math.round(to * fps);
    const began = Date.now();
    for (let i = first; i < last; i += 1) {
      const frame = await grab(i / fps);
      if (!ffmpeg.stdin.write(frame)) await new Promise((done) => ffmpeg.stdin.once('drain', done));
      if ((i - first) % 300 === 0 && i > first) {
        console.log(`${lang}: ${i - first} de ${last - first} cuadros (${((Date.now() - began) / 1000).toFixed(0)} s)`);
      }
    }
    ffmpeg.stdin.end();
    await closed;
    console.log(`listo: ${out}`);
  }
} finally {
  await browser.close();
  server.close();
}
