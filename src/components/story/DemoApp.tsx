import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { isDemoPackage } from '../../lib/demo';
import type { DemoPackage } from '../../lib/demo';
import { centerOfBounds, zoomForBounds } from '../../lib/camera';
import { useDance } from '../../state/useDance';
import type { CameraTarget, ProbeState } from '../../state/useCompas';
import type { MapLayer, ProbeResult } from '../../types';
import { Stage } from '../stage/Stage';
import type { StageApi } from '../stage/Stage';
import { Score } from '../score/Score';
import { ReadingPanel } from '../reading/ReadingPanel';
import { Sheet } from '../shell/Sheet';
import { MethodDialog } from '../method/MethodDialog';
import { unlockSound } from '../../lib/sound';

const TEXT = {
  es: {
    title: 'La Mojana: una señal que merece comprobarse', loading: 'Abriendo el recorrido guardado…',
    error: 'El recorrido no está disponible o está incompleto. Puedes reintentar o volver a explorar.',
    retry: 'Reintentar', back: 'Volver a Compás', label: 'Recorrido guardado', prepared: 'Preparado',
    note: 'Datos guardados, no en vivo. Este recorrido usa archivos locales verificados y no necesita consultar NASA. El contraste externo sí requiere conexión.',
    map: 'Mapa de radar sin fondo óptico. Norte arriba; las zonas sin color pueden carecer de datos.',
    question: '¿Qué zonas merecen una verificación de campo por cambios compatibles con expansión del agua?',
    steps: ['Observar el territorio', 'Comparar el retorno calibrado', 'Escuchar las observaciones', 'Verificar y compartir'],
    body: [
      'Comienza con la vista general entre el 26 de junio y el 24 de octubre de 2026. El azul indica menos retorno y el naranja más. Estos patrones orientan la búsqueda; no son un mapa de inundación confirmado.',
      'Acerca la mirada a una ventana de 15 km. Aquí se compara γ⁰ del producto científico, sin ajuste global entre fechas. Haz clic en el mapa para consultar un punto; la causa todavía requiere verificación.',
      'La secuencia muestra observaciones de la vista previa normalizadas. Escucha HH y HV en el centro marcado: la escala musical es compartida, pero no mide potencia absoluta entre canales. Los intervalos reales aparecen junto a cada fecha.',
      'Abre Datos para contrastar con Sentinel-1, registrar una observación local y descargar un informe portable. Las coincidencias visuales son pistas. La verificación de campo y la concordancia cuantitativa siguen pendientes.',
    ],
    layers: ['Antes', 'Después', 'Cambio HH', 'Cambio HV', 'Hipótesis'],
    previous: 'Anterior', next: 'Siguiente', method: 'Método', sheet: 'Mostrar paneles', sound: 'Sonido',
  },
  en: {
    title: 'La Mojana: a signal worth checking', loading: 'Opening the saved walkthrough…',
    error: 'The walkthrough is unavailable or incomplete. Retry or return to explore.', retry: 'Retry', back: 'Back to Compás',
    label: 'Saved walkthrough', prepared: 'Prepared',
    note: 'Saved data, not live. This walkthrough uses verified local files without querying NASA. External comparison still requires a connection.',
    map: 'Radar map without an optical basemap. North up; uncolored areas may have no data.',
    question: 'Which areas warrant field checks for changes consistent with expanding water?',
    steps: ['Observe the landscape', 'Compare calibrated return', 'Listen to observations', 'Verify and share'],
    body: [
      'Start with the overview from June 26 to October 24, 2026. Blue indicates less return and orange more. These patterns guide investigation; they are not a confirmed flood map.',
      'Focus on a 15 km window. Here we compare γ⁰ from the science product, with no global fit between dates. Click the map to query a point; the cause still needs verification.',
      'The sequence shows normalized preview observations. Listen to HH and HV at the marked center: the musical scale is shared, but does not measure absolute power across channels. Actual intervals appear beside each date.',
      'Open Data to compare with Sentinel-1, record a local observation and download a portable brief. Visual agreement is a clue. Field verification and quantitative agreement remain pending.',
    ],
    layers: ['Before', 'After', 'HH change', 'HV change', 'Hypotheses'],
    previous: 'Previous', next: 'Next', method: 'Method', sheet: 'Show panels', sound: 'Sound',
  },
};

