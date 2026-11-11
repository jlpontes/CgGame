import * as THREE from 'three';
import { SIZES } from '../config.js';

export const GHOSTS = [
  { name: 'Blinky', color: 0xff2020 },
  { name: 'Pinky', color: 0xffa8f0 },
  { name: 'Inky', color: 0x20e8ff },
  { name: 'Clyde', color: 0xffaa40 },
];

// Modelo de fantasma: cúpula (meia esfera) + corpo cilíndrico com a
// "saia" ondulada na base, olhos brancos e pupilas azuis.
// A frente do fantasma é o eixo +Z local.
export function createGhost(color, name = 'Fantasma') {
  const r = SIZES.ghostRadius;
  const bodyHeight = 0.42;
  const footY = 0.06; // altura da base acima do chão

  const group = new THREE.Group();
  group.name = name;

  //textura do fantasma
  const loader = new THREE.TextureLoader();
  const ghostTex = loader.load('assets/fantasma.png');
  ghostTex.colorSpace = THREE.SRGBColorSpace;
  ghostTex.wrapS = THREE.RepeatWrapping;
  ghostTex.wrapT = THREE.RepeatWrapping;
  ghostTex.repeat.set(2, 1);

  const bodyMat = new THREE.MeshStandardMaterial({
    map: ghostTex,
    color,
    roughness: 0.4,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  // Cúpula
  const head = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
  head.position.y = footY + bodyHeight;

  // Corpo: cilindro aberto cuja borda inferior é deslocada em ondas
  const radial = 48;
  const bodyGeo = new THREE.CylinderGeometry(r, r, bodyHeight, radial, 1, true);
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) {
      const angle = Math.atan2(pos.getX(i), pos.getZ(i));
      // 8 "pontas" na saia
      pos.setY(i, pos.getY(i) + 0.07 * (1 - Math.abs(Math.cos(angle * 4))));
    }
  }
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = footY + bodyHeight / 2;

  // Olhos
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1638ff, roughness: 0.25 });
  const eyeGeo = new THREE.SphereGeometry(0.115, 16, 12);
  const pupilGeo = new THREE.SphereGeometry(0.058, 12, 8);
  const eyes = new THREE.Group();
  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(eyeGeo, whiteMat);
    white.position.set(side * 0.15, footY + bodyHeight + 0.1, r * 0.78);
    white.scale.set(1, 1.2, 0.8);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.15, footY + bodyHeight + 0.09, r * 0.78 + 0.085);
    eyes.add(white, pupil);
  }

  group.add(head, body, eyes);
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return group;
}
