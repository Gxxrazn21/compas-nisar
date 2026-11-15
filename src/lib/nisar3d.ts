// NISAR en 3D, construido pieza por pieza sobre las vistas frontal y lateral que publica NASA/JPL
// (dominio público) y con las medidas publicadas; un metro es una unidad. La disposición es la del
// satélite real: el bus de ISRO envuelto en manta dorada; a su lado, acostada, la estructura del
// radar (un prisma de ocho caras) con los alimentadores de banda L y S mirando hacia arriba; el
// brazo de 9 m, que sube inclinado desde la unión y sostiene por el borde el reflector de malla de
// 12 m; dos alas solares de tres paneles a los costados del bus y la antena de datos por debajo.
// Lo que no está publicado (soportes, cajas, el ancho exacto del bus) es aproximado.
//
// Este módulo trae three.js: se carga aparte, solo cuando hace falta (ver Nisar3D.tsx y satellite.ts).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PARTS, SIZE } from './nisarModel';
import type { Part } from './nisarModel';

// --- Geometría (metros). Origen: el centro del bus. x: a lo largo de las alas solares;
// y: hacia el reflector (el lado contrario a la Tierra); z: hacia donde se alarga el radar. ---
const BUS = { x: 1.9, y: 2.0, z: 2.0 };
/** Estructura del radar: prisma de ocho caras con el eje en z, pegado al bus. Bus más radar: 5,5 m. */
const RIS = { radius: 0.86, length: SIZE.body - BUS.z, y: 0.18 };
const RIS_Z0 = BUS.z / 2;
const PANEL = { length: SIZE.solarLength / 3, width: SIZE.solarWidth, gap: 0.04, yoke: 0.7 };
const DISH = {
  center: new THREE.Vector3(0, 10.0, 4.1),
  radius: SIZE.reflector / 2,
  /** Tramos del aro: 30 tramos de 4 barras más 3 de refuerzo dan las 123 barras del reflector real. */
  bays: 30,
  depth: 1.75,
  sag: 0.9,
  /** El plato sube unos 6,5° hacia el lado del radar: así el haz baja a unos 37° de la vertical. */
  tilt: -0.1134,
};
/** Brazo: raíz sobre la unión del bus con el radar, codo, y punta en el borde del reflector. */
const BOOM: THREE.Vector3[] = [
  new THREE.Vector3(0, BUS.y / 2 + 0.28, 0.45),
  new THREE.Vector3(0, 5.2, -1.74),
  new THREE.Vector3(0, 10.15, -2.08),
];

type Fading = { material: THREE.Material & { opacity: number }; base: number };

/** Textura dibujada en un lienzo: evita descargar imágenes. */
function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void, color = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Generador con semilla: el arrugado de la manta sale igual en cada carga. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Relieve de manta térmica arrugada (MLI). */
function foilTexture() {
  const random = seeded(7);
  return canvasTexture(
    256,
    256,
    (context) => {
      context.fillStyle = '#808080';
      context.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 520; i += 1) {
        const x = random() * 256;
        const y = random() * 256;
        const size = 6 + random() * 30;
        const tone = Math.round(70 + random() * 120);
        context.fillStyle = `rgba(${tone},${tone},${tone},0.5)`;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + size * (random() - 0.3), y + size * random());
        context.lineTo(x - size * random(), y + size * (random() - 0.2));
        context.closePath();
        context.fill();
      }
    },
    false,
  );
}

/** Celdas solares: una cuadrícula azul con sus hilos plateados. */
function cellTexture() {
  return canvasTexture(256, 256, (context) => {
    context.fillStyle = '#0a1226';
    context.fillRect(0, 0, 256, 256);
    const columns = 6;
    const rows = 8;
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const x = (column * 256) / columns + 2;
        const y = (row * 256) / rows + 2;
        const gradient = context.createLinearGradient(x, y, x + 40, y + 30);
        gradient.addColorStop(0, '#1c3f7a');
        gradient.addColorStop(1, '#10254d');
        context.fillStyle = gradient;
        context.fillRect(x, y, 256 / columns - 4, 256 / rows - 4);
        context.strokeStyle = 'rgba(190,205,225,0.35)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x + (256 / columns - 4) / 2, y);
        context.lineTo(x + (256 / columns - 4) / 2, y + 256 / rows - 4);
        context.stroke();
      }
    }
  });
}

/** Malla del reflector: los hilos tapan y los huecos dejan pasar la luz. */
function meshAlphaTexture() {
  const texture = canvasTexture(
    32,
    32,
    (context) => {
      context.fillStyle = 'rgb(105,105,105)';
      context.fillRect(0, 0, 32, 32);
      context.strokeStyle = '#ffffff';
      context.lineWidth = 5;
      context.strokeRect(0, 0, 32, 32);
    },
    false,
  );
  texture.repeat.set(46, 46);
  return texture;
}

