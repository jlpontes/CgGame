import * as THREE from 'three';
import { COLORS } from './config.js';
import { Maze } from './scene/Maze.js';
import { CameraSystem } from './scene/Cameras.js';
import { LightSystem } from './scene/Lights.js';
import { createPacman } from './models/Pacman.js';
import { createGhost, GHOSTS } from './models/Ghost.js';
import { Game } from './game/Game.js';
import { DIRS } from './game/Movement.js';
import { Sfx } from './game/Sfx.js';

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

// ---------------------------------------------------------------------------
// Iluminação — ver scene/Lights.js
// ---------------------------------------------------------------------------
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const lights = new LightSystem(scene, pacman);
const hudLights = document.getElementById('hud-lights');

function renderLightsHud() {
  hudLights.innerHTML = '';
  lights.lights.forEach((entry, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = entry.light.visible ? 'light on' : 'light off';
    btn.innerHTML = `<kbd>${entry.key}</kbd> ${entry.label} <b>${entry.light.visible ? 'ON' : 'OFF'}</b>`;
    btn.addEventListener('click', () => {
      lights.toggle(i);
      renderLightsHud();
    });
    li.appendChild(btn);
    hudLights.appendChild(li);
  });
}
renderLightsHud();

window.addEventListener('keydown', (e) => {
  const i = lights.indexForKey(e.key);
  if (i === -1) return;
  lights.toggle(i);
  renderLightsHud();
});

// ---------------------------------------------------------------------------
// Jogo (Entrega 05) — regras em game/Game.js; aqui só controles, HUD e desenho
// ---------------------------------------------------------------------------
const game = new Game();
const sfx = new Sfx();

const $ = (id) => document.getElementById(id);
const ui = {
  score: $('sb-score'),
  high: $('sb-high'),
  level: $('sb-level'),
  pellets: $('sb-pellets'),
  lives: $('sb-lives'),
  frightBar: $('fright-bar'),
  frightFill: $('fright-fill'),
  overlay: $('overlay'),
  title: $('overlay-title'),
  text: $('overlay-text'),
  sub: $('overlay-sub'),
  popups: $('popups'),
};

function restart(fn) {
  fn();
  maze.resetPellets();
  lastScore = -1;
}

// Controles: setas ou WASD. Nas câmeras 1 e 2 as direções são as da tela;
// na câmera 3 (terceira pessoa) são relativas ao Pac-Man: ↑ segue em frente,
// ←/→ viram à esquerda/direita dele e ↓ dá meia-volta.
const KEYS = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

function resolveDirection(name) {
  if (cameras.index !== 2) return DIRS[name];
  const f = game.pacman.facing;
  if (name === 'up') return { x: f.x, z: f.z };
  if (name === 'down') return { x: -f.x, z: -f.z };
  if (name === 'left') return { x: f.z, z: -f.x };
  return { x: -f.z, z: f.x };
}

window.addEventListener('keydown', (e) => {
  if (e.repeat && !KEYS[e.key]) return;
  const dir = KEYS[e.key];
  if (dir) {
    e.preventDefault();
    const wasReady = game.status === 'ready';
    game.steer(resolveDirection(dir));
    if (wasReady && game.status === 'playing') sfx.start();
    return;
  }
  switch (e.key) {
    case 'p': case 'P': case ' ':
      e.preventDefault();
      game.togglePause();
      break;
    case 'Enter':
      if (game.status === 'won') restart(() => game.nextLevel());
      else if (game.status === 'over') restart(() => game.newGame());
      else if (game.status === 'ready') { game.start(); sfx.start(); }
      break;
    case 'r': case 'R':
      restart(() => game.newGame());
      break;
    case 'm': case 'M':
      sfx.toggleMute();
      break;
  }
});

// Pausa automática ao trocar de aba
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.status === 'playing') game.togglePause();
});

const GHOST_SCARED = new THREE.Color(0x2438ff);
const GHOST_BLINK = new THREE.Color(0xffffff);
const TURN_SPEED = 18; // rad/s ao virar o Pac-Man

