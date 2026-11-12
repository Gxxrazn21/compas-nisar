// Informe exportable de una comparación: fechas, método, estadísticas, procedencia y límites.
import { className } from './lens';
import { zoomSummary } from './lupa';
import { daysBetween } from './format';
import type { ChangeResult, Lang, Scene, Stack } from '../types';

const ASF_SEARCH = 'https://search.asf.alaska.edu/#/?granule=';

export interface ReportOptions {
  lang: Lang;
  lens: string;
  stack: Stack | null;
  /** Enlace permanente a esta vista. */
  link: string;
  /** Origen para convertir las rutas relativas de las capas en enlaces completos. */
  origin: string;
  /** Límites en el idioma de la interfaz. */
  limits: string[];
  generatedAt: string;
}

function sceneInfo(role: 'before' | 'after', scene: Scene) {
  return {
    rol: role === 'before' ? 'antes' : 'despues',
    fecha: scene.date,
    granule: scene.granule,
    calidad: scene.quality,
    modo: scene.mode,
    ciclo: scene.cycle,
    coleccion: scene.collection,
    buscador_asf: `${ASF_SEARCH}${encodeURIComponent(scene.granule)}`,
  };
}

/** Objeto del informe, listo para `JSON.stringify`. Función pura: no toca el DOM. */
export function buildReport(change: ChangeResult, options: ReportOptions) {
  const calibrated = change.source === 'gcov';
  const { stats } = change;
  const layers = Object.fromEntries(
    Object.entries(change.layers)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, path]) => [key, new URL(path, options.origin).toString()]),
  );
  return {
    informe: 'Compás: comparación de dos pasadas de NISAR',
    generado: options.generatedAt,
    enlace: options.link,
    fuente: calibrated ? 'gcov (lupa calibrada)' : 'browse (vista previa oficial)',
    unidades: calibrated
      ? 'dB reales de γ⁰ calibrado'
      : 'dB aproximados, relativos a la escena (no calibrados)',
    fechas: {
      antes: change.before.date,
      despues: change.after.date,
      dias_entre_pasadas: change.days_between ?? daysBetween(change.before.date, change.after.date),
    },
    pila: options.stack
      ? {
          id: options.stack.id,
          pista: options.stack.track,
          cuadro: options.stack.frame,
          direccion: options.stack.direction,
          polarizaciones: options.stack.polarizations,
        }
      : { id: change.stack },
    escenas: [sceneInfo('before', change.before), sceneInfo('after', change.after)],
    area: {
      limites: change.bounds,
      esquinas: change.coordinates,
      tamano_px: change.size,
      georeferencia: change.georef,
      resolucion_m: change.resolution_m ?? null,
      valida_km2: stats.valid_km2,
    },
    lente: options.lens,
    metodo: change.method,
    estadisticas: {
      cambio_km2: stats.changed_km2,
      cambio_pct: stats.changed_pct,
      correlacion: stats.correlation,
      confianza: stats.confidence,
      clases: stats.classes
        .filter((item) => item.km2 > 0)
        .map((item) => ({
          clave: item.key,
          nombre: className(options.lens, item.key, options.lang),
          km2: item.km2,
          pct: item.pct,
        })),
      hh: calibrated
        ? { mediana_antes_db: stats.hh.median_before_db, mediana_despues_db: stats.hh.median_after_db }
        : { ganancia: stats.hh.gain, sesgo: stats.hh.bias, concordantes: stats.hh.inliers },
      hv: stats.hv
        ? calibrated
          ? { mediana_antes_db: stats.hv.median_before_db, mediana_despues_db: stats.hv.median_after_db }
          : { ganancia: stats.hv.gain, sesgo: stats.hv.bias, concordantes: stats.hv.inliers }
        : null,
      resumen: calibrated ? zoomSummary(stats, options.lang) : undefined,
    },
    capas: layers,
    limites: options.limits,
    fuentes: [
      'Imágenes: NISAR (NASA e ISRO), distribuidas por ASF DAAC.',
      'Toda clase es una hipótesis («posible»), no un evento confirmado.',
    ],
  };
}

/** Descarga un objeto como archivo JSON. */
export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Contexto sin portapapeles: se prueba con un campo temporal.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    field.remove();
    return ok;
  }
}
