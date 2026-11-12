// Regras e estado do jogo (lógica pura, sem three.js).
// A cena 3D (main.js) apenas lê este estado e o desenha.

import { MAZE_LAYOUT } from '../config.js';
import { Navigator, DIRS, DIR_LIST, advance, isInt } from './Movement.js';

export const POINTS = { dot: 10, power: 50, ghostBase: 200, extraLife: 10000 };
export const START_LIVES = 3;

const SPEED = { pacman: 7.0, ghost: 6.2, frightened: 3.8, eaten: 13, tunnel: 3.6 };
const SCATTER_CHASE = [7, 20, 7, 20, 5, 20, 5]; // alterna dispersar/perseguir; depois persegue sempre
const HOUSE_RELEASE = [0, 2, 5, 8]; // segundos até cada fantasma sair da casa
const DOOR_EXIT = { x: 13, z: 11 }; // célula logo acima da porta
const HOUSE_CENTER = { x: 13, z: 14 };
const CORNERS = [
  { x: 25, z: -3 }, // Blinky
  { x: 2, z: -3 }, // Pinky
  { x: 27, z: 31 }, // Inky
  { x: 0, z: 31 }, // Clyde
];
const GHOST_START = [
  { x: 13.5, z: 11, dx: -1, dz: 0, inHouse: false },
  { x: 13, z: 14, dx: 0, dz: 0, inHouse: true },
  { x: 11, z: 14, dx: 0, dz: 0, inHouse: true },
  { x: 15, z: 14, dx: 0, dz: 0, inHouse: true },
];

export class Game {
  constructor(layout = MAZE_LAYOUT) {
    this.layout = layout;
    this.nav = new Navigator(layout);
    this.exitField = this.nav.distanceField([DOOR_EXIT], true);
    this.homeField = this.nav.distanceField([HOUSE_CENTER], true);
    this.highScore = Number(localStorage.getItem('pacman3d-highscore') || 0);
    this.events = []; // eventos do último quadro (para som/efeitos)
    this.newGame();
  }

  // ------------------------------------------------------------------ estado
  newGame() {
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.extraGiven = false;
    this.#loadLevel();
  }

  nextLevel() {
    this.level++;
    this.#loadLevel();
  }

