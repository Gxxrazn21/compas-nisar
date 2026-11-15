// Guion del demo de 30 segundos para el envío a NASA Space Apps (límite: 30 s, todo en inglés).
// Reemplaza al guion completo cuando la composición se abre con ?cut=demo30.
// Mismas convenciones que script.js; `clip` es el tramo [desde, hasta] de la toma grabada, en segundos,
// y `pace` acelera la coreografía de una escena para que quepa en menos tiempo.
// Corte rápido: ocho tomas de la aplicación a entre 2 y 3 veces su velocidad.
// La duración de cada escena sigue a la narración (video/voice.py), que dice estos mismos rótulos:
// si cambia un texto aquí, hay que cambiarlo también allá y revisar que la frase quepa en su escena.
window.SCRIPT = {
  fps: 30,
  duration: 29.5,
  brand: 'SARitmo',
  intro: { start: 0, end: 6.9, conceptAt: 4, pace: 1.7 },
  app: { start: 6.9, end: 23.5, pace: 2.5 },
  montage: { start: 23.5, end: 26.45, pace: 1.5 },
  honesty: { start: 26.45, end: 26.45 },
  outro: { start: 26.45, end: 29.5, pace: 1.6, fade: 0 },

  shots: [
    {
      id: 'cover', start: 6.9, end: 8.9, clip: [1.8, 6.2],
      cam: [[0, 800, 450, 1]],
      mark: [0.1, 0.5, 30, 728, 500, 66],
      en: ['Stories', 'Pick a story. The globe flies there.'],
    },
    {
      id: 'curtain', start: 8.9, end: 11, clip: [1.2, 6.4],
      cam: [[0, 800, 450, 1], [0.4, 824, 320, 1.8], [1.8, 824, 320, 1.8], [2.1, 810, 400, 1.5]],
      en: ['Curtain', 'Two radar passes, four months apart.'],
    },
    {
      id: 'change', start: 11, end: 13.9, clip: [1.2, 7.6],
      cam: [[0, 800, 450, 1], [0.7, 800, 450, 1], [1.4, 1330, 400, 1.55], [2.9, 1330, 410, 1.6]],
      mark: [1.6, 2.75, 1232, 440, 352, 142],
      en: ['Reading', 'Changes in km², each labelled “possible”.'],
    },
    {
      id: 'probe', start: 13.9, end: 15.6, clip: [1.2, 4.6],
      cam: [[0, 800, 450, 1], [0.45, 800, 450, 1], [0.95, 1200, 330, 1.45], [1.7, 1200, 330, 1.5]],
      mark: [1, 1.6, 1236, 178, 348, 176],
      en: ['Point probe', 'Click a point. Read the radar.'],
    },
    {
      id: 'dance', start: 15.6, end: 18, clip: [1.3, 7.3],
      cam: [[0, 800, 450, 1]],
      mark: [0.4, 1.9, 16, 652, 1568, 214],
      en: ['The dance', 'Every pass plays. The score keeps the beat.'],
    },
    {
      // La lista de pasadas aparece en el segundo 6,1 de la toma; a 3,2x queda en pantalla al final.
      id: 'explore', start: 18, end: 19.8, clip: [2.6, 7.2], speed: 3.2,
      cam: [[0, 533, 300, 1.5], [0.45, 533, 300, 1.5], [0.95, 600, 346, 1.3]],
      mark: [1.15, 1.7, 36, 578, 340, 62],
      en: ['Explore', 'Search any city for NISAR passes.'],
    },
    {
      id: 'satellite', start: 19.8, end: 21.7, clip: [1.2, 6.2],
      cam: [[0, 800, 450, 1], [0.6, 800, 450, 1], [1.3, 727, 440, 1.1]],
      en: ['NISAR now', 'Follow the satellite live, in 3D.'],
    },
    {
      id: 'tour', start: 21.7, end: 23.5, clip: [2.2, 6.4],
      cam: [[0, 800, 450, 1], [0.4, 996, 312, 1.7], [1.8, 996, 312, 1.75]],
      en: ['Tour', 'A guided tour explains the radar.'],
    },
  ],

  text: {
    en: {
      eyebrow: 'Team SARitmo · Dancing with the SARs · NASA Space Apps 2026',
      tagline: 'Every 12 days, a radar listens to how the Earth changes',
      conceptH: 'Each pass is a note. Join two notes to see what changed.',
      conceptP: '',
      before: 'before', after: 'after', days: '12 days',
      montageH: 'Four stories with real NISAR data. Explore yours.',
      cards: [
        ['mojana', 'The wetlands breathe', 'La Mojana, Colombia'],
        ['sanjoaquin', 'The checkerboard of crops', 'San Joaquin Valley, United States'],
        ['vatnajokull', 'The glacier gets wet', 'Vatnajökull, Iceland'],
        ['kilauea', 'Fringes over the volcano', 'Island of Hawaii, United States'],
      ],
      honestyH: '',
      honesty: [],
      outroA: 'Dancing with the SARs',
      outroB: 'NASA Space Apps Challenge 2026',
      outroTeam: '',
      // La organización pide declarar el audio generado con IA.
      outroNote: 'Voice-over: AI text-to-speech',
    },
  },
};
