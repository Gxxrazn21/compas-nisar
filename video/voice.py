"""Narración del corte de 30 s: una voz sintética dice en inglés los rótulos del video.

La voz se genera en este equipo con Kokoro (modelo ONNX de texto a voz); no se envía nada a servicios
externos. Es audio generado por IA: hay que declararlo en el envío y en la descripción del video.

Cada frase empieza con su escena (los tiempos se leen de composition/script.demo30.js). Si una frase no
cabe en su escena, se vuelve a sintetizar más rápido, hasta VELOCIDAD_MAX.

Preparación, una sola vez:
    python -m venv video/out/tts/venv
    video/out/tts/venv/Scripts/python -m pip install kokoro-onnx soundfile
    Descargar en video/out/tts/models/ los archivos kokoro-v1.0.onnx y voices-v1.0.bin de
    https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Uso:  video/out/tts/venv/Scripts/python -X utf8 video/voice.py
      → video/out/voice-demo30.wav (solo voz) y video/out/audio-demo30.wav (voz sobre la música)
      La música debe existir antes: python video/music.py script.demo30.js music-demo30.wav
"""
import re
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / 'out'
MODELOS = SALIDA / 'tts' / 'models'
GUION = (AQUI / 'composition' / 'script.demo30.js').read_text(encoding='utf-8')

VOZ = 'af_heart'
VELOCIDAD = 1.27         # ritmo base de la lectura
VELOCIDAD_MAX = 1.45     # tope al apretar una frase que no cabe
ENTRADA = 0.08           # la voz empieza un instante después del corte
RESPIRO = 0.06           # silencio mínimo antes de la escena siguiente
PAUSA_FRASE = 0.14       # entre oraciones de una misma línea
PAUSA_COMA = 0.06
NIVEL_MUSICA = 0.3       # la música baja para que la voz quede encima

# Lo que se dice en cada escena. Es el texto de los rótulos, escrito como suena: «Sareetmo» (SARitmo),
# «Nysar» (NISAR se pronuncia «náisar»), «Sars» (SARs) y las unidades y cifras con todas sus letras.
LINEAS = [
    ('intro', 'Sareetmo. Every twelve days, a radar listens to how the Earth changes.'),
    ('concept', 'Each pass is a note. Join two notes to see what changed.'),
    ('cover', 'Pick a story. The globe flies there.'),
    ('curtain', 'Two radar passes, four months apart.'),
    ('change', 'Changes in square kilometers, each labelled possible.'),
    ('probe', 'Click a point. Read the radar.'),
    ('dance', 'Every pass plays. The score keeps the beat.'),
    ('explore', 'Search any city for Nysar passes.'),
    ('satellite', 'Follow the satellite live, in 3D.'),
    ('tour', 'A guided tour explains the radar.'),
    ('montage', 'Four stories with real Nysar data. Explore yours.'),
    ('outro', 'Sareetmo. Dancing with the Sars. NASA Space Apps Challenge.'),
]
# Ajustes de fonemas que la escritura no logra: la «a» abierta de SAR.
FONEMAS = {'sæɹˈiːtmoʊ': 'sɑːɹˈiːtmoʊ'}


def numero(patron):
    return float(re.search(patron, GUION).group(1))


def entradas():
    """Segundo en que empieza cada escena, por nombre."""
    inicio = {
        'intro': numero(r'intro:\s*\{\s*start:\s*([\d.]+)'),
        'concept': numero(r'conceptAt:\s*([\d.]+)'),
        'montage': numero(r'montage:\s*\{\s*start:\s*([\d.]+)'),
        'outro': numero(r'outro:\s*\{\s*start:\s*([\d.]+)'),
    }
    for nombre, segundo in re.findall(r"id:\s*'(\w+)',\s*start:\s*([\d.]+)", GUION):
        inicio[nombre] = float(segundo)
    return inicio


def recortar(audio, tasa, umbral=0.012, margen=0.02):
    """Quita el silencio de los extremos y suaviza la entrada y la salida."""
    fuerte = np.flatnonzero(np.abs(audio) > umbral)
    if not len(fuerte):
        return audio
    pad = int(margen * tasa)
    audio = audio[max(0, fuerte[0] - pad):fuerte[-1] + pad].copy()
    rampa = int(0.008 * tasa)
    audio[:rampa] *= np.linspace(0, 1, rampa)
    audio[-rampa:] *= np.linspace(1, 0, rampa)
    return audio


def main():
    duracion = numero(r'duration:\s*([\d.]+)')
    inicio = entradas()
    orden = sorted(inicio.values()) + [duracion]
    kokoro = Kokoro(str(MODELOS / 'kokoro-v1.0.onnx'), str(MODELOS / 'voices-v1.0.bin'))

    def decir(texto, velocidad):
        fonemas = kokoro.tokenizer.phonemize(texto, 'en-us')
        for de, a in FONEMAS.items():
            fonemas = fonemas.replace(de, a)
        audio, tasa = kokoro.create(fonemas, voice=VOZ, speed=velocidad, is_phonemes=True,
                                    sentence_pause=PAUSA_FRASE, clause_pause=PAUSA_COMA)
        return recortar(audio, tasa), tasa

    pista = None
    tasa = 24000
    print(f'{"escena":10s} {"entra":>6s} {"cabe":>5s} {"dura":>5s} {"vel":>5s}')
    for nombre, texto in LINEAS:
        entra = inicio[nombre] + ENTRADA
        cabe = orden[orden.index(inicio[nombre]) + 1] - entra - RESPIRO
        velocidad = VELOCIDAD
        audio, tasa = decir(texto, velocidad)
        if len(audio) / tasa > cabe:
            velocidad = min(VELOCIDAD_MAX, velocidad * (len(audio) / tasa) / cabe * 1.02)
            audio, tasa = decir(texto, velocidad)
        if pista is None:
            pista = np.zeros(int(duracion * tasa), dtype=np.float32)
        dura = len(audio) / tasa
        aviso = '  ← no cabe' if dura > cabe + 0.01 else ''
        print(f'{nombre:10s} {entra:6.2f} {cabe:5.2f} {dura:5.2f} {velocidad:5.2f}{aviso}')
        desde = int(entra * tasa)
        hasta = min(len(pista), desde + len(audio))
        pista[desde:hasta] += audio[:hasta - desde]

    pista *= 0.9 / np.abs(pista).max()
    voz = SALIDA / 'voice-demo30.wav'
    sf.write(voz, pista, tasa)

    musica = SALIDA / 'music-demo30.wav'
    mezcla = SALIDA / 'audio-demo30.wav'
    filtro = (f'[0:a]volume={NIVEL_MUSICA}[m];'
              '[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0[v];'
              '[m][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(musica), '-i', str(voz),
                    '-filter_complex', filtro, '-map', '[a]', str(mezcla)], check=True)
    print(f'{voz}\n{mezcla}')


if __name__ == '__main__':
    main()
