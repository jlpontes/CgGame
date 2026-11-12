// Movimentação em grade (lógica pura, sem three.js — testável no Node).
//
// As posições são em coordenadas de grade: x = coluna, z = linha, valores
// fracionários indicam posição entre duas células. A cada "centro de célula"
// (x e z inteiros) o personagem pode decidir virar; entre centros ele anda em
// linha reta. Assim colisão com parede = simplesmente não entrar numa célula
// bloqueada.

export const DIRS = {
  up: { x: 0, z: -1 },
  left: { x: -1, z: 0 },
  down: { x: 0, z: 1 },
  right: { x: 1, z: 0 },
};
// Ordem de prioridade usada para desempate nos fantasmas (igual ao arcade)
export const DIR_LIST = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];

const EPS = 1e-6;
export const isInt = (v) => Math.abs(v - Math.round(v)) < EPS;

export class Navigator {
  constructor(layout) {
    this.layout = layout;
    this.rows = layout.length;
    this.cols = layout[0].length;
  }

  tile(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.layout[row][col];
  }

  // Linha sem parede nas 6 primeiras e 6 últimas colunas = túnel lateral
  // (teletransporte entre as bordas esquerda e direita)
  isTunnelRow(row) {
    if (row < 0 || row >= this.rows) return false;
    const r = this.layout[row];
    return !r.slice(0, 6).includes('#') && !r.slice(-6).includes('#');
  }

  // Célula transitável pelos personagens. A porta '-' da casa dos fantasmas
  // é tratada à parte (os fantasmas entram/saem por "deslizamento").
  walkable(col, row, canDoor = false) {
    if (row < 0 || row >= this.rows) return false;
    if (col < 0 || col >= this.cols) return this.isTunnelRow(row);
    const ch = this.layout[row][col];
    return ch !== '#' && (canDoor || ch !== '-');
  }

  // Distância (em células) de cada célula até o conjunto `targets`, por BFS.
  distanceField(targets, canDoor = false) {
    const field = Array.from({ length: this.rows }, () => new Array(this.cols).fill(Infinity));
    const queue = [];
    for (const t of targets) {
      field[t.z][t.x] = 0;
      queue.push(t);
    }
    for (let i = 0; i < queue.length; i++) {
      const { x, z } = queue[i];
      for (const d of DIR_LIST) {
        const nx = x + d.x;
        const nz = z + d.z;
        if (nx < 0 || nx >= this.cols || nz < 0 || nz >= this.rows) continue;
        if (!this.walkable(nx, nz, canDoor) || field[nz][nx] !== Infinity) continue;
        field[nz][nx] = field[z][x] + 1;
        queue.push({ x: nx, z: nz });
      }
    }
    return field;
  }
}

// Teletransporte nas pontas do túnel
function wrap(e, nav) {
  if (e.dx < 0 && e.x <= -1) e.x = nav.cols;
  else if (e.dx > 0 && e.x >= nav.cols) e.x = -1;
}

// Avança a entidade `e` ({x, z, dx, dz}) por `dist` células. Sempre que chega
// ao centro de uma célula chama `choose(e)`, que pode alterar (dx, dz). Se a
// próxima célula na direção escolhida estiver bloqueada, a entidade para.
export function advance(e, dist, nav, choose) {
  let guard = 0;
  while (dist > 1e-9 && guard++ < 32) {
    const atCenter = isInt(e.x) && isInt(e.z);
    let toNext;
    if (atCenter) {
      e.x = Math.round(e.x);
      e.z = Math.round(e.z);
      wrap(e, nav);
      choose(e);
      if ((e.dx === 0 && e.dz === 0) || !nav.walkable(e.x + e.dx, e.z + e.dz, e.canDoor)) {
        e.dx = 0;
        e.dz = 0;
        return;
      }
      toNext = 1;
    } else {
      if (e.dx === 0 && e.dz === 0) return;
      if (e.dx > 0) toNext = Math.ceil(e.x) - e.x;
      else if (e.dx < 0) toNext = e.x - Math.floor(e.x);
      else if (e.dz > 0) toNext = Math.ceil(e.z) - e.z;
      else toNext = e.z - Math.floor(e.z);
    }
    const m = Math.min(dist, toNext);
    e.x += e.dx * m;
    e.z += e.dz * m;
    dist -= m;
    if (m >= toNext - EPS) {
      e.x = Math.round(e.x);
      e.z = Math.round(e.z);
    }
  }
}
