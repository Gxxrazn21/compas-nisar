// Esquemas del capítulo «Cómo funciona el radar»: la órbita, la mirada de lado, el eco, lo que
// devuelve cada superficie, las dos polarizaciones y la comparación de dos pasadas. Son SVG con
// animaciones cortas en bucle; con «reducir movimiento» quedan quietos.
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { prefersReducedMotion } from '../../state/useElapsed';

export type DiagramKind = 'orbit' | 'look' | 'echo' | 'surfaces' | 'polarization' | 'repeat';

type T = (key: Key) => string;

/** Pequeño satélite visto de canto: el cuerpo y el reflector encima. */
function Craft({ x, y }: { x: number; y: number }) {
  return (
    <g className="esq-nave" transform={`translate(${x} ${y})`}>
      <ellipse cx="6" cy="-13" rx="17" ry="4" />
      <path d="M-6 -3L-10 -12" />
      <rect x="-9" y="-4" width="18" height="9" rx="1.5" />
    </g>
  );
}

function Orbit({ t, moving }: { t: T; moving: boolean }) {
  // La órbita casi polar, inclinada unos grados respecto al eje de la Tierra.
  const path = 'M150 28C166 28 178 82 178 150S166 272 150 272S122 218 122 150S134 28 150 28Z';
  return (
    <>
      <circle className="esq-tierra" cx="150" cy="150" r="80" />
      <ellipse className="esq-tenue" cx="150" cy="150" rx="80" ry="22" />
      <ellipse className="esq-tenue" cx="150" cy="150" rx="34" ry="80" />
      <path className="esq-flecha" d="M88 190Q150 222 212 190" markerEnd="url(#esq-punta)" />
      <text className="esq-nota" x="150" y="238" textAnchor="middle">{t('tour.d.earthTurns')}</text>
      <g transform="rotate(-9 150 150)">
        <path className="esq-orbita" d={path} />
        <circle className="esq-sat" r="5.5" cx={moving ? 0 : 150} cy={moving ? 0 : 28}>
          {moving && <animateMotion dur="8s" repeatCount="indefinite" path={path} />}
        </circle>
      </g>
      <text className="esq-rotulo" x="196" y="40">{t('tour.d.lap')}</text>
      <text className="esq-rotulo" x="150" y="292" textAnchor="middle">{t('tour.d.repeat')}</text>
    </>
  );
}

