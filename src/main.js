import * as THREE from 'three';
import { COLORS } from './config.js';
import { Maze } from './scene/Maze.js';
import { CameraSystem } from './scene/Cameras.js';
import { createPacman } from './models/Pacman.js';
import { createGhost, GHOSTS } from './models/Ghost.js';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.background);

// Cenário: labirinto, pastilhas e porta da casa dos fantasmas
const maze = new Maze();
scene.add(maze.group);

// Personagens: Pac-Man na posição inicial ('P') olhando para a esquerda
const pacman = createPacman();
const start = maze.find('P');
pacman.position.copy(maze.toWorld(start.col + 0.5, start.row));
pacman.rotation.y = Math.PI; // boca (+X local) virada para -X
scene.add(pacman);

// Fantasmas: Blinky na saída da casa, os outros três dentro dela
const ghostSpots = [
  { col: 13.5, row: 11 },
  { col: 13.5, row: 14 },
  { col: 11.5, row: 14 },
  { col: 15.5, row: 14 },
];
const ghosts = GHOSTS.map((def, i) => {
  const g = createGhost(def.color, def.name);
  g.position.copy(maze.toWorld(ghostSpots[i].col, ghostSpots[i].row));
  scene.add(g);
  return g;
});

// ---------------------------------------------------------------------------
// Câmeras (projeção perspectiva) — ver scene/Cameras.js
// ---------------------------------------------------------------------------
const cameras = new CameraSystem(window.innerWidth / window.innerHeight);
const hudCamera = document.getElementById('hud-camera');

function updateCameraHud() {
  const { name, camera } = cameras.active;
  hudCamera.textContent = `${cameras.index + 1} · ${name} (fov ${camera.fov}°)`;
}
updateCameraHud();

window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '3') cameras.select(Number(e.key) - 1);
  else if (e.key === 'c' || e.key === 'C') cameras.next();
  else return;
  updateCameraHud();
});

// Luz provisória só para enxergar a cena
scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.0));

window.addEventListener('resize', () => {
  cameras.setAspect(window.innerWidth / window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Loop de renderização
// ---------------------------------------------------------------------------
renderer.setAnimationLoop(() => {
  cameras.update(pacman);
  renderer.render(scene, cameras.camera);
});
