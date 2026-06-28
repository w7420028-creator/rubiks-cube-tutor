import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.2/+esm';

const steps = [
  {
    title: '1. Weisses Kreuz',
    goal: 'Baue unten ein weisses Kreuz. Wichtig: Die seitlichen Farben der Kanten muessen zu den Mittelsteinen passen.',
    action: 'Suche weisse Kanten, bringe sie nach oben und drehe sie dann an die richtige Seite. Arbeite Kante fuer Kante, nicht wild am ganzen Wuerfel.',
    algorithm: 'Kein Pflichtalgorithmus',
    check: 'Unten ist ein weisses Plus. Rot, Blau, Orange und Gruen stimmen jeweils mit dem Mittelstein ueberein.'
  },
  {
    title: '2. Weisse Ecken',
    goal: 'Setze die vier weissen Ecken ein, sodass die komplette erste Ebene geloest ist.',
    action: 'Halte die passende Ecke oben rechts vorne ueber ihrem Zielplatz. Wiederhole den Einsatz, bis Weiss unten liegt.',
    algorithm: "R U R' U'",
    check: 'Die Unterseite ist weiss und der erste Farbring rundherum ist sauber.'
  },
  {
    title: '3. Zweite Ebene',
    goal: 'Bringe die vier mittleren Kanten in die zweite Ebene, ohne die erste Ebene zu zerstoeren.',
    action: 'Halte Weiss unten. Suche oben eine Kante ohne Gelb. Richte die Frontfarbe am Mittelstein aus und schiebe sie nach links oder rechts.',
    algorithm: "Rechts: U R U' R' U' F' U F / Links: U' L' U L U F U' F'",
    check: 'Die unteren zwei Ebenen sind rundherum geloest.'
  },
  {
    title: '4. Gelbes Kreuz',
    goal: 'Erzeuge oben ein gelbes Kreuz. Die Ecken sind in diesem Schritt noch egal.',
    action: 'Halte Punkt, Linie oder L-Form oben. Fuehre den Algorithmus aus, bis das gelbe Kreuz da ist.',
    algorithm: "F R U R' U' F'",
    check: 'Oben siehst du ein gelbes Plus.'
  },
  {
    title: '5. Gelbe Kanten positionieren',
    goal: 'Drehe die obere Ebene so, dass die gelben Kreuz-Kanten seitlich zu den Mittelsteinen passen.',
    action: 'Wenn zwei Kanten schon passen, halte sie passend ausgerichtet. Fuehre den Algorithmus aus, richte mit U neu aus und wiederhole, bis alle vier gelben Kanten stimmen.',
    algorithm: "R U R' U R U2 R' U",
    check: 'Das gelbe Kreuz ist oben und alle vier Seitenfarben der oberen Kanten passen zu ihren Mittelsteinen.'
  },
  {
    title: '6. Gelbe Ecken positionieren',
    goal: 'Bringe die gelben Ecken an die richtigen Positionen.',
    action: 'Suche zwei passende Ecken auf einer Seite und halte sie hinten. Wenn keine passen, fuehre den Algorithmus einmal aus und pruefe erneut.',
    algorithm: "U R U' L' U R' U' L",
    check: 'Alle vier Ecken sitzen an ihrem richtigen Ort, auch wenn sie schon gelb sind.'
  },
  {
    title: '7. Gelbe Ecken drehen',
    goal: 'Drehe die letzten gelben Ecken, ohne den ganzen Wuerfel aus der Hand zu drehen.',
    action: 'Halte eine falsch gedrehte gelbe Ecke vorne rechts oben. Wiederhole den Algorithmus, bis Gelb oben zeigt. Dann nur U drehen und die naechste falsche Ecke nach vorne rechts holen.',
    algorithm: "R' D' R D",
    check: 'Alle sechs Seiten sind einfarbig. Wenn der Wuerfel zwischendurch kaputt aussieht, ist das normal: den Schritt komplett zu Ende fuehren.'
  }
];

const canvas = document.querySelector('#cube-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(5.2, 4.3, 6.2);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x778899, 2.3));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(5, 7, 6);
scene.add(keyLight);

const display = new THREE.Group();
const root = new THREE.Group();
display.add(root);
scene.add(display);

const colors = {
  right: 0xd23b3b,
  left: 0xe67a22,
  up: 0xf0d645,
  down: 0xf6f7f9,
  front: 0x278b56,
  back: 0x275fbc,
  hidden: 0x20252c
};

let cubies = [];
let moves = 0;
let busy = false;
let activeStep = 0;
const pivot = new THREE.Group();
display.add(pivot);

let dragging = false;
let lastPointer = { x: 0, y: 0 };

canvas.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastPointer = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  display.rotation.y += dx * 0.008;
  display.rotation.x = THREE.MathUtils.clamp(display.rotation.x + dy * 0.008, -0.9, 0.9);
  lastPointer = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener('pointerup', (event) => {
  dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});

function material(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.02
  });
}

function materialsFor(x, y, z) {
  return [
    material(x === 1 ? colors.right : colors.hidden),
    material(x === -1 ? colors.left : colors.hidden),
    material(y === 1 ? colors.up : colors.hidden),
    material(y === -1 ? colors.down : colors.hidden),
    material(z === 1 ? colors.front : colors.hidden),
    material(z === -1 ? colors.back : colors.hidden)
  ];
}

function buildCube() {
  cubies.forEach((cubie) => cubie.mesh.removeFromParent());
  cubies = [];
  const geometry = new THREE.BoxGeometry(0.94, 0.94, 0.94, 3, 3, 3);

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        const mesh = new THREE.Mesh(geometry, materialsFor(x, y, z));
        mesh.position.set(x, y, z);
        root.add(mesh);
        cubies.push({ mesh, coord: { x, y, z } });
      }
    }
  }
  moves = 0;
  exposeState();
}

