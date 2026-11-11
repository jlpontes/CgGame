# Relatório — Entrega 04: Texturas e Materiais

**Projeto:** Pac-Man 3D
**Tecnologia:** Three.js r160 (WebGL), com HTML e módulos ES, sem etapa de build
**Como executar:** `python3 -m http.server 8000` na pasta do projeto e abrir `http://localhost:8000`

## 1. Evolução em relação à Entrega 03

Na Entrega 03, o projeto contava com modelos 3D sólidos e coloridos através da propriedade `color` dos materiais, iluminados por três fontes de luz distintas. Nesta entrega, o foco foi a aplicação de texturas e materiais aos elementos do jogo.

| | Entrega 03 | Entrega 04 |
|---|---|---|
| Materiais base | Cores sólidas via `MeshStandardMaterial` | **Aplicação de texturas via `TextureLoader`** sobre o `MeshStandardMaterial` |
| Cenário | Chão azul escuro e paredes azuis lisas | **Chão com textura de blocos escuros** e **Paredes com textura de concreto** |
| Personagens | Cores sólidas (Amarelo, Vermelho, Rosa, Ciano, Laranja) | **Pac-Man com textura de tecido** e **Fantasmas com textura de tecido/plástico**, mantendo as cores originais |
| Desempenho | Leve (sem dependências externas) | **Manteve-se leve**: não utilizamos `.gltf` ou modelos do Blender, optando pelo mapeamento direto nas primitivas do WebGL |

Commits desta etapa: (adicionar o hash do seu commit aqui, ex: `a1b2c3d`) adicionando texturas ao cenário e personagens.

## 2. Múltiplas Texturas e Aplicação

Foram utilizadas quatro texturas no formato de imagem (salvas na nova pasta `assets/`), superando a exigência mínima de três texturas diferentes:

*   **Chão:** `assets/chao.jpg` (imagem de painéis quadrados/blocos escuros).
*   **Paredes:** `assets/parede.jpg` (imagem de concreto).
*   **Pac-Man:** `assets/pacman.jpg` (tecido com trama visível).
*   **Fantasmas:** `assets/fantasma.jpg` (textura neutra em escala de cinza aplicada sobre os quatro personagens).

**Abordagem Técnica:**
Em vez de importar modelos pesados do Blender com texturas já embutidas, optamos por utilizar o `THREE.TextureLoader()`. Carregamos os arquivos `.jpg` e aplicamos na propriedade `map` dos nossos `MeshStandardMaterial` já existentes. Essa abordagem manteve o código limpo, o carregamento instantâneo e demonstrou domínio sobre os materiais nativos do Three.js.

## 3. Mapeamento de Texturas (Coordenadas UV)

As primitivas do Three.js (`PlaneGeometry`, `SphereGeometry`, `CylinderGeometry`, `BoxGeometry`) já geram coordenadas UV automaticamente entre 0.0 e 1.0. No entanto, para evitar que as texturas ficassem excessivamente esticadas ou distorcidas, manipulamos as propriedades de mapeamento:

*   **Chão (`PlaneGeometry` de 30x33 unidades):**
    Para que os blocos da imagem de textura tivessem o tamanho correto em relação ao labirinto, ativamos a repetição da textura usando `THREE.RepeatWrapping` nas coordenadas S (U) e T (V). Ajustamos a escala com `floorTex.repeat.set(this.cols / 2, this.rows / 2)`, garantindo uma proporção visual adequada para o tamanho da grade.
*   **Fantasmas (`CylinderGeometry`):**
    O corpo dos fantasmas é um cilindro. Para que a textura não ficasse espichada verticalmente, aplicamos um `ghostTex.repeat.set(2, 1)`, duplicando o padrão ao longo da circunferência.
*   **Paredes (`BoxGeometry`):**
    A geometria da caixa já mapeia a imagem completa para cada face. Como nossos blocos de parede são cúbicos (1x1x1), a textura de concreto se encaixou perfeitamente em cada segmento da parede sem necessidade de alteração na escala UV.

## 4. Integração com a Iluminação e Multiplicação de Cor

O requisito mais complexo desta entrega foi garantir que as texturas interagissem com a iluminação desenvolvida na Entrega 03. O uso do `MeshStandardMaterial` resolveu essa questão de forma nativa.

**Interação com as Luzes:**
Como as texturas foram injetadas no canal de diffuse (`map`), o motor de renderização do WebGL continuou calculando fisicamente como as três fontes de luz (Hemisférica, Direcional com sombras e Pontual atrelada ao Pac-Man) interagem com o material. As texturas escurecem nas áreas de sombra e ganham brilho especular onde a luz incide diretamente.

**Multiplicação de Cor (O truque dos Fantasmas e Cenário):**
Ao aplicar uma textura e uma cor base (`color`) simultaneamente num material, o WebGL multiplica os valores dos pixels da imagem pela cor. Utilizamos isso a nosso favor:
*   **Paredes e Fantasmas:** Baixamos imagens em escala de cinza (textura de concreto e textura granulada). Ao combiná-las com as cores originais do código (`COLORS.wall` e as cores de Blinky, Pinky, Inky e Clyde), as texturas brancas/cinzas assumiram magicamente as cores exatas do jogo, permitindo usar o mesmo arquivo `fantasma.jpg` para criar quatro fantasmas de cores diferentes.
*   **Chão e Pac-Man:** Mudamos a cor base do material de volta para branco (`0xffffff`) nos arquivos `Maze.js` e `Pacman.js` para garantir que as texturas do piso escuro e do tecido dourado fossem renderizadas com suas cores originais, sem interferência.

## 5. Próximos Passos (Projeto Final)

Com o visual do jogo totalmente definido e texturizado, o próximo passo lógico é a implementação das mecânicas ativas:
*   Movimentação contínua do Pac-Man pelo teclado.
*   Verificação de colisão e bloqueio de caminho contra as paredes.