/** Fila doble de parches de un alimentador (12 por fila en banda L, 24 en banda S). */
function patchTexture(columns: number, base: string, patch: string) {
  const texture = canvasTexture(columns * 32, 64, (context) => {
    context.fillStyle = base;
    context.fillRect(0, 0, columns * 32, 64);
    context.fillStyle = patch;
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < 2; row += 1) context.fillRect(column * 32 + 5, row * 32 + 5, 22, 22);
    }
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export interface NisarModel {
  root: THREE.Group;
  parts: Record<Part, THREE.Group>;
  /** Cotas y persona de referencia: solo se ven en la vista de medidas. */
  dimensions: THREE.Group;
  /** Punto donde se ancla el rótulo de cada cota. */
  anchors: Record<DimensionId, THREE.Vector3>;
  /** Apaga (0) o enciende (1) una parte, para resaltar las demás. */
  setFade: (part: Part, value: number) => void;
  dispose: () => void;
}

export type DimensionId = 'reflector' | 'boom' | 'body' | 'solar' | 'person';

export function buildNisar(): NisarModel {
  const disposables: Array<{ dispose: () => void }> = [];
  const fading: Record<Part, Fading[]> = { reflector: [], boom: [], radar: [], solar: [], bus: [], antenna: [] };
  const keep = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const foil = keep(foilTexture());
  const material = (part: Part, parameters: THREE.MeshStandardMaterialParameters) => {
    const created = keep(new THREE.MeshStandardMaterial(parameters));
    fading[part].push({ material: created, base: created.opacity });
    return created;
  };
  const lineMaterial = (part: Part, color: number, opacity: number) => {
    const created = keep(new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    fading[part].push({ material: created, base: opacity });
    return created;
  };
  const geometry = <T extends THREE.BufferGeometry>(item: T): T => keep(item);

  const root = new THREE.Group();
  const parts = Object.fromEntries(PARTS.map((part) => [part, new THREE.Group()])) as Record<Part, THREE.Group>;
  for (const part of PARTS) {
    parts[part].name = part;
    root.add(parts[part]);
  }

  const unitCylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 10));
  const up = new THREE.Vector3(0, 1, 0);
  /** Matriz de una barra de radio `radius` entre dos puntos. */
  const strutMatrix = (a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
    const direction = b.clone().sub(a);
    const length = direction.length();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
    return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), quaternion, new THREE.Vector3(radius, length, radius));
  };
  const strut = (group: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(unitCylinder, mat);
    mesh.applyMatrix4(strutMatrix(a, b, radius));
    group.add(mesh);
    return mesh;
  };
  const box = (group: THREE.Object3D, size: [number, number, number], position: [number, number, number], mat: THREE.Material) => {
    const mesh = new THREE.Mesh(geometry(new THREE.BoxGeometry(...size)), mat);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  // --- Bus de ISRO: caja envuelta en manta dorada ---
  {
    const group = parts.bus;
    const gold = material('bus', { color: 0xc9952c, metalness: 1, roughness: 0.36, bumpMap: foil, bumpScale: 1.4 });
    const silver = material('bus', { color: 0xc9ced6, metalness: 0.9, roughness: 0.42, side: THREE.DoubleSide });
    const dark = material('bus', { color: 0x15181d, metalness: 0.4, roughness: 0.6 });
    box(group, [BUS.x, BUS.y, BUS.z], [0, 0, 0], gold);
    // Radiadores plateados en las caras libres.
    box(group, [BUS.x * 0.62, BUS.y * 0.5, 0.04], [0, -0.15, -BUS.z / 2 - 0.02], silver);
    box(group, [0.04, BUS.y * 0.34, BUS.z * 0.5], [BUS.x / 2 + 0.02, -0.5, -0.2], silver);
    box(group, [0.04, BUS.y * 0.34, BUS.z * 0.5], [-BUS.x / 2 - 0.02, -0.5, -0.2], silver);
    // Anillo con el que se unió al cohete, en la cara de abajo.
    const ring = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.6, 0.6, 0.14, 32, 1, true)), silver);
    ring.position.set(0, -BUS.y / 2 - 0.07, 0.1);
    group.add(ring);
    // Propulsores en las esquinas de abajo.
    const nozzle = geometry(new THREE.ConeGeometry(0.07, 0.16, 12, 1, true));
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const thruster = new THREE.Mesh(nozzle, dark);
      thruster.position.set(x * (BUS.x / 2 - 0.12), -BUS.y / 2 - 0.08, z * (BUS.z / 2 - 0.12));
      group.add(thruster);
    }
    // Sensores de estrellas: dos tubos dorados sobre el bus que miran al cielo en diagonal.
    for (const side of [-1, 1]) {
      const tracker = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.11, 0.08, 0.36, 14)), gold);
      tracker.position.set(side * 0.5, BUS.y / 2 + 0.2, -0.45);
      tracker.rotation.set(-0.7, 0, -side * 0.5);
      group.add(tracker);
      const lens = new THREE.Mesh(geometry(new THREE.CircleGeometry(0.09, 14)), dark);
      lens.position.copy(tracker.position).add(new THREE.Vector3(side * 0.085, 0.14, -0.115));
      lens.rotation.copy(tracker.rotation);
      lens.rotateX(-Math.PI / 2);
      group.add(lens);
    }
  }

  // --- Antena de datos de banda Ka, colgada bajo el bus y mirando a la Tierra ---
  {
    const group = parts.antenna;
    const white = material('antenna', { color: 0xe9eaec, metalness: 0.25, roughness: 0.5, side: THREE.DoubleSide });
    const dark = material('antenna', { color: 0x22262d, metalness: 0.6, roughness: 0.5 });
    const base = new THREE.Vector3(0.1, -BUS.y / 2 - 0.04, -0.45);
    const hub = base.clone().add(new THREE.Vector3(0, -0.42, 0));
    strut(group, base, hub, 0.04, dark);
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i += 1) {
      const radius = (SIZE.antenna / 2) * (i / 10);
      profile.push(new THREE.Vector2(radius, 1.25 * radius * radius));
    }
    const dish = new THREE.Mesh(geometry(new THREE.LatheGeometry(profile, 28)), white);
    dish.position.copy(hub);
    dish.rotation.set(Math.PI - 0.3, 0, 0.15);
    group.add(dish);
    const gimbal = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.075, 14, 10)), dark);
    gimbal.position.copy(hub);
    group.add(gimbal);
  }

  // --- Alas solares: tres paneles por lado, a los costados del bus ---
  {
    const group = parts.solar;
    const cells = keep(cellTexture());
    const front = material('solar', { map: cells, metalness: 0.55, roughness: 0.28 });
    const back = material('solar', { color: 0x5d6570, metalness: 0.6, roughness: 0.5 });
    const frame = material('solar', { color: 0x9aa3ad, metalness: 0.9, roughness: 0.4 });
    const dark = material('solar', { color: 0x15181d, metalness: 0.4, roughness: 0.6 });
    const panelGeometry = geometry(new THREE.BoxGeometry(PANEL.length, PANEL.width, 0.035));
    // Caras de la caja: +x, -x, +y, -y, +z (celdas), -z (reverso).
    const faces = [frame, frame, frame, frame, front, back];
    for (const side of [-1, 1]) {
      const inner = side * (BUS.x / 2 + PANEL.yoke);
      // Horquilla en V entre el bus y el primer panel.
      const root = new THREE.Vector3(side * (BUS.x / 2), 0, 0);
      strut(group, root, new THREE.Vector3(inner, 0.7, 0), 0.03, dark);
      strut(group, root, new THREE.Vector3(inner, -0.7, 0), 0.03, dark);
      for (let index = 0; index < 3; index += 1) {
        const panel = new THREE.Mesh(panelGeometry, faces);
        panel.position.set(inner + side * (PANEL.length / 2 + index * (PANEL.length + PANEL.gap)), 0, 0);
        group.add(panel);
      }
    }
  }

  // --- Estructura del radar: prisma de ocho caras acostado, con los alimentadores arriba ---
  {
    const group = parts.radar;
    const gold = material('radar', { color: 0xc9952c, metalness: 1, roughness: 0.38, bumpMap: foil, bumpScale: 1.3, flatShading: true });
    const white = material('radar', { color: 0xf0f1f2, metalness: 0.1, roughness: 0.7 });
    const dark = material('radar', { color: 0x1c2026, metalness: 0.5, roughness: 0.55 });
    const steel = material('radar', { color: 0xaab1ba, metalness: 0.9, roughness: 0.4 });
    const middle = RIS_Z0 + RIS.length / 2;
    const prism = new THREE.Mesh(geometry(new THREE.CylinderGeometry(RIS.radius, RIS.radius, RIS.length, 8)), gold);
    prism.position.set(0, RIS.y, middle);
    prism.rotation.set(Math.PI / 2, Math.PI / 8, 0);
    group.add(prism);
    const flat = RIS.radius * Math.cos(Math.PI / 8);
    const facet = 2 * RIS.radius * Math.sin(Math.PI / 8);
    /** Coloca una placa sobre la cara del prisma que mira en el ángulo `angle` (0 = arriba, π/2 = +x). */
    const onFacet = (mesh: THREE.Object3D, angle: number, z: number, lift = 0.02) => {
      mesh.position.set((flat + lift) * Math.sin(angle), RIS.y + (flat + lift) * Math.cos(angle), z);
      mesh.rotation.set(0, 0, -angle);
      group.add(mesh);
      return mesh;
    };
    const plate = (width: number, length: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(width, length)), mat);
      const holder = new THREE.Group();
      mesh.rotation.x = -Math.PI / 2;
      holder.add(mesh);
      return holder;
    };
    // Alimentador de banda L (NASA): dos filas de doce parches en la cara de arriba.
    const lBand = keep(patchTexture(12, '#3b3f47', '#15181d'));
    lBand.rotation = Math.PI / 2;
    lBand.center.set(0.5, 0.5);
    onFacet(plate(facet * 0.9, RIS.length * 0.72, material('radar', { map: lBand, metalness: 0.3, roughness: 0.5 })), 0, middle + 0.1);
    // Alimentador de banda S (ISRO): dos filas de veinticuatro parches dorados en la cara vecina.
    const sBand = keep(patchTexture(24, '#3a2f16', '#e2b548'));
    sBand.rotation = Math.PI / 2;
    sBand.center.set(0.5, 0.5);
    onFacet(plate(facet * 0.5, RIS.length * 0.5, material('radar', { map: sBand, metalness: 0.85, roughness: 0.35 })), Math.PI / 4, middle + 0.2);
    // Radiadores blancos en las caras de los costados y cajas de electrónica más abajo.
    for (const angle of [-Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
      const radiator = new THREE.Mesh(geometry(new THREE.BoxGeometry(facet * 0.82, 0.04, RIS.length * 0.78)), white);
      onFacet(radiator, angle, middle);
    }
    for (const [index, z] of [RIS_Z0 + 0.6, RIS_Z0 + 1.5, RIS_Z0 + 2.4].entries()) {
      const unit = new THREE.Mesh(geometry(new THREE.BoxGeometry(facet * 0.7, 0.16, 0.6)), dark);
      onFacet(unit, index % 2 ? (3 * Math.PI) / 4 : (-3 * Math.PI) / 4, z, 0.07);
    }
    // Tapa del extremo.
    const cap = new THREE.Mesh(geometry(new THREE.CylinderGeometry(RIS.radius * 0.8, RIS.radius * 0.8, 0.1, 8)), dark);
    cap.position.set(0, RIS.y, RIS_Z0 + RIS.length + 0.05);
    cap.rotation.set(Math.PI / 2, Math.PI / 8, 0);
    group.add(cap);
    // Torre de celosía que cuelga bajo el radar.
    const top = RIS.y - flat;
    const bottom = top - 1.4;
    const half = 0.24;
    const zTower = RIS_Z0 + RIS.length * 0.6;
    const corner = (index: number, y: number) =>
      new THREE.Vector3(index % 2 ? half : -half, y, zTower + (index < 2 ? -half : half));
    for (let index = 0; index < 4; index += 1) strut(group, corner(index, top), corner(index, bottom), 0.018, steel);
    for (let level = 0; level < 4; level += 1) {
      const y0 = top - (level * 1.4) / 4;
      const y1 = top - ((level + 1) * 1.4) / 4;
      for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]] as const) {
        strut(group, corner(a, y0), corner(b, y1), 0.012, steel);
        strut(group, corner(a, y1), corner(b, y1), 0.012, steel);
      }
    }
    // Antenas de GPS sobre el radar.
    for (const x of [-0.35, 0.35]) {
      const gps = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16)), white);
      gps.position.set(x, RIS.y + flat + 0.05, RIS_Z0 + RIS.length - 0.2);
      group.add(gps);
    }
  }

  // --- Brazo: dos tramos envueltos en manta negra, con sus bisagras doradas ---
  {
    const group = parts.boom;
    const tube = material('boom', { color: 0x1b1e24, metalness: 0.5, roughness: 0.5, bumpMap: foil, bumpScale: 1.2 });
    const hinge = material('boom', { color: 0xc9952c, metalness: 1, roughness: 0.4, bumpMap: foil, bumpScale: 1 });
    // Soporte dorado de la raíz, sobre la unión del bus con el radar.
    const mount = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.34, 16, 10)), hinge);
    mount.position.set(0, BUS.y / 2 + 0.08, 0.45);
    mount.scale.set(1.3, 0.75, 1.5);
    group.add(mount);
    for (let index = 1; index < BOOM.length; index += 1) strut(group, BOOM[index - 1]!, BOOM[index]!, 0.115, tube);
    const joint = geometry(new THREE.CylinderGeometry(0.17, 0.17, 0.36, 16));
    const hingeAt = (point: THREE.Vector3) => {
      const mesh = new THREE.Mesh(joint, hinge);
      mesh.position.copy(point);
      mesh.rotation.z = Math.PI / 2;
      group.add(mesh);
    };
    // Bisagras en la raíz, el codo y la punta, y a media altura de cada tramo.
    for (const point of BOOM) hingeAt(point);
    hingeAt(BOOM[0]!.clone().lerp(BOOM[1]!, 0.52));
    hingeAt(BOOM[1]!.clone().lerp(BOOM[2]!, 0.5));
  }

  // --- Reflector: aro de celosía y dos redes; la de abajo lleva la malla dorada ---
  const dishGroup = new THREE.Group();
  dishGroup.position.copy(DISH.center);
  dishGroup.rotation.x = DISH.tilt;
  parts.reflector.add(dishGroup);
  {
    const truss = material('reflector', { color: 0x2a2d33, metalness: 0.4, roughness: 0.5 });
    const upper = DISH.depth / 2;
    const lower = -DISH.depth / 2;
    const node = (index: number, y: number) => {
      const angle = (index / DISH.bays) * Math.PI * 2;
      return new THREE.Vector3(DISH.radius * Math.sin(angle), y, DISH.radius * Math.cos(angle));
    };
    const members: THREE.Matrix4[] = [];
    for (let index = 0; index < DISH.bays; index += 1) {
      members.push(strutMatrix(node(index, upper), node(index + 1, upper), 0.04));
      members.push(strutMatrix(node(index, lower), node(index + 1, lower), 0.04));
      members.push(strutMatrix(node(index, lower), node(index, upper), 0.035));
      members.push(
        index % 2 === 0
          ? strutMatrix(node(index, lower), node(index + 1, upper), 0.03)
          : strutMatrix(node(index, upper), node(index + 1, lower), 0.03),
      );
    }
    const instanced = new THREE.InstancedMesh(unitCylinder, truss, members.length);
    members.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
    instanced.instanceMatrix.needsUpdate = true;
    dishGroup.add(instanced);

    // Red en facetas triangulares: `sag` la hunde hacia el centro del aro.
    const rings = 6;
    const net = (rim: number, sag: number) => {
      const positions: number[] = [0, rim + sag, 0];
      const uvs: number[] = [0.5, 0.5];
      for (let ring = 1; ring <= rings; ring += 1) {
        const radius = (DISH.radius * ring) / rings;
        for (let index = 0; index < DISH.bays; index += 1) {
          const angle = (index / DISH.bays) * Math.PI * 2;
          const x = radius * Math.sin(angle);
          const z = radius * Math.cos(angle);
          positions.push(x, rim + sag * (1 - (radius * radius) / (DISH.radius * DISH.radius)), z);
          uvs.push(x / SIZE.reflector + 0.5, z / SIZE.reflector + 0.5);
        }
      }
      const indices: number[] = [];
      const at = (ring: number, index: number) => 1 + (ring - 1) * DISH.bays + (index % DISH.bays);
      for (let index = 0; index < DISH.bays; index += 1) {
        indices.push(0, at(1, index), at(1, index + 1));
        for (let ring = 1; ring < rings; ring += 1) {
          indices.push(at(ring, index), at(ring + 1, index), at(ring + 1, index + 1));
          indices.push(at(ring, index), at(ring + 1, index + 1), at(ring, index + 1));
        }
      }
      const created = geometry(new THREE.BufferGeometry());
      created.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      created.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      created.setIndex(indices);
      created.computeVertexNormals();
      return created;
    };
    const frontNet = net(lower, DISH.sag);
    const rearNet = net(upper, -DISH.sag * 0.6);
    const mesh = new THREE.Mesh(
      frontNet,
      material('reflector', {
        color: 0xd9a441,
        metalness: 1,
        roughness: 0.36,
        alphaMap: keep(meshAlphaTexture()),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        flatShading: true,
        depthWrite: false,
      }),
    );
    mesh.renderOrder = 2;
    dishGroup.add(mesh);
    dishGroup.add(new THREE.LineSegments(geometry(new THREE.WireframeGeometry(frontNet)), lineMaterial('reflector', 0xf3d48a, 0.45)));
    dishGroup.add(new THREE.LineSegments(geometry(new THREE.WireframeGeometry(rearNet)), lineMaterial('reflector', 0x9aa3ad, 0.2)));
    // Tirantes que unen las dos redes nudo a nudo.
    const ties: number[] = [];
    const front = frontNet.getAttribute('position');
    const rear = rearNet.getAttribute('position');
    for (let index = 0; index < front.count; index += 2) {
      ties.push(front.getX(index), front.getY(index), front.getZ(index), rear.getX(index), rear.getY(index), rear.getZ(index));
    }
    const tieGeometry = geometry(new THREE.BufferGeometry());
    tieGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ties, 3));
    dishGroup.add(new THREE.LineSegments(tieGeometry, lineMaterial('reflector', 0x9aa3ad, 0.2)));
  }

  // --- Cotas y persona de referencia ---
  const dimensions = new THREE.Group();
  dimensions.visible = false;
  root.add(dimensions);
  const anchors = {} as Record<DimensionId, THREE.Vector3>;
  {
    const ruler = keep(new THREE.LineBasicMaterial({ color: 0x9db0c6 }));
    const points: number[] = [];
    const segment = (a: THREE.Vector3, b: THREE.Vector3) => points.push(a.x, a.y, a.z, b.x, b.y, b.z);
    /** Cota entre dos puntos, con un remate corto en cada extremo en la dirección `tick`. */
    const dimension = (id: DimensionId, a: THREE.Vector3, b: THREE.Vector3, tick: THREE.Vector3) => {
      segment(a, b);
      for (const end of [a, b]) segment(end.clone().addScaledVector(tick, -0.35), end.clone().addScaledVector(tick, 0.35));
      anchors[id] = a.clone().add(b).multiplyScalar(0.5);
    };
    const lift = new THREE.Vector3(0, DISH.depth / 2 + 0.9, 0);
    const toWorld = (local: THREE.Vector3) => local.applyEuler(dishGroup.rotation).add(DISH.center);
    dimension('reflector', toWorld(new THREE.Vector3(-DISH.radius, 0, 0).add(lift)), toWorld(new THREE.Vector3(DISH.radius, 0, 0).add(lift)), new THREE.Vector3(0, 1, 0));
    const aside = new THREE.Vector3(0, 0.05, -1);
    dimension('boom', BOOM[0]!.clone().addScaledVector(aside, 2.9), BOOM[2]!.clone().addScaledVector(aside, 0.9), new THREE.Vector3(0, 0, 1));
    dimension('body', new THREE.Vector3(-1.5, BUS.y / 2 + 0.2, -BUS.z / 2), new THREE.Vector3(-1.5, BUS.y / 2 + 0.2, RIS_Z0 + RIS.length), new THREE.Vector3(0, 1, 0));
    const inner = BUS.x / 2 + PANEL.yoke;
    dimension('solar', new THREE.Vector3(inner, -PANEL.width / 2 - 0.6, 0), new THREE.Vector3(inner + SIZE.solarLength, -PANEL.width / 2 - 0.6, 0), new THREE.Vector3(0, 1, 0));
    const rulerGeometry = geometry(new THREE.BufferGeometry());
    rulerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    dimensions.add(new THREE.LineSegments(rulerGeometry, ruler));

    // Persona de 1,75 m, de pie a la altura de la base del bus.
    const skin = keep(new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9, metalness: 0 }));
    const feet = new THREE.Vector3(-2.2, -BUS.y / 2 - 1.4, 6.2);
    const body = new THREE.Mesh(geometry(new THREE.CapsuleGeometry(0.2, SIZE.person - 0.66, 6, 12)), skin);
    body.position.copy(feet).add(new THREE.Vector3(0, (SIZE.person - 0.26) / 2, 0));
    const head = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.13, 14, 10)), skin);
    head.position.copy(feet).add(new THREE.Vector3(0, SIZE.person - 0.13, 0));
    dimensions.add(body, head);
    anchors.person = feet.clone().add(new THREE.Vector3(0, -0.6, 0));
  }

  const setFade = (part: Part, value: number) => {
    for (const item of fading[part]) {
      const opaque = value > 0.995 && item.base >= 1;
      item.material.opacity = item.base * (0.1 + 0.9 * value);
      if (item.material.transparent === opaque) {
        item.material.transparent = !opaque;
        item.material.needsUpdate = true;
      }
      // Una parte apagada no debe tapar lo que tiene detrás.
      if (item.base >= 1) item.material.depthWrite = value > 0.6;
    }
  };

  return { root, parts, dimensions, anchors, setFade, dispose: () => disposables.forEach((item) => item.dispose()) };
}

