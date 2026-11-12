// «¿Por qué cambió?»: por cada clase de cambio, qué hace la señal, el mecanismo físico más probable,
// otras causas posibles y qué polarización lo revela. Es contenido científico, no una conclusión:
// cada hipótesis termina diciendo que es una pista y cómo comprobarla.
// El lente solo reordena las causas (en hielo van primero las de nieve; en cultivos, las agrícolas);
// nunca añade ni quita ninguna.
import type { ClassKey, Lang } from '../types';
import { asLens } from './lens';
import type { LensId } from './lens';

/** Familia de una causa: sirve para decidir cuáles van primero según el lente. */
export type Theme = 'water' | 'snow' | 'farm' | 'other';

type Text = Record<Lang, string>;

interface Cause {
  theme: Theme;
  text: Text;
}

interface Entry {
  signal: Text;
  mechanism: Text;
  /**
   * El mecanismo explica la primera causa (la de por defecto) y no las demás: si el lente promueve
   * otra causa, el mecanismo viaja con la suya en lugar de presentarse como el más probable.
   */
  mechanismOfFirst?: boolean;
  causes: Cause[];
  polarization: Text;
  check: Text;
}

export interface Hypothesis {
  signal: string;
  /** `null` cuando el lente promueve una causa a la que ese mecanismo no corresponde. */
  mechanism: string | null;
  /** La causa que el lente pone primero. */
  lead: string;
  /** Las demás causas posibles, en orden. */
  others: string[];
  polarization: string;
  check: string;
}

/** Temas que el lente pone primero. */
const PRIORITY: Record<LensId, Theme[]> = {
  general: [],
  agua: ['water'],
  vegetacion: ['farm'],
  hielo: ['snow'],
};

