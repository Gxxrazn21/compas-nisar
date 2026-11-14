// Motor de la composición. Todo depende de una sola cosa: el tiempo. `window.seek(t)` deja la página
// exactamente como debe verse en el segundo `t`, así el render sale idéntico cada vez.
// Vista previa en el navegador: index.html?lang=es&t=24   (sin `t`, se reproduce en tiempo real)
(() => {
  const S = window.SCRIPT;
  const params = new URLSearchParams(location.search);
  const lang = params.get('lang') === 'es' ? 'es' : 'en';
  const T = S.text[lang];
  const FOOTAGE = window.FOOTAGE || {};
  document.documentElement.lang = lang;

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const outCubic = (k) => 1 - Math.pow(1 - k, 3);
  const outQuint = (k) => 1 - Math.pow(1 - k, 5);
  const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const outBack = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (parent, tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    for (const key of Object.keys(attrs)) el.setAttribute(key, attrs[key]);
    parent.appendChild(el);
    return el;
  };
  /** Entrada típica: sube `dy` píxeles mientras aparece. */
  const rise = (el, k, dy = 30) => {
    const e = outQuint(k);
    el.style.opacity = e;
    el.style.transform = `translateY(${(1 - e) * dy}px)`;
  };
  const split = (el, text, byWord) => {
    el.textContent = '';
    const parts = byWord ? text.split(' ') : [...text];
    return parts.map((part, i) => {
      const span = document.createElement('span');
      span.textContent = byWord && i < parts.length - 1 ? `${part} ` : part;
      el.appendChild(span);
      return span;
    });
  };
  const PAPEL = [242, 239, 230];
  const ORO = [232, 184, 74];
  const PAUTA = [91, 112, 144];
  const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;

  // ---------------------------------------------------------------- apertura y concepto
  const letters = split($('wordmark'), 'compás', false);
  const words = split($('tagline'), T.tagline, true);
  $('concept-h').textContent = T.conceptH;
  $('concept-p').textContent = T.conceptP;

  const staff = $('staff');
  const TOP = 650;
  const GAP = 24;
  const X0 = 160;
  const X1 = 1760;
  const lines = [0, 1, 2, 3, 4].map((i) =>
    svg(staff, 'line', { x1: X0, x2: X1, y1: TOP + i * GAP, y2: TOP + i * GAP, stroke: 'var(--pauta)',
      'stroke-width': 2, 'stroke-dasharray': X1 - X0, 'stroke-dashoffset': X1 - X0 }));
  const PITCH = [6, 4, 5, 3, 6, 4, 2, 5, 3, 4, 6, 2];
  const GOLD = [4, 9];
  const noteX = (k) => 250 + k * 128;
  const noteY = (k) => TOP + PITCH[k] * (GAP / 2);
  const bars = PITCH.map((_, k) =>
    svg(staff, 'line', { x1: noteX(k) - 64, x2: noteX(k) - 64, y1: TOP, y2: TOP + 4 * GAP, stroke: 'var(--pauta)',
      'stroke-width': 2, opacity: 0 }));
  const notes = PITCH.map((_, k) => {
    const g = svg(staff, 'g');
    const head = svg(g, 'ellipse', { rx: 17, ry: 12, transform: 'rotate(-22)' });
    const stem = svg(g, 'line', { x1: 15.5, y1: -5, x2: 15.5, y2: -86, 'stroke-width': 3.2, 'stroke-linecap': 'round' });
    return { g, head, stem };
  });
  const [ga, gb] = GOLD;
  const slur = svg(staff, 'path', {
    d: `M ${noteX(ga) + 16} ${noteY(ga) - 100} Q ${(noteX(ga) + noteX(gb)) / 2 + 16} ${Math.min(noteY(ga), noteY(gb)) - 240} ${noteX(gb) + 16} ${noteY(gb) - 100}`,
    fill: 'none', stroke: 'var(--oro)', 'stroke-width': 4, 'stroke-linecap': 'round', pathLength: 1,
    'stroke-dasharray': 1, 'stroke-dashoffset': 1,
  });
  const label = (x, text, color, size = 36) => {
    const el = svg(staff, 'text', { x, y: TOP + 4 * GAP + 78, 'text-anchor': 'middle', fill: color, 'font-size': size, opacity: 0 });
    el.textContent = text;
    return el;
  };
  const labelBefore = label(noteX(ga), T.before, 'var(--oro)');
  const labelAfter = label(noteX(gb), T.after, 'var(--oro)');
  const bx0 = noteX(0) + 64;
  const bx1 = noteX(1) + 64;
  const by = TOP + 4 * GAP + 30;
  const bracket = svg(staff, 'path', { d: `M ${bx0} ${by - 10} V ${by} H ${bx1} V ${by - 10}`, fill: 'none',
    stroke: 'var(--bruma)', 'stroke-width': 2.5, opacity: 0 });
  const labelDays = label((bx0 + bx1) / 2, T.days, 'var(--bruma)', 32);

  function intro(t) {
    const { start, end, conceptAt } = S.intro;
    const el = $('intro');
    const on = t >= start && t < end;
    el.style.opacity = on ? 1 - seg(t, end - 0.5, end) : 0;
    if (!on) return;
    lines.forEach((line, i) => {
      line.setAttribute('stroke-dashoffset', (X1 - X0) * (1 - outCubic(seg(t, 0.3 + i * 0.12, 1.9 + i * 0.12))));
    });
    const leave = seg(t, conceptAt - 0.25, conceptAt + 0.35);
    letters.forEach((span, j) => {
      const k = outQuint(seg(t, 0.9 + j * 0.08, 1.8 + j * 0.08));
      span.style.opacity = k * (1 - leave);
      span.style.transform = `translateY(${(1 - k) * 70 - inOut(leave) * 40}px)`;
    });
    words.forEach((span, j) => {
      const k = outQuint(seg(t, 2.3 + j * 0.09, 2.95 + j * 0.09));
      span.style.opacity = k * (1 - leave);
      span.style.transform = `translateY(${(1 - k) * 26 - inOut(leave) * 40}px)`;
    });
    const gold = seg(t, conceptAt + 2.5, conceptAt + 3.1);
    notes.forEach((note, k) => {
      const at = 3.0 + k * 0.27;
      const p = seg(t, at, at + 0.5);
      const scale = p <= 0 ? 0 : outBack(p);
      note.g.setAttribute('transform', `translate(${noteX(k)},${noteY(k)}) scale(${scale})`);
      const color = GOLD.includes(k) ? mix(PAPEL, ORO, gold) : mix(PAPEL, PAUTA, gold * 0.55);
      note.head.setAttribute('fill', color);
      note.stem.setAttribute('stroke', color);
      bars[k].setAttribute('opacity', seg(t, at - 0.1, at + 0.3));
    });
    rise($('concept-h'), seg(t, conceptAt + 0.4, conceptAt + 1.2), 36);
    const days = outCubic(seg(t, conceptAt + 1.5, conceptAt + 2.1));
    bracket.setAttribute('opacity', days);
    labelDays.setAttribute('opacity', days);
    slur.setAttribute('stroke-dashoffset', 1 - inOut(seg(t, conceptAt + 2.8, conceptAt + 3.9)));
    labelBefore.setAttribute('opacity', outCubic(seg(t, conceptAt + 2.7, conceptAt + 3.2)));
    labelAfter.setAttribute('opacity', outCubic(seg(t, conceptAt + 3.6, conceptAt + 4.1)));
    rise($('concept-p'), seg(t, conceptAt + 3.9, conceptAt + 4.7), 26);
  }

  // ---------------------------------------------------------------- la aplicación
  const shot = $('shot-a');
  $('shot-b').remove();
  const cam = $('cam');
  const mark = $('mark');
  const WIN = { w: 1456, h: 819, base: 0.91 };
  let wanted = '';
  const pad = (n) => String(n).padStart(5, '0');

  function camera(points, lt) {
    let a = points[0];
    let b = points[points.length - 1];
    for (let i = 0; i < points.length - 1; i += 1) {
      if (lt >= points[i][0] && lt <= points[i + 1][0]) { a = points[i]; b = points[i + 1]; break; }
    }
    if (lt <= points[0][0]) b = a;
    if (lt >= b[0]) a = b;
    const k = a === b ? 0 : inOut(seg(lt, a[0], b[0]));
    const s = lerp(a[3], b[3], k) * WIN.base;
    const tx = clamp(WIN.w / 2 - lerp(a[1], b[1], k) * s, WIN.w - 1600 * s, 0);
    const ty = clamp(WIN.h / 2 - lerp(a[2], b[2], k) * s, WIN.h - 900 * s, 0);
    cam.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
  }

  function app(t) {
    const { start, end } = S.app;
    const el = $('app');
    const on = t >= start && t < end;
    el.style.opacity = on ? seg(t, start, start + 0.5) * (1 - seg(t, end - 0.4, end)) : 0;
    if (!on) return null;
    const item = S.shots.find((candidate) => t >= candidate.start && t < candidate.end) ?? S.shots[S.shots.length - 1];
    const lt = t - item.start;
    const dur = item.end - item.start;
    const count = FOOTAGE[item.id] ?? 1;
    // La toma se ajusta a la escena: si es más larga se acelera; si es más corta, se sostiene el último cuadro.
    const speed = Math.max(1, count / S.fps / (dur - 0.3));
    const frame = clamp(Math.floor(lt * speed * S.fps) + 1, 1, count);
    wanted = `/video/footage/${lang}/${item.id}/f_${pad(frame)}.jpg`;
    shot.style.opacity = seg(lt, 0, 0.3) * (1 - seg(lt, dur - 0.2, dur));
    camera(item.cam, lt);
    if (item.mark) {
      const [a, b, x, y, w, h] = item.mark;
      const k = outCubic(seg(lt, a, a + 0.35)) * (1 - seg(lt, b - 0.3, b));
      Object.assign(mark.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, opacity: k,
        transform: `scale(${lerp(1.06, 1, outCubic(seg(lt, a, a + 0.45)))})` });
    } else {
      mark.style.opacity = 0;
    }
    $('kicker').textContent = item[lang][0];
    $('headline').textContent = item[lang][1];
    const leave = seg(lt, dur - 0.4, dur - 0.1);
    rise($('kicker'), seg(lt, 0.15, 0.7) * (1 - leave), 18);
    rise($('headline'), seg(lt, 0.25, 0.85) * (1 - leave), 24);
    return wanted;
  }

  // ---------------------------------------------------------------- las cuatro historias
  $('montage-h').textContent = T.montageH;
  const SLOTS = [[232, 158], [984, 158], [232, 592], [984, 592]];
  const cards = T.cards.map(([id, title, place], i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.left = `${SLOTS[i][0]}px`;
    card.style.top = `${SLOTS[i][1]}px`;
    const img = document.createElement('img');
    img.src = `/video/footage/${lang}/${id}.jpg`;
    const text = document.createElement('div');
    text.className = 'card-label';
    text.innerHTML = '<p class="card-title"></p><p class="card-place"></p>';
    text.children[0].textContent = title;
    text.children[1].textContent = place;
    card.append(img, text);
    $('cards').appendChild(card);
    return { card, img };
  });

  function montage(t) {
    const { start, end } = S.montage;
    const el = $('montage');
    const on = t >= start && t < end;
    el.style.opacity = on ? 1 - seg(t, end - 0.4, end) : 0;
    if (!on) return;
    const lt = t - start;
    rise($('montage-h'), seg(lt, 0.1, 0.8), 30);
    cards.forEach(({ card, img }, i) => {
      const k = outQuint(seg(lt, 0.45 + i * 0.4, 1.25 + i * 0.4));
      card.style.opacity = k;
      card.style.transform = `translateY(${(1 - k) * 46}px) scale(${lerp(0.96, 1, k)})`;
      img.style.transform = `scale(${lerp(2.0, 2.18, seg(lt, 0, end - start))})`;
    });
  }

  // ---------------------------------------------------------------- evidencia
  $('honesty-h').textContent = T.honestyH;
  const bullets = T.honesty.map((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    $('honesty-list').appendChild(li);
    return li;
  });
  $('honesty-img').src = `/video/footage/${lang}/method.jpg`;

  function honesty(t) {
    const { start, end } = S.honesty;
    const el = $('honesty');
    const on = t >= start && t < end;
    el.style.opacity = on ? 1 - seg(t, end - 0.4, end) : 0;
    if (!on) return;
    const lt = t - start;
    rise($('honesty-h'), seg(lt, 0.15, 0.9), 32);
    bullets.forEach((li, i) => rise(li, seg(lt, 1.0 + i * 0.75, 1.7 + i * 0.75), 22));
    const k = outQuint(seg(lt, 0.4, 1.3));
    const win = $('honesty-window');
    win.style.opacity = k;
    win.style.transform = `translateX(${(1 - k) * 70}px)`;
    // El diálogo Método ocupa x 528–1392, y 64–1016 de la captura: se muestra a 0,9 y se recorre hacia abajo.
    const pan = inOut(seg(lt, 1.2, end - start - 0.6));
    $('honesty-img').style.transform = `translate(-474px,${lerp(-58, -355, pan)}px) scale(0.9)`;
  }

  // ---------------------------------------------------------------- cierre
  const outroLetters = split($('outro-mark'), 'compás', false);
  $('outro-a').textContent = T.outroA;
  $('outro-b').textContent = T.outroB;
  const oStaff = $('outro-staff');
  const OX0 = 600;
  const OX1 = 1320;
  const oLines = [0, 1, 2, 3, 4].map((i) =>
    svg(oStaff, 'line', { x1: OX0, x2: OX1, y1: 20 + i * 18, y2: 20 + i * 18, stroke: 'var(--pauta)', 'stroke-width': 2,
      'stroke-dasharray': OX1 - OX0, 'stroke-dashoffset': OX1 - OX0 }));
  const oThin = svg(oStaff, 'line', { x1: OX1 - 16, x2: OX1 - 16, y1: 20, y2: 92, stroke: 'var(--papel)', 'stroke-width': 2.5, opacity: 0 });
  const oThick = svg(oStaff, 'line', { x1: OX1 - 3, x2: OX1 - 3, y1: 20, y2: 92, stroke: 'var(--papel)', 'stroke-width': 8, opacity: 0 });

  function outro(t) {
    const { start, end } = S.outro;
    const el = $('outro');
    const on = t >= start && t <= end;
    el.style.opacity = on ? 1 - seg(t, end - 0.7, end - 0.1) : 0;
    if (!on) return;
    const lt = t - start;
    outroLetters.forEach((span, j) => {
      span.style.display = 'inline-block';
      rise(span, seg(lt, 0.2 + j * 0.07, 1.0 + j * 0.07), 60);
    });
    oLines.forEach((line, i) => {
      line.setAttribute('stroke-dashoffset', (OX1 - OX0) * (1 - outCubic(seg(lt, 0.7 + i * 0.08, 1.8 + i * 0.08))));
    });
    oThin.setAttribute('opacity', seg(lt, 1.9, 2.2));
    oThick.setAttribute('opacity', seg(lt, 2.05, 2.35));
    rise($('outro-a'), seg(lt, 1.5, 2.2), 22);
    rise($('outro-b'), seg(lt, 1.9, 2.6), 22);
    rise($('outro-c'), seg(lt, 2.6, 3.3), 18);
  }

  // ---------------------------------------------------------------- línea de tiempo como partitura
  const progress = $('progress');
  const PX0 = 232;
  const PX1 = 1688;
  const px = (time) => PX0 + (time / S.duration) * (PX1 - PX0);
  [0, 1, 2, 3, 4].forEach((i) =>
    svg(progress, 'line', { x1: PX0, x2: PX1, y1: 12 + i * 7, y2: 12 + i * 7, stroke: 'var(--linea)', 'stroke-width': 1.5 }));
  const beats = [S.intro.start, S.intro.conceptAt, ...S.shots.map((item) => item.start), S.montage.start,
    S.honesty.start, S.outro.start];
  const PPITCH = [4, 2, 5, 3, 6, 4, 2, 5, 3, 6, 4, 2];
  const pNotes = beats.map((time, i) => {
    const g = svg(progress, 'g');
    const head = svg(g, 'ellipse', { rx: 6.6, ry: 4.6, transform: 'rotate(-22)' });
    const stem = svg(g, 'line', { x1: 6, y1: -2, x2: 6, y2: -24, 'stroke-width': 1.8, 'stroke-linecap': 'round' });
    return { g, head, stem, time, x: px(time) + 8, y: 12 + PPITCH[i % PPITCH.length] * 3.5 };
  });
  const playhead = svg(progress, 'line', { y1: 0, y2: 52, stroke: 'var(--oro)', 'stroke-width': 2.5, 'stroke-linecap': 'round' });

  function timeline(t) {
    progress.style.opacity = seg(t, S.app.start, S.app.start + 0.7) * (1 - seg(t, S.outro.start - 0.5, S.outro.start));
    pNotes.forEach((note, i) => {
      const next = beats[i + 1] ?? S.duration;
      const lit = seg(t, note.time - 0.05, note.time + 0.25);
      const current = t >= note.time && t < next;
      const color = mix(PAUTA, ORO, lit);
      note.head.setAttribute('fill', color);
      note.stem.setAttribute('stroke', color);
      const pop = current ? lerp(1.5, 1.25, outCubic(seg(t, note.time, note.time + 0.5))) : 1;
      note.g.setAttribute('transform', `translate(${note.x},${note.y}) scale(${pop})`);
    });
    playhead.setAttribute('x1', px(t));
    playhead.setAttribute('x2', px(t));
  }

  // ---------------------------------------------------------------- reloj
  let current = '';
  window.seek = async (t) => {
    intro(t);
    const src = app(t);
    montage(t);
    honesty(t);
    outro(t);
    timeline(t);
    if (src && src !== current) {
      current = src;
      shot.src = src;
      try { await shot.decode(); } catch { /* cuadro ausente: se conserva el anterior */ }
    }
    return true;
  };

  const fonts = ['italic 500 100px "Bodoni Moda"', '400 100px "Bodoni Moda"', '400 30px "IBM Plex Sans"', '500 30px "IBM Plex Sans"'];
  const images = [...document.images].filter((img) => img.src).map((img) => img.decode().catch(() => {}));
  window.ready = Promise.all([...fonts.map((font) => document.fonts.load(font)), ...images]).then(() => window.seek(0));

  if (!window.RENDER) {
    const fixed = params.get('t');
    window.ready.then(() => {
      if (fixed !== null) return window.seek(Number(fixed));
      const t0 = performance.now() - Number(params.get('from') ?? 0) * 1000;
      const tick = () => {
        const t = ((performance.now() - t0) / 1000) % S.duration;
        window.seek(t).then(() => requestAnimationFrame(tick));
      };
      tick();
      return null;
    });
  }
})();
