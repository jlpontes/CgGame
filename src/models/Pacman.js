import * as THREE from 'three';
import { COLORS, SIZES } from '../config.js';

// Modelo do Pac-Man: uma esfera dividida em dois hemisférios (as "mandíbulas").
// A boca abre para o eixo +X local; girar o grupo em Y muda para onde ele olha.
export function createPacman({ mouthAngle = 0.4 } = {}) {
  const r = SIZES.pacmanRadius;
  const group = new THREE.Group();
  group.name = 'Pac-Man';

  //textura do pacman
  const loader = new THREE.TextureLoader();
  const pacmanTex = loader.load('assets/pacman.jpg');
  pacmanTex.colorSpace = THREE.SRGBColorSpace;

  const bodyMat = new THREE.MeshStandardMaterial({ map: pacmanTex, color: 0xffea75, roughness: 0.35, metalness: 0.05 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x7a1010, roughness: 0.8, side: THREE.DoubleSide });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

  // Mandíbula superior: hemisfério de cima + tampa (interior da boca)
  const upper = new THREE.Group();
  const upperShell = new THREE.Mesh(
    new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    bodyMat,
  );
  const upperCap = new THREE.Mesh(new THREE.CircleGeometry(r, 40), mouthMat);
  upperCap.rotation.x = Math.PI / 2; // virada para baixo
  upper.add(upperShell, upperCap);

  // Olhos na mandíbula superior
  const eyeGeo = new THREE.SphereGeometry(0.06, 12, 8);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(r * 0.45, r * 0.72, side * r * 0.42);
    upper.add(eye);
  }

  // Mandíbula inferior: hemisfério de baixo + tampa
  const lower = new THREE.Group();
  const lowerShell = new THREE.Mesh(
    new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    bodyMat,
  );
  const lowerCap = new THREE.Mesh(new THREE.CircleGeometry(r, 40), mouthMat);
  lowerCap.rotation.x = -Math.PI / 2; // virada para cima
  lower.add(lowerShell, lowerCap);

  // Abertura da boca: gira cada mandíbula em torno do eixo Z (dobradiça)
  upper.rotation.z = mouthAngle;
  lower.rotation.z = -mouthAngle;

  // Pivô no centro da esfera, elevado para apoiar no chão
  const body = new THREE.Group();
  body.position.y = r;
  body.add(upper, lower);
  group.add(body);

  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return group;
}
