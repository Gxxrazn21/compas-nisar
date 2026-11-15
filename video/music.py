"""Pista de fondo del video: una base suave generada por síntesis, sin muestras ni material de terceros.

Un acorde sostenido cada ocho segundos, un pulso cada dos (el compás del video) y una nota más
aguda al empezar cada escena. Los tiempos de las escenas se leen de composition/script.js.

Uso:  python video/music.py                                   → video/out/music.wav
      python video/music.py script.demo30.js music-demo30.wav → pista del corte de 30 s
"""
import re
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

AQUI = Path(__file__).resolve().parent
SR = 44100
ARCHIVO_GUION = sys.argv[1] if len(sys.argv) > 1 else 'script.js'
ARCHIVO_SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'music.wav'
GUION = (AQUI / 'composition' / ARCHIVO_GUION).read_text(encoding='utf-8')
DURACION = float(re.search(r'duration:\s*([\d.]+)', GUION).group(1))
ESCENAS = sorted({float(x) for x in re.findall(r'(?:start|conceptAt):\s*([\d.]+)', GUION)})

N = int(SR * DURACION)
t = np.arange(N) / SR


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# La menor, fa mayor, do mayor, sol: cada acorde con su bajo y cuatro voces.
ACORDES = [
    (33, [57, 60, 64, 71]),   # Am(add9)
    (29, [53, 60, 64, 69]),   # Fmaj7
    (36, [55, 60, 64, 74]),   # Cmaj9
    (31, [55, 59, 62, 69]),   # G(add9)
]
COMPAS = 8.0      # segundos por acorde
PULSO = 2.0       # segundos por pulso


def ventana(inicio, ataque, sostenido, caida):
    """Envolvente suave (coseno) que empieza en `inicio`."""
    x = t - inicio
    env = np.zeros(N)
    sube = (x >= 0) & (x < ataque)
    env[sube] = 0.5 - 0.5 * np.cos(np.pi * x[sube] / ataque)
    env[(x >= ataque) & (x < ataque + sostenido)] = 1.0
    baja = (x >= ataque + sostenido) & (x < ataque + sostenido + caida)
    env[baja] = 0.5 + 0.5 * np.cos(np.pi * (x[baja] - ataque - sostenido) / caida)
    return env


def nota_pulsada(inicio, midi, nivel, caida=1.4):
    """Nota corta de timbre redondo: fundamental más dos armónicos que se apagan antes."""
    onda = np.zeros(N)
    desde = int(inicio * SR)
    hasta = min(N, desde + int(caida * 7 * SR))
    xa = np.arange(hasta - desde) / SR
    f = hz(midi)
    ataque = np.minimum(1.0, xa / 0.006)
    onda[desde:hasta] = ataque * (
        np.sin(2 * np.pi * f * xa) * np.exp(-xa / caida)
        + 0.28 * np.sin(2 * np.pi * 2 * f * xa) * np.exp(-xa / (caida * 0.45))
        + 0.10 * np.sin(2 * np.pi * 4 * f * xa) * np.exp(-xa / (caida * 0.2))
    )
    return nivel * onda


izq = np.zeros(N)
der = np.zeros(N)

# Base: voces dobladas y apenas desafinadas, una a cada lado.
for i in range(int(np.ceil(DURACION / COMPAS)) + 1):
    bajo, voces = ACORDES[i % len(ACORDES)]
    env = ventana(i * COMPAS - 1.6, 3.2, COMPAS - 3.2, 3.2)
    if not env.any():
        continue
    vibra = 1 + 0.06 * np.sin(2 * np.pi * 0.13 * t + i)
    for j, midi in enumerate(voces):
        f = hz(midi)
        nivel = 0.085 / (1 + 0.25 * j)
        izq += env * vibra * nivel * (np.sin(2 * np.pi * f * 0.9985 * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t))
        der += env * vibra * nivel * (np.sin(2 * np.pi * f * 1.0015 * t + 0.7) + 0.18 * np.sin(2 * np.pi * 2 * f * t + 0.3))
    grave = env * 0.16 * np.sin(2 * np.pi * hz(bajo) * t)
    izq += grave
    der += grave

# Pulso: una nota del acorde cada dos segundos, alternando de lado.
PATRON = [0, 2, 1, 3, 2, 1, 3, 0]
for k in range(int(DURACION / PULSO)):
    inicio = 3.0 + k * PULSO          # empieza cuando aparece la primera nota del pentagrama
    if inicio > DURACION - 5:
        break
    _, voces = ACORDES[int(inicio // COMPAS) % len(ACORDES)]
    midi = voces[PATRON[k % len(PATRON)]] + 12
    onda = nota_pulsada(inicio, midi, 0.11)
    lado = 0.62 if k % 2 else 0.38
    izq += onda * (1 - lado) * 2
    der += onda * lado * 2

# Acento al empezar cada escena.
for inicio in ESCENAS:
    if inicio <= 0 or inicio > DURACION - 3:
        continue
    _, voces = ACORDES[int(inicio // COMPAS) % len(ACORDES)]
    onda = nota_pulsada(inicio, voces[0] + 24, 0.13, caida=2.2) + nota_pulsada(inicio + 0.09, voces[2] + 24, 0.08, caida=2.2)
    izq += onda
    der += onda


def eco(x):
    """Reverberación sencilla: cuatro ecos realimentados (calculados por bloques) y filtrados."""
    salida = np.zeros_like(x)
    for retardo, ganancia in ((0.137, 0.42), (0.211, 0.38), (0.293, 0.34), (0.379, 0.30)):
        d = int(retardo * SR)
        y = np.zeros_like(x)
        for inicio in range(d, len(x), d):          # y[n] = x[n - d] + ganancia * y[n - d]
            fin = min(inicio + d, len(x))
            largo = fin - inicio
            y[inicio:fin] = x[inicio - d:inicio - d + largo] + ganancia * y[inicio - d:inicio - d + largo]
        salida += y
    b, a = butter(2, 3200 / (SR / 2))
    return lfilter(b, a, salida) * 0.25


izq, der = izq + eco(der) * 0.9, der + eco(izq) * 0.9
b, a = butter(2, 7000 / (SR / 2))
izq, der = lfilter(b, a, izq), lfilter(b, a, der)

# Entrada y salida, y nivel final moderado para que una voz en off quepa encima.
general = np.minimum(1.0, t / 1.5) * np.clip((DURACION - 0.3 - t) / 3.5, 0, 1)
mezcla = np.stack([izq, der], axis=1) * general[:, None]
mezcla *= 0.5 / np.abs(mezcla).max()

salida = AQUI / 'out' / ARCHIVO_SALIDA
salida.parent.mkdir(exist_ok=True)
wavfile.write(salida, SR, (mezcla * 32767).astype(np.int16))
print(f'{salida}  {DURACION:.0f} s, {len(ESCENAS)} escenas')
