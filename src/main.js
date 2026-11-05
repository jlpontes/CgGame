import * as THREE from 'three';
import { COLORS } from './config.js';

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

// Câmera provisória (o sistema de câmeras vem em uma etapa posterior)
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 30, 22);
camera.lookAt(0, 0, 0);

// Luz provisória só para enxergar a cena
scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.0));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Loop de renderização
// ---------------------------------------------------------------------------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
