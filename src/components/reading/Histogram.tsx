// Histograma pequeño del cambio por píxel (dB aproximados o reales), en SVG a mano.
import { useI18n } from '../../i18n';
import { formatNumber } from '../../lib/format';
import type { Histogram as HistogramData } from '../../types';

const WIDTH = 316;
const HEIGHT = 130;
const PLOT_TOP = 6;
const PLOT_BOTTOM = 86;
const THRESHOLD = 3;

export function Histogram({ data, calibrated = false }: { data: HistogramData; calibrated?: boolean }) {
  const { t, lang } = useI18n();
  const { edges, counts } = data;
  if (edges.length < 2 || counts.length !== edges.length - 1) return null;

  const min = edges[0] as number;
  const max = edges[edges.length - 1] as number;
  const x = (value: number) => ((value - min) / (max - min)) * WIDTH;
  // Raíz cuadrada: la mayoría de los píxeles no cambia y aplastaría las colas.
  const peak = Math.sqrt(Math.max(...counts, 1));
  const height = PLOT_BOTTOM - PLOT_TOP;
  const ticks = [-10, -THRESHOLD, 0, THRESHOLD, 10].filter((tick) => tick >= min && tick <= max);

  return (
    <section className="bloque" aria-labelledby="hist-h">
      <h3 id="hist-h">{t('hist.title')}</h3>
      <svg className="histograma" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t('hist.desc')}>
        {counts.map((count, index) => {
          const left = edges[index] as number;
          const right = edges[index + 1] as number;
          const middle = (left + right) / 2;
          const bar = (Math.sqrt(count) / peak) * height;
          const tone = Math.abs(middle) < 1 ? 'quieto' : middle < 0 ? 'baja' : 'sube';
          return (
            <rect
              key={index}
              className={`hist-barra ${tone}`}
              x={x(left) + 0.5}
              y={PLOT_BOTTOM - bar}
              width={Math.max(1, x(right) - x(left) - 1)}
              height={bar}
            />
          );
        })}
        {[-THRESHOLD, THRESHOLD].map((value) => (
          <line key={value} className="hist-umbral" x1={x(value)} x2={x(value)} y1={PLOT_TOP} y2={PLOT_BOTTOM} />
        ))}
        <line className="hist-eje" x1={0} x2={WIDTH} y1={PLOT_BOTTOM + 0.5} y2={PLOT_BOTTOM + 0.5} />
        {ticks.map((tick) => (
          <text
            key={tick}
            className="hist-rotulo"
            x={Math.min(WIDTH - 10, Math.max(10, x(tick)))}
            y={PLOT_BOTTOM + 17}
            textAnchor="middle"
          >
            {tick > 0 ? '+' : ''}
            {formatNumber(tick, lang)}
          </text>
        ))}
        <text className="hist-rotulo" x={WIDTH / 2} y={HEIGHT - 2} textAnchor="middle">
          {t(calibrated ? 'hist.axisCal' : 'hist.axis')}
        </text>
      </svg>
    </section>
  );
}
