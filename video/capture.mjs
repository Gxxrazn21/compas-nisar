// Graba las tomas de la aplicación que usa el video. La app debe estar corriendo (scripts/start.ps1).
// Uso: node video/capture.mjs <en|es> [toma ...]      (sin tomas: todas)
// Salida: video/footage/<idioma>/<toma>/f_00001.jpg… y video/footage/<idioma>/<toma>.jpg (fijas)
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, FPS } from './recorder.mjs';

const BASE = process.env.COMPAS_URL ?? 'http://127.0.0.1:8000/';
const [lang = 'en', ...only] = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), 'footage', lang);
mkdirSync(root, { recursive: true });
const url = (hash = '') => `${BASE}#${hash}${hash ? '&' : ''}lang=${lang}`;
const CITY = 'Montería';

/** Espera a que el mapa y las imágenes terminen de llegar. */
async function settle(app, selector, ms = 5000) {
  if (selector) await app.page.waitForSelector(selector, { state: 'visible', timeout: 120000 });
  await app.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await app.wait(ms);
}

const SHOTS = {
  // Portada: el globo gira, se elige una historia y el globo vuela al lugar.
  async cover(app, dir) {
    await app.goto(url(), { x: 760, y: 300 });
    await settle(app, '.programa-fila', 6000);
    return app.record(dir, async (a) => {
      await a.wait(1800);
      await a.click('.programa-fila', 1000);
      await a.wait(6500);
    });
  },
  // Cortina: antes y después, arrastrando la línea divisoria.
  async curtain(app, dir) {
    await app.goto(url('s=mojana&p=1'), { x: 1000, y: 620 });
    await settle(app, '.cortina-asa', 6000);
    const box = await app.page.locator('.cortina-asa').boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    return app.record(dir, async (a) => {
      await a.wait(500);
      await a.moveTo({ x, y }, 800);
      await a.dragTo({ x: x - 300, y }, 1700);
      await a.wait(350);
      await a.moveTo({ x: x - 300, y }, 50);
      await a.dragTo({ x: x + 250, y }, 2200);
      await a.wait(350);
      await a.dragTo({ x, y }, 1300);
      await a.wait(600);
    });
  },
  // Cambio: aparece el mapa de cambio y se despliega la hipótesis de una clase.
  async change(app, dir) {
    await app.goto(url('s=mojana&p=1'), { x: 700, y: 520 });
    await settle(app, '.cortina-asa', 6000);
    return app.record(dir, async (a) => {
      await a.wait(400);
      await a.click('.pasos-nav .primario', 800);
      await a.wait(3000);
      await a.click('.clase-nombre', 1000);
      await a.wait(3200);
    });
  },
  // Danza: todas las pasadas de la serie, con la partitura marcando el ritmo.
  async dance(app, dir) {
    await app.goto(url('s=mojana&p=3'), { x: 760, y: 420 });
    await settle(app, '.paso-accion .primario', 5000);
    // Primera vuelta sin grabar para que los cuadros queden en caché.
    await app.page.click('.paso-accion .primario');
    await app.page.waitForSelector('.danza-controles', { timeout: 240000 });
    await app.wait(1500);
    await app.page.click('.danza-controles .secundario');
    await app.wait(1500);
    return app.record(dir, async (a) => {
      await a.wait(400);
      await a.click('.paso-accion .primario', 800);
      await a.moveTo({ x: 980, y: 560 }, 900);
      await a.wait(8500);
    });
  },
  // Sonda: un clic en el mapa dice qué midió el radar en ese punto.
  async probe(app, dir) {
    await app.goto(url('s=mojana&p=2'), { x: 900, y: 300 });
    await settle(app, '.clases', 6000);
    // Ensayo sin grabar. Solo cambió una fracción pequeña del cuadro, así que un clic al azar cae casi
    // siempre en «sin cambio»: dos clics de referencia dan la escala del mapa y la API dice dónde hay una clase.
    const asked = [];
    const onRequest = (request) => {
      const target = new URL(request.url());
      if (target.pathname === '/api/probe') asked.push(target.searchParams);
    };
    app.page.on('request', onRequest);
    const A = { x: 796, y: 478 };
    const B = { x: 700, y: 400 };
    for (const p of [A, B]) {
      await app.page.mouse.click(p.x, p.y);
      await app.wait(1500);
    }
    app.page.off('request', onRequest);
    let point = A;
    if (asked.length >= 2) {
      const [first, last] = [asked[0], asked[asked.length - 1]];
      const a0 = { lon: +first.get('lon'), lat: +first.get('lat') };
      const kx = (B.x - A.x) / (+last.get('lon') - a0.lon);
      const ky = (B.y - A.y) / (+last.get('lat') - a0.lat);
      const found = await app.page.evaluate(async ({ change, a0, kx, ky, A }) => {
        let seed = 7;                                   // misma secuencia en cada idioma
        const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
        for (let i = 0; i < 4000; i += 1) {
          const x = 650 + random() * 350;
          const y = 130 + random() * 420;
          const lon = a0.lon + (x - A.x) / kx;
          const lat = a0.lat + (y - A.y) / ky;
          const response = await fetch(`/api/probe?change=${change}&lon=${lon.toFixed(5)}&lat=${lat.toFixed(5)}`);
          if (!response.ok) continue;
          const body = await response.json();
          if (body.class === 'agua_nueva') return { x, y };
        }
        return null;
      }, { change: first.get('change'), a0, kx, ky, A });
      if (found) {
        // El globo no es una rejilla exacta: se afina alrededor con clics reales hasta dar con la clase.
        point = found;
        let answer;
        const onResponse = async (response) => {
          if (new URL(response.url()).pathname !== '/api/probe') return;
          try { answer = (await response.json()).class ?? null; } catch { answer = null; }
        };
        app.page.on('response', onResponse);
        const offsets = [];
        for (let dx = -8; dx <= 8; dx += 2) for (let dy = -8; dy <= 8; dy += 2) offsets.push([dx, dy]);
        offsets.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
        for (const [dx, dy] of offsets) {
          answer = undefined;
          await app.page.mouse.click(found.x + dx, found.y + dy);
          for (let i = 0; i < 30 && answer === undefined; i += 1) await app.wait(100);
          if (answer) { point = { x: found.x + dx, y: found.y + dy }; break; }
        }
        app.page.off('response', onResponse);
      }
      console.log(found ? `sonda: punto con cambio en ${Math.round(found.x)}, ${Math.round(found.y)}` : 'sonda: no se encontró un punto con cambio');
    }
    await app.goto(url('s=mojana&p=2'), { x: 900, y: 300 });
    await settle(app, '.clases', 6000);
    return app.record(dir, async (a) => {
      await a.wait(500);
      await a.click(point, 1100);
      await a.wait(4200);
    });
  },
  // Explorar: una ciudad lleva al punto y lista las series de pasadas.
  async explore(app, dir) {
    await app.goto(url('m=e'), { x: 900, y: 420 });
    await settle(app, '.buscador input', 5000);
    return app.record(dir, async (a) => {
      await a.wait(400);
      await a.click('.buscador input', 900);
      await a.page.keyboard.type(CITY, { delay: 110 });
      await a.wait(350);
      await a.page.keyboard.press('Enter');
      await a.page.waitForSelector('.lugares .enlace-texto', { timeout: 20000 });
      await a.wait(500);
      await a.click('.lugares .enlace-texto', 800);
      await a.wait(4500);
    });
  },
  // En vivo: eventos naturales recientes sobre el globo.
  async live(app, dir) {
    await app.goto(url('m=v'), { x: 900, y: 420 });
    await settle(app, '.fila-vivo', 5000);
    return app.record(dir, async (a) => {
      await a.wait(600);
      await a.click('.fila-vivo', 1000);
      await a.wait(3600);
    });
  },
  // NISAR ahora: el satélite en 3D sobre su órbita (tercera pestaña de En vivo).
  async satellite(app, dir) {
    await app.goto(url('m=v'), { x: 900, y: 420 });
    await settle(app, '.pestanas', 5000);
    return app.record(dir, async (a) => {
      await a.wait(400);
      await a.click('.pestanas button:nth-child(3)', 900);
      await a.wait(7000);
    });
  },
  // Contexto: el agua vista por Sentinel-1 encima del cambio de NISAR.
  async context(app, dir) {
    await app.goto(url('s=mojana&p=2'), { x: 900, y: 300 });
    await settle(app, '.clases', 6000);
    return app.record(dir, async (a) => {
      await a.wait(400);
      await a.click('.ctx-ficha', 900);
      await a.wait(5000);
    });
  },
  // Recorrido guiado: se abre desde la barra superior y avanza solo.
  async tour(app, dir) {
    await app.goto(url(), { x: 900, y: 420 });
    await settle(app, '.programa-fila', 5000);
    return app.record(dir, async (a) => {
      await a.wait(400);
      await a.click('.recorrido-boton', 900);
      await a.wait(9000);
    });
  },
};

