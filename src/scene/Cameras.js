import * as THREE from 'three';

// ===========================================================================
// PROJEÇÃO PERSPECTIVA
// ---------------------------------------------------------------------------
// A matriz de projeção é DEFINIDA aqui, explicitamente, a partir do campo de
// visão vertical (fov), da razão de aspecto e dos planos near/far.
//
//            | f/aspect  0        0                  0             |
//      P =   | 0         f        0                  0             |
//            | 0         0   (far+near)/(near-far)  2*far*near/(near-far) |
//            | 0         0       -1                  0             |
//
//      onde f = 1 / tan(fov / 2)
//
// O "-1" na última linha copia -z (a profundidade do ponto no espaço da
// câmera) para w. Na divisão perspectiva (x/w, y/w), objetos mais distantes
// têm w maior e ficam menores na tela; objetos próximos ficam maiores.
// ===========================================================================
export function perspectiveMatrix(fovDeg, aspect, near, far) {
  const f = 1 / Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const m = new THREE.Matrix4();
  // Matrix4.set recebe os valores linha a linha
  m.set(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), (2 * far * near) / (near - far),
    0, 0, -1, 0,
  );
  return m;
}

// Aplica a matriz de projeção na câmera. O three.js envia
// camera.projectionMatrix ao shader de vértices como o uniform
// "projectionMatrix", onde é APLICADA a cada vértice:
//
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//
// (ver renderer.render(scene, camera) no loop em main.js)
function applyProjection(camera) {
  camera.projectionMatrix.copy(perspectiveMatrix(camera.fov, camera.aspect, camera.near, camera.far));
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

// ===========================================================================
// Sistema de câmeras: três pontos de vista, todos em projeção perspectiva,
// cada um com seu próprio fov / near / far (portanto sua própria matriz P).
// ===========================================================================
export class CameraSystem {
  constructor(aspect) {
    this.views = [
      {
        name: 'Visão geral',
        camera: new THREE.PerspectiveCamera(45, aspect, 0.5, 200),
        // Câmera fixa, alta e inclinada, enquadrando o labirinto inteiro
        update: (cam) => {
          const k = Math.max(1, 1.25 / cam.aspect); // afasta em telas estreitas
          cam.position.set(0, 33 * k, 19 * k);
          cam.lookAt(0, 0, 1);
        },
      },
      {
        name: 'Perseguição',
        camera: new THREE.PerspectiveCamera(55, aspect, 0.5, 200),
        // Acima e atrás do Pac-Man, olhando para ele
        update: (cam, target) => {
          cam.position.set(target.position.x, 10, target.position.z + 8);
          cam.lookAt(target.position.x, 0, target.position.z - 1);
        },
      },
      {
        name: 'Terceira pessoa',
        camera: new THREE.PerspectiveCamera(70, aspect, 0.05, 100),
        // Baixa, logo atrás do Pac-Man, olhando para onde ele está virado.
        // Mostra bem a perspectiva: pastilhas próximas grandes, distantes pequenas.
        update: (cam, target) => {
          const yaw = target.rotation.y;
          const forward = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
          const p = target.position;
          cam.position.copy(p).addScaledVector(forward, -2.2).setY(1.3);
          cam.lookAt(p.x + forward.x * 6, 0.35, p.z + forward.z * 6);
        },
      },
    ];

    this.views.forEach((v) => {
      v.camera.name = v.name;
      applyProjection(v.camera);
    });
    this.index = 0;
  }

  get active() {
    return this.views[this.index];
  }

  get camera() {
    return this.active.camera;
  }

  select(i) {
    if (i >= 0 && i < this.views.length) this.index = i;
  }

  next() {
    this.index = (this.index + 1) % this.views.length;
  }

  // Nova razão de aspecto (redimensionamento da janela): recalcula P
  setAspect(aspect) {
    this.views.forEach((v) => {
      v.camera.aspect = aspect;
      applyProjection(v.camera);
    });
  }

  // Atualiza a posição/orientação (matriz de visualização) da câmera ativa
  update(target) {
    this.active.update(this.camera, target);
  }
}
