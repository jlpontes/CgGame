import * as THREE from 'three';
import { createPacman } from './models/Pacman.js';
import { createGhost, GHOSTS } from './models/Ghost.js';

// Vitrine dos modelos (modelos.html): mostra o Pac-Man e os quatro fantasmas
// lado a lado sobre uma grade de 1 unidade, com os eixos X (vermelho),
// Y (verde) e Z (azul) para conferir posição, escala e orientação.
// Tecla W alterna o modo wireframe (mostra as malhas/primitivas).

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05061a);

// Chão com grade: cada quadrado = 1 unidade = 1 célula do labirinto
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 8),
  new THREE.MeshStandardMaterial({ color: 0x0c0f2e, roughness: 0.9 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(14, 14, 0x3a4aa8, 0x1e2660);
grid.position.set(2, 0.002, 0);
grid.scale.z = 8 / 14;
scene.add(grid);

const axes = new THREE.AxesHelper(1.2);
axes.position.set(-1.0, 0.01, 0.9);
scene.add(axes);

// Personagens
const pacman = createPacman();
pacman.rotation.y = -Math.PI / 3; // boca virada em 3/4 para a câmera
scene.add(pacman);

GHOSTS.forEach((def, i) => {
  const ghost = createGhost(def.color, def.name);
  ghost.position.x = 1.4 + i * 1.25;
  scene.add(ghost);
});

// Iluminação simples para a vitrine
scene.add(new THREE.HemisphereLight(0x9aa8ff, 0x20142e, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(-3, 6, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.normalBias = 0.03;
scene.add(sun);
const glow = new THREE.PointLight(0xffd23a, 6, 4, 2);
glow.position.set(0, 1.1, 0.6);
scene.add(glow);

// Câmera em perspectiva enquadrando os cinco personagens
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);

function resize() {
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const k = Math.max(1, 1.6 / camera.aspect); // afasta em telas estreitas
  camera.position.set(2.0, 2.6 * k, 6.8 * k);
  camera.lookAt(2.0, 0.3, 0.2);
}
resize();
window.addEventListener('resize', resize);

// W: liga/desliga wireframe em todos os personagens
window.addEventListener('keydown', (e) => {
  if (e.key !== 'w' && e.key !== 'W') return;
  const meshes = [];
  scene.traverse((o) => {
    if (o.isMesh && o !== floor) meshes.push(o);
  });
  const materials = new Set(meshes.map((m) => m.material));
  materials.forEach((m) => {
    m.wireframe = !m.wireframe;
  });
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