function turnToward(obj, target, dt) {
  let d = ((target - obj.rotation.y + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  obj.rotation.y += Math.sign(d) * Math.min(Math.abs(d), TURN_SPEED * dt);
}

let lastScore = -1;
let lastLives = -1;
let lastLevel = -1;

function renderHud() {
  if (game.score !== lastScore) {
    ui.score.textContent = game.score;
    ui.score.classList.remove('bump');
    void ui.score.offsetWidth; // reinicia a animação
    if (lastScore >= 0) ui.score.classList.add('bump');
    lastScore = game.score;
  }
  ui.high.textContent = game.highScore;
  ui.pellets.textContent = game.pelletsLeft;
  if (game.lives !== lastLives) {
    ui.lives.innerHTML = '<i class="life"></i>'.repeat(Math.max(0, game.lives));
    lastLives = game.lives;
  }
  if (game.level !== lastLevel) {
    ui.level.textContent = game.level;
    lastLevel = game.level;
  }

  const scared = game.frightTimer > 0;
  ui.frightBar.hidden = !scared;
  if (scared) ui.frightFill.style.width = `${(game.frightTimer / game.frightDuration) * 100}%`;

  const msgs = {
    ready: ['PRONTO!', 'Use as setas ou WASD para começar', 'Coma todas as pastilhas e fuja dos fantasmas', ''],
    paused: ['PAUSADO', 'Pressione P ou Espaço para continuar', '', ''],
    won: ['VOCÊ VENCEU!', `Pontuação: ${game.score}`, 'Enter: próximo nível · R: reiniciar', 'win'],
    over: ['GAME OVER', `Pontuação: ${game.score} · Recorde: ${game.highScore}`, 'Enter ou R: jogar de novo', 'lose'],
  };
  const m = msgs[game.status];
  ui.overlay.hidden = !m;
  if (m) {
    [ui.title.textContent, ui.text.textContent, ui.sub.textContent] = m;
    ui.overlay.className = m[3] || '';
  }
}

function popup(text, x, z) {
  const v = maze.toWorld(x, z, 1).project(cameras.camera);
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
  el.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
  ui.popups.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function handleEvents() {
  for (const ev of game.events) {
    if (ev === 'power') sfx.power();
    else if (ev === 'death') sfx.death();
    else if (ev === 'win') sfx.win();
    else if (ev === 'life') { sfx.life(); popup('+1 VIDA', game.pacman.x, game.pacman.z); }
    else if (ev.type === 'eat') {
      maze.hidePellet(`${ev.x},${ev.z}`);
      if (ev.kind === 'dot') sfx.wakka();
    } else if (ev.type === 'ghost') {
      sfx.ghost();
      popup(`+${ev.points}`, ev.x, ev.z);
    }
  }
}

// Sincroniza a cena 3D com o estado do jogo
function syncScene(dt, t) {
  const p = game.pacman;
  pacman.position.copy(maze.toWorld(p.x, p.z));
  if (game.status === 'dying') {
    // animação de morte: gira e encolhe
    const k = Math.min(game.dyingTimer / 1.5, 1);
    pacman.scale.setScalar(Math.max(0.001, 1 - k));
    pacman.rotation.y += 10 * dt;
  } else {
    pacman.scale.setScalar(1);
    turnToward(pacman, Math.atan2(-p.facing.z, p.facing.x), dt);
  }
  // boca abre e fecha enquanto anda
  const { upper, lower } = pacman.userData;
  const open = p.moving && game.status === 'playing' ? 0.04 + 0.42 * Math.abs(Math.sin(t * 14)) : 0.4;
  upper.rotation.z = open;
  lower.rotation.z = -open;

  const blink = game.frightTimer > 0 && game.frightTimer < 2 && Math.floor(t * 6) % 2 === 0;
  game.ghosts.forEach((g, i) => {
    const mesh = ghosts[i];
    const { bodyMat, baseColor, parts } = mesh.userData;
    mesh.position.copy(maze.toWorld(g.x, g.z + (g.bob || 0)));
    mesh.position.y = g.state === 'normal' && !g.frightened ? 0 : 0.05 * Math.sin(t * 10 + i);
    if (g.dx || g.dz) turnToward(mesh, Math.atan2(g.dx, g.dz), dt);
    const eaten = g.state === 'eaten';
    parts.forEach((o) => (o.visible = !eaten)); // comido: só os olhos voltam para casa
    if (g.frightened) bodyMat.color.copy(blink ? GHOST_BLINK : GHOST_SCARED);
    else bodyMat.color.setHex(baseColor);
    mesh.visible = !(game.status === 'dying' && game.dyingTimer > 0.3);
  });
}

window.addEventListener('resize', () => {
  cameras.setAspect(window.innerWidth / window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Loop de renderização
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); // evita saltos após travadas
  const t = clock.elapsedTime;
  game.update(dt);
  handleEvents();
  syncScene(dt, t);
  maze.animate(t);
  renderHud();
  cameras.update(pacman);
  renderer.render(scene, cameras.camera);
});

// Atalho para depuração/demonstração no console
window.game = game;

// Para o vídeo: deixa só as 3 pastilhas mais próximas do Pac-Man, para mostrar a vitória rapidamente.
// Uso: digitar demoVitoria() no console do navegador.
window.demoVitoria = () => {
  const p = game.pacman;
  const dist = (k) => { const [x, z] = k.split(',').map(Number); return Math.hypot(x - p.x, z - p.z); };
  [...game.pellets.keys()].sort((a, b) => dist(a) - dist(b)).slice(3).forEach((k) => {
    game.pellets.delete(k);
    maze.hidePellet(k);
  });
};