/** Luz dura de sol por un lado y el reflejo azul de la Tierra por debajo. */
function lightScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.7;
  const sun = new THREE.DirectionalLight(0xfff4e0, 3.2);
  sun.position.set(-9, 12, 14);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x1a2740, 0x4f86c6, 0.9));
  return () => {
    environment.dispose();
    pmrem.dispose();
    room.dispose();
  };
}

function makeRenderer(canvas?: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !canvas });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

// ---------------------------------------------------------------------------------------------
// Foto del modelo para la marca del mapa.

export interface Snapshot {
  url: string;
  /** Metros que abarca la foto de lado a lado: con eso se dibuja a la escala del mapa. */
  spanM: number;
  /** Dónde cae el centro del bus dentro de la foto (0 a 1 desde arriba a la izquierda). */
  anchor: [number, number];
}

const SNAPSHOT_SPAN_M = 19;
const BUS_CENTER = new THREE.Vector3(0, 0, 0);

/** Dibuja el modelo una vez, con cámara ortográfica (sin perspectiva: la foto queda a escala). */
export function renderSnapshot(pixels = 360): Snapshot {
  const renderer = makeRenderer();
  renderer.setSize(pixels, pixels, false);
  const scene = new THREE.Scene();
  const unlight = lightScene(scene, renderer);
  const model = buildNisar();
  scene.add(model.root);
  const half = SNAPSHOT_SPAN_M / 2;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 200);
  const target = new THREE.Vector3(0, 5.0, 2.2);
  camera.position.copy(target).add(new THREE.Vector3(1, 0.42, 0.7).normalize().multiplyScalar(60));
  camera.lookAt(target);
  camera.updateMatrixWorld();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const projected = BUS_CENTER.clone().project(camera);
  model.dispose();
  unlight();
  renderer.dispose();
  renderer.forceContextLoss();
  return { url, spanM: SNAPSHOT_SPAN_M, anchor: [(projected.x + 1) / 2, (1 - projected.y) / 2] };
}

