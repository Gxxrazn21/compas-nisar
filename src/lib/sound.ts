// Sonido de la partitura: cada nota suena a la altura a la que está dibujada.
// Web Audio, sin archivos: un timbre de pulsación suave (triángulo más su octava) que se apaga solo.

interface AudioWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

let context: AudioContext | null = null;
let master: GainNode | null = null;

function ensureContext(): AudioContext | null {
  if (context) return context;
  if (typeof window === 'undefined') return null;
  const Constructor = (window as AudioWindow).AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Constructor) return null;
  try {
    context = new Constructor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
  } catch {
    context = null;
  }
  return context;
}

/**
 * Los navegadores solo dejan sonar tras un gesto de la persona: se llama desde un clic o una tecla
 * para que las notas que lleguen después (la danza carga durante varios segundos) ya puedan sonar.
 */
export function unlockSound() {
  const audio = ensureContext();
  if (audio && audio.state === 'suspended') void audio.resume().catch(() => undefined);
}

export interface NoteOptions {
  /** Nota apagada y breve: una pasada que no se puede analizar o elegir. */
  muted?: boolean;
  /** Segundos de espera antes de sonar (para encadenar dos notas). */
  delay?: number;
}

/** Hace sonar una nota de la frecuencia dada. Sin Web Audio, o aún bloqueado, no hace nada. */
export function playNote(frequency: number, options: NoteOptions = {}) {
  const audio = ensureContext();
  if (!audio || !master || !Number.isFinite(frequency) || frequency <= 0) return;
  if (audio.state === 'suspended') {
    void audio.resume().catch(() => undefined);
    if (audio.state === 'suspended') return;
  }
  const start = audio.currentTime + (options.delay ?? 0);
  const length = options.muted ? 0.22 : 0.85;
  const peak = options.muted ? 0.16 : 0.42;

  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);

  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = options.muted ? 900 : 2600;
  filter.connect(envelope);
  envelope.connect(master);

  const voices: Array<[OscillatorType, number, number]> = [
    ['triangle', 1, 1],
    ['sine', 2, options.muted ? 0 : 0.22],
  ];
  for (const [type, ratio, level] of voices) {
    if (!level) continue;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency * ratio;
    gain.gain.value = level;
    oscillator.connect(gain);
    gain.connect(filter);
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
  }
}
