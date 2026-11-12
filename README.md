# Pac-Man 3D — Computação Gráfica
Joao Pontes;
Nicolas Ramos; 
Danilo Ramos; 
Tales

Jogo Pac-Man em 3D feito com [three.js](https://threejs.org/) (r160), em HTML + módulos ES, sem etapa de build.

## Entregas

| Entrega | Tema | Relatório |
|---|---|---|
| 02 | Modelagem 3D e construção inicial da cena | [docs/relatorio-entrega-02.md](docs/relatorio-entrega-02.md) |
| 03 | Câmeras, projeção perspectiva e iluminação | [docs/relatorio-entrega-03.md](docs/relatorio-entrega-03.md) |
| 04 | Texturas e Materiais | [docs/relatorio-entrega-04.md](docs/relatorio-entrega-04.md) |

As capturas de tela estão em [`docs/capturas/`](docs/capturas/).

**Origem dos modelos:** o Pac-Man e os fantasmas foram modelados pelo grupo em código, a partir de primitivas do three.js (veja `src/models/`). Não usamos modelos externos.

## Como rodar

Os módulos ES não funcionam abrindo o `index.html` direto (`file://`). Sirva a pasta com qualquer servidor estático:

```bash
cd CgGame
python3 -m http.server 8000
# abra http://localhost:8000              (cena do jogo)
#   ou http://localhost:8000/modelos.html (vitrine dos modelos, W = wireframe)
```

(Ou use a extensão *Live Server* do VS Code.) É preciso internet para baixar o three.js do CDN.

## Controles (Entrega 03)

| Tecla | Ação |
|---|---|
| `1` | Câmera **Visão geral** — fixa, alta e inclinada, mostra o labirinto inteiro (fov 45°) |
| `2` | Câmera **Perseguição** — acima e atrás do Pac-Man (fov 55°) |
| `3` | Câmera **Terceira pessoa** — baixa, atrás do Pac-Man, olhando o corredor (fov 70°) |
| `C` | Alterna para a próxima câmera |
| `4` | Liga/desliga a **luz ambiente** (HemisphereLight) |
| `5` | Liga/desliga a **luz direcional** com sombras (DirectionalLight, "luar") |
| `6` | Liga/desliga a **luz pontual** do Pac-Man (PointLight amarela) |

As luzes também podem ser ligadas/desligadas clicando no painel do canto superior esquerdo, que mostra a câmera ativa e o estado de cada luz.

## Estrutura

```
CgGame/
├── index.html            página da cena, import map do three.js e painel (HUD)
├── modelos.html          vitrine dos modelos com grade e eixos
├── css/style.css         estilos da página e do painel
├── docs/                 relatórios das entregas e capturas de tela
└── src/
    ├── main.js           monta a cena, teclas, redimensionamento e loop de render
    ├── vitrine.js        cena da vitrine dos modelos
    ├── config.js         mapa do labirinto (28x31), cores e tamanhos
    ├── scene/
    │   ├── Maze.js       cenário: chão, paredes, porta e pastilhas
    │   ├── Cameras.js    sistema de câmeras + matriz de projeção perspectiva
    │   └── Lights.js     sistema de iluminação (3 fontes)
    └── models/
        ├── Pacman.js     modelo do Pac-Man
        └── Ghost.js      modelo dos fantasmas
```

## Onde está a projeção perspectiva

- **Definição da matriz** — `src/scene/Cameras.js`, função `perspectiveMatrix(fov, aspect, near, far)`: monta a matriz 4×4 explicitamente, com `f = 1/tan(fov/2)` e o `-1` na última linha que leva a profundidade para `w` (divisão perspectiva).
- **Atribuição à câmera** — `applyProjection(camera)` no mesmo arquivo copia o resultado para `camera.projectionMatrix` (e sua inversa). É chamada ao criar cada câmera e em `setAspect()` quando a janela é redimensionada.
- **Aplicação** — `renderer.render(scene, cameras.camera)` no loop de `src/main.js`. O three.js envia `camera.projectionMatrix` ao shader de vértices, onde cada vértice é transformado por `gl_Position = projectionMatrix * modelViewMatrix * position`.
- **Efeito visível** — na câmera 3 (terceira pessoa, fov 70°) as pastilhas do corredor diminuem com a distância e as paredes convergem para o ponto de fuga.

Cada câmera tem fov, near e far próprios, portanto cada uma tem sua própria matriz de projeção. A posição/orientação (matriz de visualização) é atualizada a cada quadro em `CameraSystem.update()`.

## Fontes de luz

Definidas em `src/scene/Lights.js`:

1. **Ambiente** (`HemisphereLight`, azulada de cima, arroxeada de baixo): preenchimento sem direção. Desligada, as regiões que as outras luzes não alcançam ficam pretas.
2. **Direcional** (`DirectionalLight`, "luar"): raios paralelos vindos de cima, iluminam o labirinto todo e projetam as sombras das paredes e personagens (mapa de sombras 2048²).
3. **Pontual** (`PointLight` amarela, filha do Pac-Man): acompanha o personagem e decai com a distância (`decay = 2`), iluminando só a vizinhança dele.

As bordas das paredes e as pastilhas têm um leve brilho próprio (material emissivo), por isso continuam visíveis mesmo com as três luzes desligadas.

## Texturas e Materiais

Os materiais foram aprimorados utilizando `TextureLoader` em conjunto com `MeshStandardMaterial`, permitindo que as texturas (salvas na pasta `assets/`) interajam realisticamente com o sistema de iluminação do jogo. O mapeamento UV foi ajustado proceduralmente para evitar distorções nas primitivas, e as cores base foram redefinidas em `config.js` (`0xdce4f2` para o chão, `0x5282ff` para as paredes, `0xffea75` para o Pac-Man) para garantir contraste e legibilidade adequados sob as luzes dinâmicas.
