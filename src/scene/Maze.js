import * as THREE from 'three';
import { MAZE_LAYOUT, COLORS, SIZES } from '../config.js';

// Cenário 3D: chão, paredes, porta da casa dos fantasmas e pastilhas,
// construídos a partir do mapa em texto (MAZE_LAYOUT).
export class Maze {
  constructor(layout = MAZE_LAYOUT) {
    this.grid = layout.map((row) => row.split(''));
    this.rows = this.grid.length;
    this.cols = this.grid[0].length;

    this.group = new THREE.Group();
    this.group.name = 'Labirinto';

    this.#buildFloor();
    this.#buildWalls();
    this.#buildDoor();
    this.#buildPellets();
  }

  tile(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.grid[row][col];
  }

  isWall(col, row) {
    return this.tile(col, row) === '#';
  }

  // Converte coordenada de grade (coluna, linha) para o espaço do mundo.
  // O labirinto fica centralizado na origem, no plano XZ (Y para cima).
  toWorld(col, row, y = 0) {
    return new THREE.Vector3(col - this.cols / 2 + 0.5, y, row - this.rows / 2 + 0.5);
  }

  // Procura o primeiro caractere do mapa (ex.: 'P')
  find(char) {
    for (let r = 0; r < this.rows; r++) {
      const c = this.grid[r].indexOf(char);
      if (c !== -1) return { col: c, row: r };
    }
    return null;
  }

  #forEachTile(fn) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) fn(this.grid[r][c], c, r);
    }
  }

  #buildFloor() {
    const geo = new THREE.PlaneGeometry(this.cols + 2, this.rows + 2);
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.85, metalness: 0.1 });
    const floor = new THREE.Mesh(geo, mat);
    floor.name = 'Chão';
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  #buildWalls() {
    const h = SIZES.wallHeight;
    const walls = [];
    this.#forEachTile((ch, c, r) => {
      if (ch === '#') walls.push({ c, r });
    });

    // Um bloco por célula de parede, usando instanciamento (1 draw call)
    const boxGeo = new THREE.BoxGeometry(1, h, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.45, metalness: 0.2 });
    const blocks = new THREE.InstancedMesh(boxGeo, boxMat, walls.length);
    blocks.name = 'Paredes';
    blocks.castShadow = true;
    blocks.receiveShadow = true;

    const m = new THREE.Matrix4();
    walls.forEach(({ c, r }, i) => {
      const p = this.toWorld(c, r, h / 2);
      m.makeTranslation(p.x, p.y, p.z);
      blocks.setMatrixAt(i, m);
    });
    this.group.add(blocks);

    // Faixas claras no topo, nas bordas que dão para corredores (visual "neon")
    const strips = [];
    const t = 0.08; // espessura da faixa
    walls.forEach(({ c, r }) => {
      const p = this.toWorld(c, r, h + 0.01);
      if (!this.isWall(c, r - 1)) strips.push({ x: p.x, z: p.z - 0.5 + t / 2, sx: 1, sz: t });
      if (!this.isWall(c, r + 1)) strips.push({ x: p.x, z: p.z + 0.5 - t / 2, sx: 1, sz: t });
      if (!this.isWall(c - 1, r)) strips.push({ x: p.x - 0.5 + t / 2, z: p.z, sx: t, sz: 1 });
      if (!this.isWall(c + 1, r)) strips.push({ x: p.x + 0.5 - t / 2, z: p.z, sx: t, sz: 1 });
    });

    const stripGeo = new THREE.BoxGeometry(1, 0.02, 1);
    const stripMat = new THREE.MeshStandardMaterial({
      color: COLORS.wallEdge,
      emissive: COLORS.wallEdge,
      emissiveIntensity: 0.6,
    });
    const edges = new THREE.InstancedMesh(stripGeo, stripMat, strips.length);
    edges.name = 'Bordas das paredes';
    const s = new THREE.Vector3();
    const q = new THREE.Quaternion();
    strips.forEach((st, i) => {
      s.set(st.sx, 1, st.sz);
      m.compose(new THREE.Vector3(st.x, h + 0.01, st.z), q, s);
      edges.setMatrixAt(i, m);
    });
    this.group.add(edges);
  }

  #buildDoor() {
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.door,
      emissive: COLORS.door,
      emissiveIntensity: 0.3,
    });
    this.#forEachTile((ch, c, r) => {
      if (ch !== '-') return;
      const door = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 0.2), mat);
      door.name = 'Porta';
      door.position.copy(this.toWorld(c, r, 0.5));
      this.group.add(door);
    });
  }

  #buildPellets() {
    const dots = [];
    const powers = [];
    this.#forEachTile((ch, c, r) => {
      if (ch === '.') dots.push({ c, r });
      if (ch === 'o') powers.push({ c, r });
    });

    // Pastilhas comuns: esferas pequenas instanciadas
    const dotGeo = new THREE.SphereGeometry(SIZES.pelletRadius, 12, 8);
    const dotMat = new THREE.MeshStandardMaterial({
      color: COLORS.pellet,
      emissive: COLORS.pellet,
      emissiveIntensity: 0.25,
      roughness: 0.3,
    });
    const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, dots.length);
    dotMesh.name = 'Pastilhas';
    dotMesh.castShadow = true;
    const m = new THREE.Matrix4();
    dots.forEach(({ c, r }, i) => {
      const p = this.toWorld(c, r, 0.4);
      m.makeTranslation(p.x, p.y, p.z);
      dotMesh.setMatrixAt(i, m);
    });
    this.group.add(dotMesh);

    // Pastilhas de poder: esferas maiores
    const powerGeo = new THREE.SphereGeometry(SIZES.powerRadius, 24, 16);
    const powerMat = dotMat.clone();
    powerMat.emissiveIntensity = 0.5;
    powers.forEach(({ c, r }) => {
      const p = new THREE.Mesh(powerGeo, powerMat);
      p.name = 'Pastilha de poder';
      p.position.copy(this.toWorld(c, r, 0.4));
      p.castShadow = true;
      this.group.add(p);
    });

    this.pelletCount = dots.length;
    this.powerCount = powers.length;
  }
}