// Imágenes fijas: otras historias y el diálogo Método.
const STILLS = {
  sanjoaquin: { hash: 's=sanjoaquin&p=2', wait: '.clases' },
  vatnajokull: { hash: 's=vatnajokull&p=2', wait: '.clases' },
  kilauea: { hash: 's=kilauea&p=1', wait: '.panel' },
  mojana: { hash: 's=mojana&p=2', wait: '.clases' },
};

const app = await openApp();
try {
  for (const [name, shot] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(name)) continue;
    const result = await shot(app, join(root, name));
    console.log(`${lang}/${name}: ${result.frames} cuadros (${(result.frames / FPS).toFixed(1)} s, ${result.captured} capturados)`);
  }
  for (const [name, still] of Object.entries(STILLS)) {
    if (only.length && !only.includes(name)) continue;
    await app.goto(url(still.hash), { x: -50, y: -50 });
    await settle(app, still.wait, 7000);
    await app.still(join(root, `${name}.jpg`));
    console.log(`${lang}/${name}.jpg`);
  }
  if (!only.length || only.includes('method')) {
    await app.goto(url(), { x: -50, y: -50 });
    await settle(app, '.programa-fila', 3000);
    // El primer .enlace de la barra es ahora el recorrido: se elige el de Método.
    await app.page.click('.barra-derecha .enlace:not(.recorrido-boton):not(.ayuda-boton)');
    await app.wait(1500);
    await app.still(join(root, 'method.jpg'));
    console.log(`${lang}/method.jpg`);
  }
} finally {
  await app.close();
}