export function DemoApp() {
  const { lang, setLang } = useI18n();
  const c = TEXT[lang];
  const [data, setData] = useState<DemoPackage | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(false);
    fetch('/api/demo/mojana', { signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const value: unknown = await r.json();
      if (!isDemoPackage(value)) throw new Error(); if (!controller.signal.aborted) setData(value);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  if (!data) return <main className="demo-loading"><h1>compás</h1><p role={error ? 'alert' : 'status'}>{error ? c.error : c.loading}</p>
    {error && <button className="primario" onClick={() => setAttempt(n => n + 1)}>{c.retry}</button>} <a href={`/#lang=${lang}`}>{c.back}</a></main>;
  return <Walkthrough data={data} lang={lang} onLang={() => setLang(lang === 'es' ? 'en' : 'es')} />;
}

function Walkthrough({ data, lang, onLang }: { data: DemoPackage; lang: 'es' | 'en'; onLang: () => void }) {
  const c = TEXT[lang];
  const [step, setStep] = useState(0);
  const [layer, setLayer] = useState<MapLayer>('change_hh');
  const [sound, setSound] = useState(false);
  const [method, setMethod] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [probe, setProbe] = useState<ProbeState | null>(null);
  const abort = useRef<AbortController | null>(null);
  const apiRef = useRef<StageApi | null>(null);
  const calibrated = step === 1 || step === 3;
  const change = calibrated ? data.zoom : data.change;
  const target = useMemo(() => ({ stack: data.stack.id, point: data.series.point, aoi: data.story.aoi }), [data]);
  const dance = useDance(target, data.series);
  const bounds = step === 2 ? data.series.bounds : change.bounds;
  const camera = useMemo<CameraTarget>(() => ({ kind: 'view', center: centerOfBounds(bounds), zoom: zoomForBounds(bounds), fit: bounds, nonce: step, instant: true }), [bounds, step]);
  useEffect(() => { abort.current?.abort(); setProbe(null); }, [change.id]);
  useEffect(() => () => abort.current?.abort(), []);
  const onProbe = (lon: number, lat: number) => {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setProbe({ point: [lon, lat], status: 'loading', result: null });
    fetch(`/api/demo/mojana/probe?${new URLSearchParams({ change: change.id, lon: String(lon), lat: String(lat) })}`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const result = await r.json() as ProbeResult; if (!controller.signal.aborted) setProbe({ point: [lon, lat], status: 'ready', result }); })
      .catch(() => { if (!controller.signal.aborted) setProbe({ point: [lon, lat], status: 'error', result: null }); });
  };
  const move = (next: number) => { dance.stop(); setStep(Math.max(0, Math.min(3, next))); setLayer('change_hh'); };
  const layerKeys: MapLayer[] = ['before', 'after', 'change_hh', 'change_hv', 'classes'];
  return <div className="app analisis vista-story con-lectura demo-app">
    <Stage offline projection="mercator" camera={camera} change={change} layer={dance.active ? 'dance' : layer} opacity={1}
      series={dance.series} danceIndex={dance.active ? dance.index : null} probePoint={dance.active ? dance.point : probe?.point ?? null}
      probing={!dance.active} onProbe={onProbe} picking={false} onPick={() => {}} explorePoint={null} footprint={null} live={null} overlay={null}
      opticalDate={null} context={{}} contextDate={change.after.date} reference={{ borders: true, names: true }} apiRef={apiRef} />
    <header className="barra-superior"><a className="marca" href={`/#lang=${lang}`}>compás</a><strong>{c.label}</strong><div className="demo-header-actions"><button className="secundario" onClick={onLang}>{lang === 'es' ? 'EN' : 'ES'}</button><button className="secundario" onClick={() => setMethod(true)}>{c.method}</button></div></header>
    <Sheet label={c.sheet}>
      <section className="panel panel-izq historia" data-cubre="left">
        <a href={`/#lang=${lang}`}>{c.back}</a><h1 className="titulo-historia">{c.title}</h1><p className="resumen">{c.question}</p>
        <p className="ayuda">{c.prepared}: {new Date(data.prepared_at).toLocaleDateString(lang, { timeZone: 'America/Bogota' })}</p><p className="ayuda">{c.note}</p>
        <ol className="pasos">{c.steps.map((title, i) => <li key={title} className={i === step ? 'paso activo' : 'paso'}>
          <button className="paso-cabeza" aria-current={i === step ? 'step' : undefined} aria-expanded={i === step} onClick={() => move(i)}><span className="paso-n">{i + 1}</span>{title}</button>
          {i === step && <div className="paso-cuerpo"><p>{c.body[i]}</p>{i === 2 && <button className="primario" disabled={dance.active || dance.phase === 'preload'} onClick={() => { unlockSound(); dance.start(); }}>{lang === 'es' ? 'Ver la danza' : 'Play the dance'}</button>}</div>}
        </li>)}</ol>
        <div className="pasos-nav"><button className="secundario" disabled={!step} onClick={() => move(step - 1)}>{c.previous}</button><button className="primario" disabled={step === 3} onClick={() => move(step + 1)}>{c.next}</button></div>
      </section>
      <nav className="barra-mapa demo-map-controls" aria-label={lang === 'es' ? 'Capas del recorrido' : 'Walkthrough layers'}>{layerKeys.map((key, i) => <button key={key} className="secundario" aria-pressed={layer === key && !dance.active} onClick={() => { dance.stop(); setLayer(key); }}>{c.layers[i]}</button>)}<button className="icono" aria-label="Zoom +" onClick={() => apiRef.current?.zoomIn()}>+</button><button className="icono" aria-label="Zoom −" onClick={() => apiRef.current?.zoomOut()}>−</button></nav>
      <ReadingPanel key={`${change.id}-${step}`} state={{ change, status: 'ready', error: null, elapsed: 0, retry: () => {} }} lens="agua" stack={data.stack} probe={probe}
        lupa={{ available: false, target: calibrated ? data.story.lupa ?? null : null, size: data.story.lupa?.size_km ?? 15, hasProbe: Boolean(probe), onSize: () => {}, onOpen: () => {}, onClose: () => move(0) }}
        collapsed={collapsed} onCollapse={setCollapsed} onMethod={() => setMethod(true)} initialTab={step === 3 ? 'datos' : 'lectura'} />
      <Score readOnly stack={data.stack} selection={{ before: data.story.before, after: data.story.after, awaiting: 'before' }} applied={{ before: data.story.before, after: data.story.after }}
        dance={{ ...dance, available: step === 2 }} comparing={false} sound={sound} onSound={() => { unlockSound(); setSound(s => !s); }} onPick={() => {}} onCompare={() => {}} />
    </Sheet>
    <footer className="pie">NISAR · NASA / ISRO / ASF. {c.map}</footer>
    <MethodDialog open={method} onClose={() => setMethod(false)} />
  </div>;
}
