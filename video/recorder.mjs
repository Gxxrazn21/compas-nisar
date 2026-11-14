// Grabadora de la aplicación para el video: abre Chrome sin ventana, mueve un cursor visible
// y guarda lo que pinta la página como una secuencia de imágenes a ritmo constante.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

export const FPS = 30;
export const VIEW = { width: 1600, height: 900 };   // se graba a 1,2x: 1920 x 1080
const SCALE = 1.2;

const CURSOR = `
  (() => {
    if (document.getElementById('cursor-video')) return;
    const c = document.createElement('div');
    c.id = 'cursor-video';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M4 2 L4 20 L9 15.5 L12.4 23 L15.4 21.6 L12 14.4 L19 14.4 Z" fill="#f2efe6" stroke="#0a1626" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none',
      transform: 'translate(-100px,-100px)', willChange: 'transform', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))' });
    const ring = document.createElement('div');
    ring.id = 'cursor-pulso';
    Object.assign(ring.style, { position: 'fixed', left: '0', top: '0', width: '44px', height: '44px', margin: '-22px 0 0 -22px',
      borderRadius: '50%', border: '2px solid #e8b84a', zIndex: 2147483646, pointerEvents: 'none', opacity: '0' });
    document.documentElement.append(ring, c);
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
    addEventListener('mousedown', (e) => {
      ring.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      ring.animate([{ opacity: 0.95, scale: 0.35 }, { opacity: 0, scale: 1.25 }], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }, true);
  })();
`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function openApp({ gpu = true } = {}) {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: gpu
      ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars']
      : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
  });
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.addInitScript(() => { try { localStorage.removeItem('compas.lang'); } catch { /* sin almacenamiento */ } });
  const cdp = await context.newCDPSession(page);
  let pos = { x: VIEW.width / 2, y: VIEW.height / 2 };

  const api = {
    browser, page,
    wait: (ms) => page.waitForTimeout(ms),
    /** Carga una vista desde cero (cada toma parte de su enlace permanente) y deja el cursor en `start`. */
    async goto(target, start = { x: VIEW.width / 2, y: VIEW.height / 2 }) {
      await page.goto('about:blank');
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.evaluate(CURSOR);
      pos = start;
      await page.mouse.move(pos.x, pos.y);
    },
    /** Imagen fija a 1920 x 1080 para planos con acercamiento. */
    still: (file) => page.screenshot({ path: file, type: 'jpeg', quality: 95 }),
    /** Mueve el cursor con aceleración y frenado hasta un punto o hasta el centro de un selector. */
    async moveTo(target, ms = 700) {
      let to = target;
      if (typeof target === 'string') {
        const box = await page.locator(target).first().boundingBox();
        if (!box) throw new Error(`No se encontró ${target}`);
        to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }
      const from = pos;
      // La posición depende del reloj, no del número de pasos: la toma dura lo mismo con el equipo cargado.
      const start = Date.now();
      for (;;) {
        const elapsed = Date.now() - start;
        const k = ease(Math.min(1, elapsed / ms));
        await page.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
        if (elapsed >= ms) break;
        await page.waitForTimeout(8);
      }
      pos = to;
    },
    async click(target, ms = 700) {
      await api.moveTo(target, ms);
      await page.waitForTimeout(140);
      await page.mouse.down();
      await page.waitForTimeout(70);
      await page.mouse.up();
    },
    /** Arrastra desde la posición actual hasta un punto, con el botón presionado. */
    async dragTo(to, ms = 1400) {
      await page.mouse.down();
      await page.waitForTimeout(80);
      await api.moveTo(to, ms);
      await page.waitForTimeout(80);
      await page.mouse.up();
    },
    /** Graba lo que haga `action` en `dir` como f_00001.jpg… a FPS constantes. Devuelve cuántos cuadros. */
    async record(dir, action) {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(join(dir, 'raw'), { recursive: true });
      const frames = [];
      let n = 0;
      const onFrame = async ({ data, metadata, sessionId }) => {
        const file = join(dir, 'raw', `${String(n).padStart(6, '0')}.jpg`);
        n += 1;
        writeFileSync(file, Buffer.from(data, 'base64'));
        frames.push({ t: metadata.timestamp, file });
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      };
      cdp.on('Page.screencastFrame', onFrame);
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1,
        maxWidth: Math.round(VIEW.width * SCALE), maxHeight: Math.round(VIEW.height * SCALE) });
      await page.waitForTimeout(250);
      const t0 = Date.now();
      await action(api);
      const seconds = (Date.now() - t0) / 1000;
      await page.waitForTimeout(150);
      await cdp.send('Page.stopScreencast');
      cdp.off('Page.screencastFrame', onFrame);
      if (!frames.length) throw new Error('La página no entregó cuadros.');
      // Los cuadros llegan solo cuando la página cambia: se reparten en una rejilla de tiempo constante
      // que dura lo mismo que la acción (el último cuadro se sostiene si la página quedó quieta).
      const start = t0 / 1000;
      const total = Math.max(1, Math.round(seconds * FPS));
      let j = 0;
      for (let i = 0; i < total; i += 1) {
        const t = start + i / FPS;
        while (j + 1 < frames.length && frames[j + 1].t <= t) j += 1;
        copyFileSync(frames[j].file, join(dir, `f_${String(i + 1).padStart(5, '0')}.jpg`));
      }
      rmSync(join(dir, 'raw'), { recursive: true, force: true });
      return { frames: total, captured: frames.length, seconds: +seconds.toFixed(2) };
    },
    close: () => browser.close(),
  };
  return api;
}