function exposeState() {
  window.rubiksTutorState = {
    cubies: cubies.length,
    steps: steps.length,
    moves,
    activeStep
  };
}

function resize() {
  const box = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(box.width));
  const height = Math.max(1, Math.floor(box.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function axisVector(axis) {
  if (axis === 'x') return new THREE.Vector3(1, 0, 0);
  if (axis === 'y') return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function rotateCoord(coord, axis, quarterTurns) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  let { x, y, z } = coord;
  for (let i = 0; i < turns; i += 1) {
    if (axis === 'x') {
      [y, z] = [-z, y];
    } else if (axis === 'y') {
      [x, z] = [z, -x];
    } else {
      [x, y] = [-y, x];
    }
  }
  coord.x = x;
  coord.y = y;
  coord.z = z;
}

const moveMap = {
  U: { axis: 'y', layer: 1, turns: 1 },
  "U'": { axis: 'y', layer: 1, turns: -1 },
  D: { axis: 'y', layer: -1, turns: -1 },
  "D'": { axis: 'y', layer: -1, turns: 1 },
  R: { axis: 'x', layer: 1, turns: -1 },
  "R'": { axis: 'x', layer: 1, turns: 1 },
  L: { axis: 'x', layer: -1, turns: 1 },
  "L'": { axis: 'x', layer: -1, turns: -1 },
  F: { axis: 'z', layer: 1, turns: -1 },
  "F'": { axis: 'z', layer: 1, turns: 1 },
  B: { axis: 'z', layer: -1, turns: 1 },
  "B'": { axis: 'z', layer: -1, turns: -1 }
};

function parseAlgorithm(algorithm) {
  if (algorithm.startsWith('Kein')) return [];
  const first = algorithm.split('/')[0].replace(/^Rechts:\s*/i, '').replace(/^Links:\s*/i, '');
  return first.match(/[URFDLB]'?2?/g)?.flatMap((token) => {
    if (token.endsWith('2')) {
      const base = token.slice(0, -1);
      return [base, base];
    }
    return [token];
  }) ?? [];
}

function performMove(move) {
  const definition = moveMap[move];
  if (!definition || busy) return;
  busy = true;

  const { axis, layer, turns } = definition;
  const selected = cubies.filter((cubie) => cubie.coord[axis] === layer);
  pivot.rotation.set(0, 0, 0);
  pivot.position.set(0, 0, 0);
  display.add(pivot);
  selected.forEach((cubie) => pivot.attach(cubie.mesh));

  const duration = 230;
  const start = performance.now();
  const target = turns * (Math.PI / 2);

  function animate(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    pivot.rotation[axis] = target * eased;
    if (t < 1) {
      requestAnimationFrame(animate);
      return;
    }

    pivot.updateMatrixWorld();
    selected.forEach((cubie) => {
      display.attach(cubie.mesh);
      rotateCoord(cubie.coord, axis, turns);
      cubie.mesh.position.set(cubie.coord.x, cubie.coord.y, cubie.coord.z);
      cubie.mesh.rotation.x = Math.round(cubie.mesh.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
      cubie.mesh.rotation.y = Math.round(cubie.mesh.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
      cubie.mesh.rotation.z = Math.round(cubie.mesh.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
      root.attach(cubie.mesh);
    });
    pivot.rotation.set(0, 0, 0);
    moves += 1;
    busy = false;
    exposeState();
  }

  requestAnimationFrame(animate);
}

function runSequence(sequence, index = 0) {
  if (index >= sequence.length) return;
  const before = moves;
  performMove(sequence[index]);
  const timer = window.setInterval(() => {
    if (moves !== before) {
      window.clearInterval(timer);
      runSequence(sequence, index + 1);
    }
  }, 40);
}

function updateLesson() {
  const step = steps[activeStep];
  document.querySelector('#step-index').textContent = String(activeStep + 1);
  document.querySelector('#step-title').textContent = step.title;
  document.querySelector('#step-goal').textContent = step.goal;
  document.querySelector('#step-action').textContent = step.action;
  document.querySelector('#step-algorithm').textContent = step.algorithm;
  document.querySelector('#step-check').textContent = step.check;
  document.querySelector('#prev-step').disabled = activeStep === 0;
  document.querySelector('#next-step').disabled = activeStep === steps.length - 1;
  exposeState();
}

document.querySelectorAll('[data-move]').forEach((button) => {
  button.addEventListener('click', () => performMove(button.dataset.move));
});

document.querySelector('#scramble-button').addEventListener('click', () => {
  const sequence = ['R', 'U', "R'", 'F', 'U', "F'", 'L', 'D', "R'", 'U'];
  runSequence(sequence);
});

document.querySelector('#reset-button').addEventListener('click', () => {
  buildCube();
});

document.querySelector('#play-algorithm').addEventListener('click', () => {
  const sequence = parseAlgorithm(steps[activeStep].algorithm);
  runSequence(sequence);
});

document.querySelector('#prev-step').addEventListener('click', () => {
  activeStep = Math.max(0, activeStep - 1);
  updateLesson();
});

document.querySelector('#next-step').addEventListener('click', () => {
  activeStep = Math.min(steps.length - 1, activeStep + 1);
  updateLesson();
});

function render() {
  if (!dragging) display.rotation.y += 0.002;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

window.addEventListener('resize', resize);
buildCube();
updateLesson();
resize();
render();
