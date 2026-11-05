import * as THREE from 'three';

// ===========================================================================
// Sistema de iluminação: três fontes de luz de tipos diferentes, cada uma
// pode ser ligada/desligada individualmente para mostrar sua contribuição.
//
//   4 — Luz ambiente (HemisphereLight): preenchimento suave e sem direção,
//       azulada vinda de cima e escura vinda do chão. Sem ela, as áreas que
//       as outras luzes não alcançam ficam totalmente pretas.
//   5 — Luz direcional (DirectionalLight): "luar" vindo de cima, com raios
//       paralelos. Ilumina o labirinto todo de forma uniforme e projeta as
//       sombras das paredes e dos personagens.
//   6 — Luz pontual (PointLight): brilho amarelo emitido pelo Pac-Man.
//       Acompanha o personagem e decai com a distância, iluminando só a
//       vizinhança dele (paredes próximas ficam amareladas).
// ===========================================================================
export class LightSystem {
  constructor(scene, pacman) {
    // 1) Ambiente / hemisférica
    const ambient = new THREE.HemisphereLight(0x8a9cff, 0x1a0f2e, 0.35);
    ambient.name = 'Luz ambiente';

    // 2) Direcional com sombras
    const sun = new THREE.DirectionalLight(0xc8d6ff, 2.4);
    sun.name = 'Luz direcional';
    sun.position.set(-10, 24, 12);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera; // volume ortográfico que gera o mapa de sombras
    s.left = -19;
    s.right = 19;
    s.top = 19;
    s.bottom = -19;
    s.near = 1;
    s.far = 70;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03; // evita "acne" de sombra nas superfícies curvas
    scene.add(sun.target);

    // 3) Pontual presa ao Pac-Man (filha do grupo, então se move com ele)
    const glow = new THREE.PointLight(0xffd23a, 14, 9, 2);
    glow.name = 'Luz pontual do Pac-Man';
    glow.position.set(0, 1.1, 0);
    glow.castShadow = true;
    glow.shadow.mapSize.set(512, 512);
    glow.shadow.bias = -0.002;
    pacman.add(glow);

    scene.add(ambient, sun);

    this.lights = [
      { key: '4', label: 'Ambiente (hemisférica)', light: ambient },
      { key: '5', label: 'Direcional (luar + sombras)', light: sun },
      { key: '6', label: 'Pontual (brilho do Pac-Man)', light: glow },
    ];
  }

  toggle(i) {
    const entry = this.lights[i];
    if (entry) entry.light.visible = !entry.light.visible;
  }

  // Tecla '4', '5' ou '6' → índice da luz (ou -1)
  indexForKey(key) {
    return this.lights.findIndex((l) => l.key === key);
  }
}