// ---------------------------------------------------------------------------------------------
// Visor para el recorrido guiado.

interface View {
  target: [number, number, number];
  /** Ángulo alrededor del eje vertical y elevación sobre el horizonte, en radianes. */
  azimuth: number;
  elevation: number;
  distance: number;
}

const OVERVIEW: View = { target: [0, 4.9, 2.2], azimuth: 0.95, elevation: 0.26, distance: 40 };
const DIMENSIONS: View = { target: [0, 4.6, 2.2], azimuth: 0.72, elevation: 0.16, distance: 40 };
const PART_VIEWS: Record<Part, View> = {
  reflector: { target: [0, 9.6, 4.1], azimuth: 0.85, elevation: -0.24, distance: 31 },
  boom: { target: [0, 5.6, -0.4], azimuth: 1.45, elevation: 0.08, distance: 25 },
  radar: { target: [0, 0.1, 2.6], azimuth: 0.95, elevation: 0.5, distance: 11.5 },
  solar: { target: [0, 0, 0], azimuth: 0.28, elevation: 0.2, distance: 36 },
  bus: { target: [0, -0.1, -0.1], azimuth: 2.45, elevation: 0.22, distance: 11 },
  antenna: { target: [0.1, -1.35, -0.4], azimuth: 2.5, elevation: -0.38, distance: 7.5 },
};