/** Frentes de onda que salen del satélite y quedan recortados al haz. */
function Waves({ cx, cy, clip, moving, echo = false }: { cx: number; cy: number; clip: string; moving: boolean; echo?: boolean }) {
  if (!moving) return <circle className={echo ? 'esq-eco' : 'esq-pulso'} cx={cx} cy={cy} r="120" clipPath={`url(#${clip})`} />;
  return (
    <g clipPath={`url(#${clip})`}>
      {[0, 1].map((index) => (
        <circle key={index} className={echo ? 'esq-eco' : 'esq-pulso'} cx={cx} cy={cy} r="10">
          <animate attributeName="r" values={echo ? '250;10' : '10;250'} dur="3.2s" begin={`${index * 1.6 + (echo ? 0.8 : 0)}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values={echo ? '0;0.9;0.9' : '0.95;0.9;0'} dur="3.2s" begin={`${index * 1.6 + (echo ? 0.8 : 0)}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function Look({ t, moving }: { t: T; moving: boolean }) {
  return (
    <>
      <defs>
        <clipPath id="esq-haz-mirada">
          <path d="M215 52L38 248H132Z" />
        </clipPath>
      </defs>
      <text className="esq-nota" x="286" y="22" textAnchor="end">{t('tour.d.fromBehind')}</text>
      <path className="esq-suelo" d="M14 248H286" />
      <path className="esq-tenue esq-discontinua" d="M215 58V248" />
      <text className="esq-nota" x="222" y="160">{t('tour.d.altitude')}</text>
      <path className="esq-haz" d="M215 52L38 248H132Z" />
      <Waves cx={215} cy={52} clip="esq-haz-mirada" moving={moving} />
      <path className="esq-franja" d="M38 248H132" />
      <text className="esq-rotulo" x="85" y="270" textAnchor="middle">{t('tour.d.swath')}</text>
      <text className="esq-nota" x="38" y="288" textAnchor="middle">{t('tour.d.far')}</text>
      <text className="esq-nota" x="132" y="288" textAnchor="middle">{t('tour.d.near')}</text>
      <text className="esq-nota" x="118" y="120" textAnchor="end">{t('tour.d.angles')}</text>
      <Craft x={215} y={52} />
    </>
  );
}

function Echo({ t, moving }: { t: T; moving: boolean }) {
  return (
    <>
      <defs>
        <clipPath id="esq-haz-eco">
          <path d="M210 44L30 196H150Z" />
        </clipPath>
      </defs>
      <path className="esq-suelo" d="M14 196H286" />
      <path className="esq-haz" d="M210 44L30 196H150Z" />
      <Waves cx={210} cy={44} clip="esq-haz-eco" moving={moving} />
      <Waves cx={210} cy={44} clip="esq-haz-eco" moving={moving} echo />
      {/* Dos objetos: una casa lejos y un árbol cerca. */}
      <path className="esq-objeto" d="M46 196V180L57 170L68 180V196Z" />
      <path className="esq-objeto" d="M128 196V184M118 184L128 162L138 184Z" />
      <Craft x={210} y={44} />
      <text className="esq-rotulo esq-oro" x="150" y="86" textAnchor="end">{t('tour.d.pulse')}</text>
      <text className="esq-rotulo" x="190" y="150">{t('tour.d.echo')}</text>
      {/* Línea de tiempo: el eco de lo cercano llega primero. */}
      <path className="esq-tenue" d="M30 262H270" markerEnd="url(#esq-punta)" />
      <path className="esq-traza" d="M30 262H96L104 232L112 262H186L194 240L202 262H262" />
      <text className="esq-nota" x="104" y="226" textAnchor="middle">{t('tour.d.near')}</text>
      <text className="esq-nota" x="194" y="234" textAnchor="middle">{t('tour.d.far')}</text>
      <text className="esq-nota" x="270" y="282" textAnchor="end">{t('tour.d.time')}</text>
      <text className="esq-nota" x="30" y="290">{t('tour.d.nearFirst')}</text>
    </>
  );
}

function Surfaces({ t }: { t: T }) {
  const ground = 168;
  const columns = [38, 113, 187, 262];
  const incoming = (cx: number) => <path className="esq-rayo esq-oro-trazo" d={`M${cx + 30} 70L${cx + 2} ${ground - 3}`} markerEnd="url(#esq-punta-oro)" />;
  return (
    <>
      {columns.map((cx) => (
        <g key={cx}>{incoming(cx)}</g>
      ))}
      {/* Agua quieta: el pulso rebota hacia el otro lado. */}
      <path className="esq-agua" d={`M${columns[0]! - 30} ${ground}H${columns[0]! + 30}`} />
      <path className="esq-rayo" d={`M${columns[0]!} ${ground - 3}L${columns[0]! - 28} 74`} markerEnd="url(#esq-punta)" />
      {/* Suelo rugoso: se reparte en todas direcciones y una parte vuelve. */}
      <path className="esq-suelo" d={`M${columns[1]! - 30} ${ground}l8 -4l7 5l8 -6l7 6l8 -5l7 4l5 -3`} />
      <path className="esq-rayo esq-fino" d={`M${columns[1]!} ${ground - 4}l-22 -44M${columns[1]!} ${ground - 4}l-6 -52`} />
      <path className="esq-rayo" d={`M${columns[1]! + 4} ${ground - 6}L${columns[1]! + 24} 96`} markerEnd="url(#esq-punta)" />
      {/* Bosque: rebota entre ramas y troncos. */}
      <path className="esq-suelo" d={`M${columns[2]! - 30} ${ground}H${columns[2]! + 30}`} />
      <path className="esq-objeto" d={`M${columns[2]! - 14} ${ground}v-14m-11 0l11 -30l11 30zM${columns[2]! + 13} ${ground}v-12m-10 0l10 -26l10 26z`} />
      <path className="esq-rayo" d={`M${columns[2]! + 2} ${ground - 22}l-12 -6l16 -8l-10 -8L${columns[2]! + 26} 92`} markerEnd="url(#esq-punta)" />
      {/* Edificios: suelo y pared devuelven casi todo (doble rebote). */}
      <path className="esq-suelo" d={`M${columns[3]! - 30} ${ground}H${columns[3]! + 30}`} />
      <path className="esq-objeto" d={`M${columns[3]! - 24} ${ground}V112h18V${ground}z`} />
      <path className="esq-rayo esq-grueso" d={`M${columns[3]! + 2} ${ground - 3}L${columns[3]! - 6} ${ground - 22}L${columns[3]! + 22} 78`} markerEnd="url(#esq-punta)" />
      {[
        ['tour.d.water', '#05080f'],
        ['tour.d.soil', '#5c6672'],
        ['tour.d.forest', '#aeb6bf'],
        ['tour.d.city', '#f2efe6'],
      ].map(([key, color], index) => (
        <g key={key}>
          <text className="esq-rotulo" x={columns[index]} y="46" textAnchor="middle">{t(key as Key)}</text>
          <rect className="esq-muestra" x={columns[index]! - 22} y="196" width="44" height="44" rx="3" fill={color} />
        </g>
      ))}
      <text className="esq-nota" x="150" y="268" textAnchor="middle">{t('tour.d.inImage')}</text>
    </>
  );
}

/** Onda que vibra en vertical (se ve de frente) o en horizontal (acostada, en perspectiva). */
function Wave({ x, y, length, flat, back, className }: { x: number; y: number; length: number; flat: boolean; back?: boolean; className: string }) {
  const cycles = 4;
  const step = length / (cycles * 2);
  const amplitude = flat ? 5 : 13;
  let d = `M0 0`;
  for (let i = 0; i < cycles * 2; i += 1) d += `q${step / 2} ${i % 2 ? amplitude : -amplitude} ${step} 0`;
  return (
    <g transform={`translate(${x} ${y})${flat ? ' skewX(-38)' : ''}`}>
      <path className={className} d={d} markerEnd={back ? undefined : 'url(#esq-punta)'} markerStart={back ? 'url(#esq-punta-inicio)' : undefined} />
    </g>
  );
}

function Polarization({ t }: { t: T }) {
  const row = (y: number, hv: boolean) => (
    <g>
      <text className={`esq-titulo ${hv ? 'esq-hv' : 'esq-hh'}`} x="14" y={y - 30}>{hv ? 'HV' : 'HH'}</text>
      <Craft x={36} y={y + 12} />
      <Wave x={64} y={y - 6} length={130} flat className="esq-onda esq-hh-trazo" />
      <text className="esq-nota" x="128" y={y - 24} textAnchor="middle">{t('tour.d.sends')}</text>
      <Wave x={64} y={y + 30} length={130} flat={!hv} back className={`esq-onda ${hv ? 'esq-hv-trazo' : 'esq-hh-trazo'}`} />
      {hv ? (
        <path className="esq-objeto" d={`M246 ${y + 40}v-16m-16 0l16 -42l16 42zM270 ${y + 40}v-12m-11 0l11 -30l11 30z`} />
      ) : (
        <>
          <path className="esq-suelo" d={`M214 ${y + 40}H288`} />
          <path className="esq-objeto" d={`M244 ${y + 40}V${y - 14}h26V${y + 40}z`} />
        </>
      )}
      <text className="esq-nota" x="64" y={y + 62}>{t(hv ? 'tour.d.hvBack' : 'tour.d.hhBack')}</text>
    </g>
  );
  return (
    <>
      {row(64, false)}
      <path className="esq-tenue" d="M14 150H286" />
      {row(206, true)}
    </>
  );
}

function Repeat({ t, moving }: { t: T; moving: boolean }) {
  const tile = (x: number, label: string, body: ReactNode) => (
    <g>
      <text className="esq-rotulo" x={x + 42} y="78" textAnchor="middle">{label}</text>
      <rect className="esq-baldosa" x={x} y="90" width="84" height="84" rx="4" />
      {body}
    </g>
  );
  return (
    <>
      {tile(12, t('tour.d.day0'), <ellipse cx="50" cy="136" rx="14" ry="10" fill="#05080f" />)}
      <text className="esq-signo" x="102" y="140" textAnchor="middle">→</text>
      {tile(108, t('tour.d.day12'), <ellipse cx="150" cy="134" rx="28" ry="20" fill="#05080f" />)}
      <text className="esq-signo" x="198" y="140" textAnchor="middle">=</text>
      {tile(
        204,
        t('tour.d.change'),
        <g>
          <rect x="204" y="90" width="84" height="84" rx="4" fill="#0a1626" />
          <path className="esq-baja" fillRule="evenodd" d="M218 134a28 20 0 1 0 56 0a28 20 0 1 0 -56 0zM232 136a14 10 0 1 0 28 0a14 10 0 1 0 -28 0z">
            {moving && <animate attributeName="opacity" values="0.35;1;1;0.35" dur="4s" repeatCount="indefinite" />}
          </path>
          <circle className="esq-sube" cx="270" cy="106" r="6" />
        </g>,
      )}
      <rect className="esq-baja" x="52" y="214" width="16" height="16" rx="3" />
      <text className="esq-nota" x="76" y="227">{t('tour.d.less')}</text>
      <rect className="esq-sube" x="168" y="214" width="16" height="16" rx="3" />
      <text className="esq-nota" x="192" y="227">{t('tour.d.more')}</text>
    </>
  );
}

export function RadarDiagram({ kind }: { kind: DiagramKind }) {
  const { t } = useI18n();
  const moving = !prefersReducedMotion();
  return (
    <svg className="esquema" viewBox="0 0 300 300" role="img" aria-label={t(`tour.d.aria.${kind}` as Key)}>
      <defs>
        <marker id="esq-punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="esq-punta" d="M1 1L9 5L1 9" />
        </marker>
        <marker id="esq-punta-inicio" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="esq-punta" d="M9 1L1 5L9 9" />
        </marker>
        <marker id="esq-punta-oro" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="esq-punta esq-oro-trazo" d="M1 1L9 5L1 9" />
        </marker>
      </defs>
      {kind === 'orbit' && <Orbit t={t} moving={moving} />}
      {kind === 'look' && <Look t={t} moving={moving} />}
      {kind === 'echo' && <Echo t={t} moving={moving} />}
      {kind === 'surfaces' && <Surfaces t={t} />}
      {kind === 'polarization' && <Polarization t={t} />}
      {kind === 'repeat' && <Repeat t={t} moving={moving} />}
    </svg>
  );
}
