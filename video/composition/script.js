// Guion del video: tiempos de cada escena y textos en inglés y español.
// Los tiempos van en segundos. `cam` son puntos [t, cx, cy, escala] en
// coordenadas de la toma (1600 x 900); `mark` resalta una zona: [desde, hasta, x, y, ancho, alto].
window.SCRIPT = {
  fps: 30,
  duration: 92,
  intro: { start: 0, end: 13.5, conceptAt: 6.5 },
  app: { start: 13.5, end: 70.5 },
  montage: { start: 70.5, end: 79 },
  honesty: { start: 79, end: 86 },
  outro: { start: 86, end: 92 },

  shots: [
    {
      id: 'cover', start: 13.5, end: 22.5,
      cam: [[0, 800, 450, 1]],
      mark: [1.3, 3.2, 30, 488, 500, 96],
      en: ['Stories', 'Pick a story and the globe flies to the place.'],
      es: ['Historias', 'Elige una historia y el globo vuela hasta el lugar.'],
    },
    {
      id: 'curtain', start: 22.5, end: 31,
      cam: [[0, 800, 450, 1], [1.4, 824, 340, 2], [7.3, 824, 340, 2], [8.5, 800, 450, 1.15]],
      en: ['Curtain', 'Two radar passes, four months apart. Drag to compare them.'],
      es: ['Cortina', 'Dos pasadas, cuatro meses entre ellas. Arrastra para compararlas.'],
    },
    {
      id: 'change', start: 31, end: 39.5,
      cam: [[0, 800, 450, 1], [3.6, 800, 450, 1], [5, 1330, 380, 1.55], [8.5, 1330, 400, 1.6]],
      mark: [5.2, 8.2, 1226, 338, 352, 272],
      en: ['Reading', 'The change map, measured in km². Every class is labelled “possible”.'],
      es: ['Lectura', 'El mapa de cambio, medido en km². Cada clase se rotula como «posible».'],
    },
    {
      id: 'dance', start: 39.5, end: 49,
      cam: [[0, 800, 450, 1]],
      mark: [3.2, 7.4, 14, 672, 1572, 200],
      en: ['The dance', 'Every pass plays in order while the score keeps the beat.'],
      es: ['La danza', 'Todas las pasadas, en orden, mientras la partitura marca el ritmo.'],
    },
    {
      id: 'probe', start: 49, end: 56,
      cam: [[0, 800, 450, 1], [1.2, 800, 450, 1], [2.6, 1130, 370, 1.5], [7, 1150, 370, 1.55]],
      mark: [3, 6.6, 1226, 176, 352, 190],
      en: ['Point probe', 'Click any point to read what the radar measured there.'],
      es: ['Sonda', 'Un clic en cualquier punto muestra lo que midió el radar ahí.'],
    },
    {
      id: 'explore', start: 56, end: 65,
      cam: [[0, 533, 300, 1.5], [3.3, 533, 300, 1.5], [4.8, 800, 450, 1]],
      en: ['Explore', 'Search any city. SARitmo lists the NISAR passes that cover it.'],
      es: ['Explorar', 'Busca una ciudad. SARitmo lista las pasadas de NISAR que la cubren.'],
    },
    {
      id: 'live', start: 65, end: 70.5,
      cam: [[0, 800, 450, 1]],
      en: ['Live', 'Recent natural events from NASA, one click from the radar passes.'],
      es: ['En vivo', 'Eventos naturales de NASA, a un clic de las pasadas del radar.'],
    },
  ],

  text: {
    en: {
      tagline: 'Every 12 days, a radar listens to how the Earth changes',
      conceptH: 'NISAR passes over the same place every 12 days.',
      conceptP: 'Each pass is a note. Join two notes and you see what changed between them.',
      before: 'before', after: 'after', days: '12 days',
      montageH: 'Four stories, all told with real data',
      cards: [
        ['mojana', 'The wetlands breathe', 'La Mojana, Colombia'],
        ['sanjoaquin', 'The checkerboard of crops', 'San Joaquin Valley, United States'],
        ['vatnajokull', 'The glacier gets wet', 'Vatnajökull, Iceland'],
        ['kilauea', 'Fringes over the volcano', 'Island of Hawaii, United States'],
      ],
      honestyH: 'Evidence before conclusions',
      honesty: [
        'Only real NISAR data, from NASA and ISRO. Nothing synthetic.',
        'The source and the limits of every result are one click away.',
        'Open source, in English and Spanish.',
      ],
      outroA: 'Dancing with the SARs',
      outroB: 'NASA Space Apps Challenge 2026',
    },
    es: {
      tagline: 'Cada 12 días, un radar escucha cómo cambia la Tierra',
      conceptH: 'NISAR pasa sobre el mismo lugar cada 12 días.',
      conceptP: 'Cada pasada es una nota. Une dos notas y verás qué cambió entre ellas.',
      before: 'antes', after: 'después', days: '12 días',
      montageH: 'Cuatro historias, todas contadas con datos reales',
      cards: [
        ['mojana', 'Las ciénagas respiran', 'La Mojana, Colombia'],
        ['sanjoaquin', 'El tablero de los cultivos', 'Valle de San Joaquín, Estados Unidos'],
        ['vatnajokull', 'El glaciar se moja', 'Vatnajökull, Islandia'],
        ['kilauea', 'Franjas sobre el volcán', 'Isla de Hawái, Estados Unidos'],
      ],
      honestyH: 'Evidencia antes que conclusiones',
      honesty: [
        'Solo datos reales de NISAR, de NASA e ISRO. Nada sintético.',
        'La fuente y los límites de cada resultado están a un clic.',
        'Código abierto, en inglés y español.',
      ],
      outroA: 'Dancing with the SARs',
      outroB: 'NASA Space Apps Challenge 2026',
    },
  },
};