export interface ViewerOptions {
  /** Rótulos de las cotas, ya en el idioma y las unidades de la persona. */
  labels: Record<DimensionId, string>;
  reducedMotion: boolean;
}

export interface Viewer {
  /** Qué se muestra: una parte resaltada, las medidas, o el satélite entero girando despacio. */
  show: (part: Part | null, dimensions: boolean) => void;
  setLabels: (labels: Record<DimensionId, string>) => void;
  dispose: () => void;
}

export function createViewer(container: HTMLElement, options: ViewerOptions): Viewer {
  const renderer = makeRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.className = 'nisar-lienzo';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const unlight = lightScene(scene, renderer);
  const model = buildNisar();
  scene.add(model.root);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 400);

  // Rótulos de las cotas: elementos del DOM que siguen a su punto del modelo.
  const labelBox = document.createElement('div');
  labelBox.className = 'nisar-cotas';
  container.appendChild(labelBox);
  const labelElements = {} as Record<DimensionId, HTMLSpanElement>;
  for (const id of Object.keys(model.anchors) as DimensionId[]) {
    const element = document.createElement('span');
    element.textContent = options.labels[id];
    labelBox.appendChild(element);
    labelElements[id] = element;
  }

  let width = 1;
  let height = 1;
  const resize = () => {
    width = Math.max(container.clientWidth, 1);
    height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // Estado de la cámara: lo que se ve ahora y hacia dónde va.
  let goal: View = OVERVIEW;
  let part: Part | null = null;
  let showDimensions = false;
  const current = { target: new THREE.Vector3(...OVERVIEW.target), azimuth: OVERVIEW.azimuth, elevation: OVERVIEW.elevation, distance: OVERVIEW.distance * 1.25 };
  const fades = Object.fromEntries(PARTS.map((id) => [id, 1])) as Record<Part, number>;
  let dimensionOpacity = 0;
  /** Giro que la persona añadió arrastrando; vuelve a cero solo, poco a poco. */
  const drag = { azimuth: 0, elevation: 0, active: false, x: 0, y: 0, idleAt: 0 };

  const onDown = (event: PointerEvent) => {
    drag.active = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!drag.active) return;
    drag.azimuth -= (event.clientX - drag.x) * 0.008;
    drag.elevation = Math.max(-0.9, Math.min(0.9, drag.elevation + (event.clientY - drag.y) * 0.006));
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const onUp = () => {
    drag.active = false;
    drag.idleAt = performance.now();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const target = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let frame = 0;
  let last = performance.now();
  let turn = 0;
  let visible = true;

  const render = (now: number) => {
    frame = window.requestAnimationFrame(render);
    if (!visible || document.hidden) {
      last = now;
      return;
    }
    // Entre 0 y 0,1 s: con el equipo ocupado, el cuadro puede traer una hora anterior a la última vista,
    // y un tiempo negativo mandaría la cámara lejísimos.
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
    last = now;
    // Acercamiento amortiguado: rápido al principio y suave al llegar, y se puede interrumpir a mitad.
    const ease = options.reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);

    // El satélite entero gira despacio; con una parte resaltada solo se mece para que no se pierda de vista.
    if (!options.reducedMotion && !drag.active) {
      if (!part && !showDimensions) turn += dt * 0.16;
      if (now - drag.idleAt > 2500) {
        drag.azimuth *= 1 - ease * 0.5;
        drag.elevation *= 1 - ease * 0.5;
      }
    }
    const sway = options.reducedMotion || showDimensions ? 0 : part ? 0.16 * Math.sin(now / 2600) : 0;
    const wanted = goal.azimuth + (part || showDimensions ? 0 : turn) + sway;
    // Por el camino corto: nunca da la vuelta entera para llegar a una vista.
    const delta = Math.atan2(Math.sin(wanted - current.azimuth), Math.cos(wanted - current.azimuth));
    current.azimuth += delta * ease;
    current.elevation += (goal.elevation - current.elevation) * ease;
    current.distance += (goal.distance - current.distance) * ease;
    current.target.lerp(target.set(...goal.target), ease);

    const azimuth = current.azimuth + drag.azimuth;
    const elevation = Math.max(-1.3, Math.min(1.3, current.elevation + drag.elevation));
    // En una tarjeta estrecha el modelo se aleja para caber entero.
    const distance = current.distance * Math.max(1, 0.92 / camera.aspect);
    camera.position.set(
      current.target.x + distance * Math.cos(elevation) * Math.sin(azimuth),
      current.target.y + distance * Math.sin(elevation),
      current.target.z + distance * Math.cos(elevation) * Math.cos(azimuth),
    );
    camera.lookAt(current.target);

    for (const id of PARTS) {
      const wantedFade = !part || part === id ? 1 : 0;
      if (Math.abs(fades[id] - wantedFade) > 0.002) {
        fades[id] += (wantedFade - fades[id]) * (options.reducedMotion ? 1 : 1 - Math.exp(-dt * 6));
        model.setFade(id, fades[id]);
      }
    }

    dimensionOpacity += ((showDimensions ? 1 : 0) - dimensionOpacity) * (options.reducedMotion ? 1 : 1 - Math.exp(-dt * 5));
    model.dimensions.visible = dimensionOpacity > 0.02;
    labelBox.style.opacity = dimensionOpacity.toFixed(3);
    if (model.dimensions.visible) {
      // La cámara se acaba de mover: se pone al día antes de proyectar, o los rótulos irían un cuadro atrás.
      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      for (const id of Object.keys(labelElements) as DimensionId[]) {
        projected.copy(model.anchors[id]).project(camera);
        const x = ((projected.x + 1) / 2) * width;
        const y = ((1 - projected.y) / 2) * height;
        labelElements[id].style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      }
    }
    renderer.render(scene, camera);
  };
  frame = window.requestAnimationFrame(render);

  // Fuera de la pantalla no se dibuja.
  const watcher = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  });
  watcher.observe(container);

  return {
    show: (nextPart, dimensions) => {
      part = nextPart;
      showDimensions = dimensions;
      goal = dimensions ? DIMENSIONS : nextPart ? PART_VIEWS[nextPart] : OVERVIEW;
      if (dimensions || nextPart) turn = 0;
      drag.azimuth = 0;
      drag.elevation = 0;
    },
    setLabels: (labels) => {
      for (const id of Object.keys(labelElements) as DimensionId[]) labelElements[id].textContent = labels[id];
    },
    dispose: () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      watcher.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      model.dispose();
      unlight();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      labelBox.remove();
    },
  };
}