const HYPOTHESES: Record<ClassKey, Entry> = {
  agua_nueva: {
    signal: {
      es: 'El retorno HH cae hasta quedar oscuro.',
      en: 'The HH return drops until it is dark.',
    },
    mechanism: {
      es: 'Una superficie lisa actúa como un espejo: manda la onda lejos del satélite y casi nada regresa.',
      en: 'A smooth surface acts like a mirror: it sends the wave away from the satellite and almost nothing returns.',
    },
    causes: [
      {
        theme: 'water',
        text: {
          es: 'Agua abierta nueva: una creciente, el llenado de una ciénaga o un riego por inundación.',
          en: 'New open water: a flood, a marsh filling up or flood irrigation.',
        },
      },
      { theme: 'farm', text: { es: 'Suelo recién alisado.', en: 'Freshly smoothed soil.' } },
      { theme: 'snow', text: { es: 'Nieve muy húmeda.', en: 'Very wet snow.' } },
    ],
    polarization: {
      es: 'Se ve en HH y en HV: caen las dos.',
      en: 'It shows in HH and in HV: both drop.',
    },
    check: {
      es: 'Es una pista, no una prueba. Para comprobarla, compárala con el agua de Sentinel-1 (en Contexto) o con el mapa óptico del día, y prueba con otra fecha de la partitura.',
      en: 'This is a clue, not proof. To check it, compare it with the Sentinel-1 water layer (under Context) or the daily optical map, and try another date on the score.',
    },
  },
  agua_retirada: {
    signal: {
      es: 'El retorno HH sube desde un valor oscuro.',
      en: 'The HH return rises from a dark value.',
    },
    mechanism: {
      es: 'Al retirarse el agua queda al descubierto suelo rugoso o vegetación, que sí devuelven señal al satélite.',
      en: 'When the water recedes it leaves rough soil or vegetation exposed, which do send signal back to the satellite.',
    },
    mechanismOfFirst: true,
    causes: [
      { theme: 'water', text: { es: 'Agua que se retiró.', en: 'Water that receded.' } },
      {
        theme: 'water',
        text: {
          es: 'Viento que riza el agua: el oleaje devuelve más señal y es una falsa alarma frecuente.',
          en: 'Wind rippling the water: waves return more signal, and it is a frequent false alarm.',
        },
      },
      { theme: 'farm', text: { es: 'Un terreno liso que fue arado o sembrado.', en: 'Smooth ground that was plowed or sown.' } },
    ],
    polarization: {
      es: 'Se ve sobre todo en HH, que responde a la superficie.',
      en: 'It shows mostly in HH, which responds to the surface.',
    },
    check: {
      es: 'Es una pista, no una prueba. El viento se descarta mirando otra fecha cercana de la partitura; también sirve compararla con el agua de Sentinel-1 (en Contexto).',
      en: 'This is a clue, not proof. Wind is ruled out by looking at another nearby date on the score; it also helps to compare with the Sentinel-1 water layer (under Context).',
    },
  },
  veg_inundada: {
    signal: {
      es: 'El retorno HH sube y el HV casi no cambia.',
      en: 'The HH return rises and HV barely changes.',
    },
    mechanism: {
      es: 'Doble rebote: la onda rebota en el agua y luego en tallos o troncos, y regresa fuerte en HH. La banda L atraviesa el follaje, por eso NISAR puede ver agua bajo los árboles.',
      en: 'Double bounce: the wave bounces off the water and then off stems or trunks, and returns strongly in HH. L-band passes through foliage, which is why NISAR can see water under trees.',
    },
    mechanismOfFirst: true,
    causes: [
      { theme: 'water', text: { es: 'Vegetación con agua debajo.', en: 'Vegetation with water beneath it.' } },
      {
        theme: 'farm',
        text: {
          es: 'Suelo más húmedo tras lluvia o riego: el agua sube la constante dieléctrica del suelo.',
          en: 'Wetter soil after rain or irrigation: water raises the soil’s dielectric constant.',
        },
      },
      { theme: 'farm', text: { es: 'Surcos orientados hacia el radar.', en: 'Furrows aligned toward the radar.' } },
      { theme: 'other', text: { es: 'Construcciones nuevas.', en: 'New buildings.' } },
    ],
    polarization: {
      es: 'Lo revela HH; HV queda estable.',
      en: 'HH reveals it; HV stays steady.',
    },
    check: {
      es: 'Es una pista, no una prueba. Para comprobarla, mira si hubo lluvia o riego en otra fuente, compara con otra fecha de la partitura y revisa el punto con la lupa. El agua de Sentinel-1 (en Contexto) también marca vegetación inundada.',
      en: 'This is a clue, not proof. To check it, look for rain or irrigation in another source, compare with another date on the score and inspect the point with the magnifier. The Sentinel-1 water layer (under Context) also marks inundated vegetation.',
    },
  },
  veg_perdida: {
    signal: { es: 'El retorno HV cae.', en: 'The HV return drops.' },
    mechanism: {
      es: 'Hay menos ramas y hojas que dispersen la onda dentro de la vegetación.',
      en: 'There are fewer branches and leaves scattering the wave inside the vegetation.',
    },
    mechanismOfFirst: true,
    causes: [
      { theme: 'farm', text: { es: 'Cosecha, tala, quema o defoliación.', en: 'Harvest, logging, burning or defoliation.' } },
      { theme: 'other', text: { es: 'Sequía.', en: 'Drought.' } },
      {
        theme: 'snow',
        text: { es: 'En zonas frías, nieve húmeda que absorbe la señal.', en: 'In cold regions, wet snow that absorbs the signal.' },
      },
    ],
    polarization: {
      es: 'Lo revela HV, que responde al volumen de la vegetación.',
      en: 'HV reveals it, because it responds to the volume of the vegetation.',
    },
    check: {
      es: 'Es una pista, no una prueba. Para comprobarla, compárala con el mapa óptico del día si no hay nubes, con la cobertura del suelo (en Contexto) y con otra fecha de la partitura.',
      en: 'This is a clue, not proof. To check it, compare it with the daily optical map if there are no clouds, with land cover (under Context) and with another date on the score.',
    },
  },
  veg_aumento: {
    signal: { es: 'El retorno HV sube.', en: 'The HV return rises.' },
    mechanism: {
      es: 'Hay más volumen vegetal que dispersa la onda dentro de la vegetación.',
      en: 'There is more plant volume scattering the wave inside the vegetation.',
    },
    mechanismOfFirst: true,
    causes: [
      { theme: 'farm', text: { es: 'Cultivo que crece o rebrote.', en: 'A growing crop or regrowth.' } },
      { theme: 'other', text: { es: 'Una superficie que se volvió más rugosa.', en: 'A surface that became rougher.' } },
      { theme: 'snow', text: { es: 'Nieve que se secó o se recongeló.', en: 'Snow that dried out or refroze.' } },
    ],
    polarization: {
      es: 'Lo revela HV, que responde al volumen de la vegetación.',
      en: 'HV reveals it, because it responds to the volume of the vegetation.',
    },
    check: {
      es: 'Es una pista, no una prueba. Para comprobarla, compárala con la cobertura del suelo (en Contexto), con el mapa óptico del día y con otra fecha de la partitura.',
      en: 'This is a clue, not proof. To check it, compare it with land cover (under Context), the daily optical map and another date on the score.',
    },
  },
  aumento: {
    signal: {
      es: 'El retorno HH sube, pero sin encajar en las otras clases.',
      en: 'The HH return rises, but without fitting the other classes.',
    },
    mechanism: {
      es: 'Un cambio en la humedad del suelo o en la rugosidad de la superficie.',
      en: 'A change in soil moisture or in surface roughness.',
    },
    causes: [
      { theme: 'other', text: { es: 'Cambio de humedad del suelo.', en: 'A change in soil moisture.' } },
      { theme: 'other', text: { es: 'Cambio de rugosidad.', en: 'A change in roughness.' } },
    ],
    polarization: {
      es: 'Se ve en HH.',
      en: 'It shows in HH.',
    },
    check: {
      es: 'Es una pista, no una prueba. Para comprobarla, mira otra fecha de la partitura y abre la lupa para ver el cambio en dB calibrados.',
      en: 'This is a clue, not proof. To check it, look at another date on the score and open the magnifier to see the change in calibrated dB.',
    },
  },
  disminucion: {
    signal: {
      es: 'El retorno HH baja, pero sin encajar en las otras clases.',
      en: 'The HH return drops, but without fitting the other classes.',
    },
    mechanism: {
      es: 'Un cambio en la humedad del suelo o en la rugosidad de la superficie.',
      en: 'A change in soil moisture or in surface roughness.',
    },
    causes: [
      { theme: 'other', text: { es: 'Cambio de humedad del suelo.', en: 'A change in soil moisture.' } },
      { theme: 'other', text: { es: 'Cambio de rugosidad.', en: 'A change in roughness.' } },
    ],
    polarization: {
      es: 'Se ve en HH.',
      en: 'It shows in HH.',
    },
    check: {
      es: 'Es una pista, no una prueba. Para comprobarla, mira otra fecha de la partitura y abre la lupa para ver el cambio en dB calibrados.',
      en: 'This is a clue, not proof. To check it, look at another date on the score and open the magnifier to see the change in calibrated dB.',
    },
  },
};