  #loadLevel() {
    // Pastilhas restantes: chave "col,row" -> 'dot' | 'power'
    this.pellets = new Map();
    this.layout.forEach((row, z) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') this.pellets.set(`${x},${z}`, 'dot');
        else if (ch === 'o') this.pellets.set(`${x},${z}`, 'power');
      }),
    );
    this.totalPellets = this.pellets.size;
    this.#resetActors();
    this.status = 'ready'; // ready | playing | dying | paused | won | over
    this.statusTimer = 0;
  }

  #resetActors() {
    const p = this.layout.findIndex((r) => r.includes('P'));
    this.pacman = {
      x: this.layout[p].indexOf('P') + 0.5,
      z: p,
      dx: -1, // começa andando para a esquerda, como no arcade
      dz: 0,
      facing: { ...DIRS.left },
      want: null, // direção pedida pelo jogador (buffer de curva)
      eatTimer: 0,
    };
    this.ghosts = GHOST_START.map((s, i) => ({
      id: i,
      ...s,
      state: s.inHouse ? 'house' : 'normal', // house | leaving | normal | eaten
      canDoor: false,
      frightened: false,
      houseTimer: HOUSE_RELEASE[i],
    }));
    this.modeIndex = 0;
    this.modeTimer = SCATTER_CHASE[0];
    this.chasing = false; // false = dispersar (scatter)
    this.frightTimer = 0;
    this.ghostChain = 0;
    this.time = 0;
    this.dyingTimer = 0;
    this.events = [];
  }

  get pelletsLeft() {
    return this.pellets.size;
  }

  get speedFactor() {
    return 1 + 0.05 * (this.level - 1);
  }

  get frightDuration() {
    return Math.max(2.5, 7 - (this.level - 1));
  }

  // --------------------------------------------------------------- comandos
  // Chamado pelos controles: define a direção desejada.
  steer(dir) {
    if (this.status !== 'playing' && this.status !== 'ready') return;
    this.pacman.want = dir;
    if (this.status === 'ready') this.status = 'playing';
  }

  start() {
    if (this.status === 'ready') this.status = 'playing';
  }

  togglePause() {
    if (this.status === 'playing') this.status = 'paused';
    else if (this.status === 'paused') this.status = 'playing';
  }

  // --------------------------------------------------------------- simulação
  update(dt) {
    this.events = [];
    if (this.status === 'dying') {
      this.dyingTimer += dt;
      if (this.dyingTimer > 1.8) {
        if (this.lives > 0) {
          this.#resetActors();
          this.status = 'ready';
        } else {
          this.status = 'over';
          this.#saveHighScore();
        }
      }
      return;
    }
    if (this.status !== 'playing') return;

    this.time += dt;
    this.#updateModes(dt);
    this.#updatePacman(dt);
    this.ghosts.forEach((g) => this.#updateGhost(g, dt));
    this.#checkCollisions();
    if (this.status === 'playing' && this.pellets.size === 0) {
      this.status = 'won';
      this.#saveHighScore();
      this.events.push('win');
    }
  }

  #updateModes(dt) {
    if (this.frightTimer > 0) {
      this.frightTimer -= dt;
      if (this.frightTimer <= 0) {
        this.frightTimer = 0;
        this.ghosts.forEach((g) => (g.frightened = false));
      }
      return; // o relógio dispersar/perseguir pausa enquanto estão assustados
    }
    if (this.modeIndex >= SCATTER_CHASE.length) return;
    this.modeTimer -= dt;
    if (this.modeTimer <= 0) {
      this.modeIndex++;
      this.chasing = this.modeIndex % 2 === 1 || this.modeIndex >= SCATTER_CHASE.length;
      this.modeTimer = SCATTER_CHASE[this.modeIndex] ?? Infinity;
      this.ghosts.forEach((g) => this.#reverse(g)); // regra do arcade: inverte ao mudar de modo
    }
  }

  #reverse(g) {
    if (g.state === 'normal') {
      g.dx = -g.dx;
      g.dz = -g.dz;
    }
  }

  // ----------------------------------------------------------------- Pac-Man
  #updatePacman(dt) {
    const p = this.pacman;
    const speed = SPEED.pacman * this.speedFactor * (this.frightTimer > 0 ? 1.1 : 1);

    // Inverter o sentido é permitido a qualquer momento (meio de corredor)
    const w = p.want;
    if (w && (p.dx !== 0 || p.dz !== 0) && w.x === -p.dx && w.z === -p.dz) {
      p.dx = w.x;
      p.dz = w.z;
      p.want = null;
    }

    advance(p, speed * dt, this.nav, (e) => {
      // No centro da célula: tenta virar para a direção pedida
      if (p.want && this.nav.walkable(e.x + p.want.x, e.z + p.want.z)) {
        e.dx = p.want.x;
        e.dz = p.want.z;
      }
    });
    if (p.dx !== 0 || p.dz !== 0) p.facing = { x: p.dx, z: p.dz };
    p.moving = p.dx !== 0 || p.dz !== 0;

    // Comer pastilha da célula mais próxima do centro
    const cx = Math.round(p.x);
    const cz = Math.round(p.z);
    if (Math.abs(p.x - cx) < 0.5 && Math.abs(p.z - cz) < 0.5) this.#eat(cx, cz);
  }

  #eat(x, z) {
    const key = `${x},${z}`;
    const kind = this.pellets.get(key);
    if (!kind) return;
    this.pellets.delete(key);
    this.events.push({ type: 'eat', x, z, kind });
    if (kind === 'dot') {
      this.#addScore(POINTS.dot);
    } else {
      this.#addScore(POINTS.power);
      this.frightTimer = this.frightDuration;
      this.ghostChain = 0;
      this.events.push('power');
      for (const g of this.ghosts) {
        if (g.state === 'normal' || g.state === 'leaving') {
          g.frightened = true;
          this.#reverse(g);
        }
      }
    }
  }

  #addScore(n) {
    this.score += n;
    if (!this.extraGiven && this.score >= POINTS.extraLife) {
      this.extraGiven = true;
      this.lives++;
      this.events.push('life');
    }
    if (this.score > this.highScore) this.highScore = this.score;
  }

  #saveHighScore() {
    localStorage.setItem('pacman3d-highscore', String(this.highScore));
  }

  // ---------------------------------------------------------------- fantasmas
  #updateGhost(g, dt) {
    const f = this.speedFactor;
    if (g.state === 'house') {
      g.houseTimer -= dt;
      if (g.houseTimer <= 0) {
        g.state = 'leaving';
        g.canDoor = true;
        g.dx = 0;
        g.dz = 0;
      } else {
        // Balanço de espera: apenas visual (z oscila em torno da linha 14)
        g.bob = Math.sin(this.time * 6 + g.id) * 0.18;
        return;
      }
    }
    g.bob = 0;

    let speed = SPEED.ghost * f;
    if (g.state === 'eaten') speed = SPEED.eaten;
    else if (g.frightened) speed = SPEED.frightened * f;
    else if (this.nav.isTunnelRow(Math.round(g.z)) && (g.x < 5.5 || g.x > 22.5)) speed = SPEED.tunnel;

    advance(g, speed * dt, this.nav, (e) => this.#chooseGhostDir(g, e));
    // fantasma preso sem direção (ex.: acabou de renascer): escolhe uma
    if (g.dx === 0 && g.dz === 0 && isInt(g.x) && isInt(g.z)) this.#chooseGhostDir(g, g);

    // Passou pela porta (linha acima dela): volta ao comportamento normal
    if (g.state === 'leaving' && g.z <= DOOR_EXIT.z + 0.5) {
      g.state = 'normal';
      g.canDoor = false;
    }
  }

  #chooseGhostDir(g, e) {
    const cx = Math.round(e.x);
    const cz = Math.round(e.z);

    // Fantasma comido chegou ao centro da casa: renasce e sai de novo
    if (g.state === 'eaten' && cx === HOUSE_CENTER.x && cz === HOUSE_CENTER.z) {
      g.state = 'leaving';
      g.frightened = false;
      e.dx = 0;
      e.dz = 0;
    }
    const canDoor = g.canDoor;

    // Opções: células vizinhas livres, sem dar meia-volta
    const options = DIR_LIST.filter(
      (d) => !(d.x === -e.dx && d.z === -e.dz) && this.nav.walkable(cx + d.x, cz + d.z, canDoor),
    );
    if (options.length === 0) {
      // beco sem saída: volta
      e.dx = -e.dx;
      e.dz = -e.dz;
      return;
    }

    let best = options[0];
    if (g.state === 'leaving' || g.state === 'eaten') {
      const field = g.state === 'leaving' ? this.exitField : this.homeField;
      let bd = Infinity;
      for (const d of options) {
        const nx = cx + d.x;
        const nz = cz + d.z;
        const v = nx < 0 || nx >= this.nav.cols ? Infinity : field[nz][nx];
        if (v < bd) {
          bd = v;
          best = d;
        }
      }
    } else if (g.frightened) {
      best = options[Math.floor(Math.random() * options.length)];
    } else {
      const t = this.#ghostTarget(g);
      let bd = Infinity;
      for (const d of options) {
        const dist = (cx + d.x - t.x) ** 2 + (cz + d.z - t.z) ** 2;
        if (dist < bd) {
          bd = dist;
          best = d;
        }
      }
    }
    e.dx = best.x;
    e.dz = best.z;
  }

  // Alvo de cada fantasma: personalidades do jogo original.
  #ghostTarget(g) {
    if (!this.chasing) return CORNERS[g.id];
    const p = this.pacman;
    const px = Math.round(p.x);
    const pz = Math.round(p.z);
    const f = p.facing;
    switch (g.id) {
      case 0: // Blinky: persegue diretamente
        return { x: px, z: pz };
      case 1: // Pinky: embosca 4 células à frente
        return { x: px + f.x * 4, z: pz + f.z * 4 };
      case 2: {
        // Inky: reflexo de Blinky em torno de 2 células à frente do Pac-Man
        const b = this.ghosts[0];
        const ax = px + f.x * 2;
        const az = pz + f.z * 2;
        return { x: 2 * ax - Math.round(b.x), z: 2 * az - Math.round(b.z) };
      }
      default: {
        // Clyde: persegue de longe, foge para o canto quando está perto
        const d = Math.hypot(g.x - p.x, g.z - p.z);
        return d > 8 ? { x: px, z: pz } : CORNERS[3];
      }
    }
  }

  // ---------------------------------------------------------------- colisões
  #checkCollisions() {
    const p = this.pacman;
    for (const g of this.ghosts) {
      if (g.state === 'house' || g.state === 'eaten') continue;
      const d = Math.hypot(g.x - p.x, g.z - p.z);
      if (d > 0.7) continue;
      if (g.frightened) {
        g.state = 'eaten';
        g.frightened = false;
        g.canDoor = true;
        g.dx = g.dx || 1;
        const pts = POINTS.ghostBase * 2 ** this.ghostChain;
        this.ghostChain = Math.min(this.ghostChain + 1, 3);
        this.#addScore(pts);
        this.events.push({ type: 'ghost', points: pts, x: g.x, z: g.z });
      } else {
        this.#die();
        return;
      }
    }
  }

  #die() {
    this.lives--;
    this.status = 'dying';
    this.dyingTimer = 0;
    this.events.push('death');
  }
}
