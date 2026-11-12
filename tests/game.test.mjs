// Testes da lógica do jogo (sem navegador): node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { Game, POINTS } = await import('../src/game/Game.js');
const { DIRS, DIR_LIST } = await import('../src/game/Movement.js');

const run = (g, secs, dt = 1 / 60) => {
  for (let t = 0; t < secs; t += dt) g.update(dt);
};

test('Pac-Man anda e não atravessa parede', () => {
  const g = new Game();
  g.steer(DIRS.up); // acima do ponto inicial há parede
  run(g, 0.05);
  assert.equal(g.pacman.z, 23);
  g.steer(DIRS.left);
  run(g, 1);
  assert.ok(g.pacman.x < 13.5);
  assert.ok(!g.nav.walkable(Math.round(g.pacman.x) - 1, 23) || g.pacman.dx !== 0);
});

test('comer pastilhas aumenta a pontuação', () => {
  const g = new Game();
  g.steer(DIRS.left);
  run(g, 1.0);
  assert.ok(g.score >= POINTS.dot && g.score % 10 === 0);
  assert.equal(g.pelletsLeft, g.totalPellets - g.score / 10);
});

test('pastilha de poder assusta os fantasmas e comê-los dá pontos dobrados', () => {
  const g = new Game();
  g.status = 'playing';
  g.pacman.x = 1; g.pacman.z = 23; g.pacman.dx = 0; g.pacman.dz = 0;
  g.steer(DIRS.left);
  run(g, 0.05);
  assert.ok(g.frightTimer > 0);
  assert.ok(g.ghosts.some((x) => x.frightened));
  const gh = g.ghosts[0];
  gh.frightened = true;
  gh.x = g.pacman.x; gh.z = g.pacman.z;
  const before = g.score;
  g.update(0.001);
  assert.equal(gh.state, 'eaten');
  assert.equal(g.score - before, 200);
});

test('encostar num fantasma tira uma vida e termina o jogo no fim das vidas', () => {
  const g = new Game();
  g.status = 'playing';
  g.ghosts[0].x = g.pacman.x; g.ghosts[0].z = g.pacman.z;
  g.update(0.01);
  assert.equal(g.status, 'dying');
  assert.equal(g.lives, 2);
  run(g, 2);
  assert.equal(g.status, 'ready');
  g.lives = 1;
  g.status = 'playing';
  g.ghosts[0].x = g.pacman.x; g.ghosts[0].z = g.pacman.z;
  g.update(0.01);
  run(g, 2);
  assert.equal(g.status, 'over');
});

test('comer todas as pastilhas vence', () => {
  const g = new Game();
  g.status = 'playing';
  const last = [...g.pellets.keys()].pop();
  g.pellets.clear();
  g.pellets.set(last, 'dot');
  const [x, z] = last.split(',').map(Number);
  g.pacman.x = x; g.pacman.z = z;
  g.update(0.01);
  assert.equal(g.status, 'won');
});

test('simulação longa: fantasmas saem da casa, ficam em células livres e o jogo não trava', () => {
  const g = new Game();
  g.start();
  g.lives = 99;
  let t = 0;
  const left = new Set();
  for (let i = 0; i < 60 * 120; i++) {
    if (i % 25 === 0) g.steer(DIR_LIST[Math.floor(Math.random() * 4)]);
    g.update(1 / 60);
    if (g.status === 'dying') { run(g, 2); g.start(); }
    for (const gh of [...g.ghosts, g.pacman]) {
      assert.ok(Number.isFinite(gh.x) && Number.isFinite(gh.z));
      const cx = Math.round(gh.x), cz = Math.round(gh.z);
      if (gh.id === undefined) assert.ok(g.nav.walkable(cx, cz), `Pac-Man em parede ${cx},${cz}`);
      else assert.ok(g.nav.walkable(cx, cz, true), `fantasma ${gh.id} em parede ${cx},${cz}`);
    }
    g.ghosts.forEach((x) => x.state === 'normal' && left.add(x.id));
    t += 1 / 60;
    if (g.status === 'won') break;
  }
  assert.equal(left.size, 4, 'todos os fantasmas saíram da casa em algum momento');
});

test('túnel teletransporta de um lado ao outro', () => {
  const g = new Game();
  g.status = 'playing';
  Object.assign(g.pacman, { x: 1, z: 14, dx: 0, dz: 0 });
  g.steer(DIRS.left);
  run(g, 0.7);
  assert.ok(g.pacman.x > 20, `x=${g.pacman.x}`);
});