export const HYPOTHESIS_KEYS = Object.keys(HYPOTHESES) as ClassKey[];

/** Orden estable: primero los temas que el lente prioriza; el resto conserva su orden. */
export function orderByLens<T extends { theme: Theme }>(items: T[], lens: string | undefined | null): T[] {
  const priority = PRIORITY[asLens(lens)];
  const rank = (theme: Theme) => {
    const index = priority.indexOf(theme);
    return index === -1 ? priority.length : index;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item.theme) - rank(b.item.theme) || a.index - b.index)
    .map((entry) => entry.item);
}

export function hypothesisFor(key: ClassKey, lens: string | undefined | null, lang: Lang): Hypothesis {
  const entry = HYPOTHESES[key];
  const ordered = orderByLens(entry.causes, lens);
  const first = entry.causes[0];
  // Si el lente saca de primer lugar a la causa que el mecanismo explica, el mecanismo la acompaña.
  const demoted = Boolean(entry.mechanismOfFirst) && ordered[0] !== first;
  const texts = ordered.map((cause) =>
    demoted && cause === first ? `${cause.text[lang]} ${entry.mechanism[lang]}` : cause.text[lang],
  );
  const [lead, ...others] = texts;
  return {
    signal: entry.signal[lang],
    mechanism: demoted ? null : entry.mechanism[lang],
    lead: lead ?? '',
    others,
    polarization: entry.polarization[lang],
    check: entry.check[lang],
  };
}

// ---------------------------------------------------------------------------------------------
// «Qué ve cada polarización»

const POLARIZATION = {
  hh: {
    es: 'HH: el radar emite y recibe en horizontal. Responde sobre todo a superficies y al doble rebote: agua, suelo y tallos sobre agua.',
    en: 'HH: the radar transmits and receives horizontally. It responds mostly to surfaces and to double bounce: water, soil and stems over water.',
  },
  hv: {
    es: 'HV: emite en horizontal y recibe en vertical. Aparece cuando la onda rebota muchas veces dentro de un volumen: vegetación y también nieve seca y firn (nieve vieja compactada).',
    en: 'HV: transmits horizontally and receives vertically. It appears when the wave bounces many times inside a volume: vegetation, and also dry snow and firn (old, compacted snow).',
  },
  notes: [
    {
      theme: 'farm' as Theme,
      text: {
        es: 'Sobre tierra, HV separa mejor los cambios de vegetación.',
        en: 'Over land, HV separates vegetation changes better.',
      },
    },
    {
      theme: 'water' as Theme,
      text: {
        es: 'Sobre agua y suelo desnudo, HH separa mejor.',
        en: 'Over water and bare soil, HH separates them better.',
      },
    },
    {
      theme: 'snow' as Theme,
      text: {
        es: 'Sobre hielo, HH delata el agua líquida en la nieve y HV, su estructura interna.',
        en: 'Over ice, HH reveals liquid water in the snow and HV its internal structure.',
      },
    },
  ],
};

export interface PolarizationGuide {
  hh: string;
  hv: string;
  notes: string[];
}

export function polarizationGuide(lens: string | undefined | null, lang: Lang): PolarizationGuide {
  return {
    hh: POLARIZATION.hh[lang],
    hv: POLARIZATION.hv[lang],
    notes: orderByLens(POLARIZATION.notes, lens).map((note) => note.text[lang]),
  };
}
