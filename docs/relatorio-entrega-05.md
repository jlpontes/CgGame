# Relatório — Entrega 05: Jogabilidade, Interação e Pontuação

**Projeto:** Pac-Man 3D
**Tecnologia:** Three.js r160 (WebGL), HTML + módulos ES, sem etapa de build
**Como executar:** `python3 -m http.server 8000` na pasta do projeto e abrir `http://localhost:8000`
**Branch:** `entrega-05-jogabilidade`

## 1. Evolução em relação à Entrega 04

Até a Entrega 04 a cena era estática (modelos, câmeras, luzes, texturas). Nesta entrega o projeto virou um jogo jogável, sem alterar a parte visual já pronta.

|  | Entrega 04 | Entrega 05 |
|---|---|---|
| Pac-Man | Parado na posição inicial | **Controlado pelo jogador** (setas/WASD), com boca animada |
| Fantasmas | Parados | **IA própria** (perseguir, dispersar, assustados, comidos) |
| Pastilhas | Decorativas | **Coletáveis**: somem ao serem comidas e dão pontos |
| Colisão | Inexistente | Paredes (grade) e Pac-Man × fantasmas |
| Placar / fim de jogo | Inexistente | Pontos, recorde, vidas, nível, vitória e game over |

## 2. Movimentação e controles

| Tecla | Ação |
|---|---|
| `←` `↑` `→` `↓` ou `A` `W` `D` `S` | Move o Pac-Man |
| `P` / `Espaço` | Pausa / continua |
| `R` | Reinicia a partida |
| `Enter` | Começa / próximo nível (após vencer) / jogar de novo (após game over) |
| `M` | Liga/desliga o som |
| `1` `2` `3` / `C`, `4` `5` `6` | Câmeras e luzes (Entregas 03) |

- O Pac-Man anda sozinho em linha reta e **vira nas esquinas** quando a direção pedida estiver livre. A direção pedida fica guardada até a próxima esquina (buffer de curva), o que deixa o controle responsivo. **Dar meia-volta** funciona a qualquer momento.
- Na **câmera 3 (terceira pessoa)** os controles são relativos ao personagem: `↑` segue em frente, `←`/`→` viram à esquerda/direita dele e `↓` dá meia-volta.
- **Túnel lateral:** sair por um lado leva ao lado oposto (teletransporte).
- A velocidade usa o tempo real de cada quadro (`dt`), então o jogo roda igual em qualquer taxa de FPS.

## 3. Interações, colisão e regras

- **Colisão com paredes:** o labirinto é uma grade (`MAZE_LAYOUT`). O movimento acontece entre centros de células e só entra numa célula livre (`src/game/Movement.js`, função `advance`). Isso evita atravessar parede.
- **Coleta:** ao passar pela célula, a pastilha é removida do estado do jogo e do cenário 3D (instância escondida). As pastilhas de poder pulsam.
- **Colisão com fantasmas:** distância entre centros menor que 0,7 célula (`#checkCollisions`).
- **Pastilha de poder:** os fantasmas ficam azuis, invertem o sentido e passam a fugir por ~7 s (barra de tempo na tela, piscam nos 2 s finais). Se o Pac-Man encosta num fantasma assustado, ele é comido: só os olhos voltam para a casa e o fantasma renasce.
- **Encostar num fantasma normal:** perde uma vida, toca a animação de morte e a rodada recomeça (pastilhas e pontos permanecem).
- **Inteligência dos fantasmas** (`#ghostTarget`), como no jogo original: alternam entre *dispersar* (cada um vai para um canto) e *perseguir* a cada poucos segundos.
  - **Blinky** persegue o Pac-Man diretamente;
  - **Pinky** mira 4 células à frente;
  - **Inky** usa o reflexo de Blinky em torno de 2 células à frente do Pac-Man;
  - **Clyde** persegue de longe e foge para o canto quando está perto.
  - Saem da casa em tempos diferentes (0, 2, 5 e 8 s).
- **Dificuldade crescente:** a cada nível a velocidade aumenta 5% e o efeito do poder dura menos.

## 4. Sistema de pontuação

| Evento | Pontos |
|---|---|
| Pastilha comum | 10 |
| Pastilha de poder | 50 |
| Fantasma comido (sequência no mesmo poder) | 200 → 400 → 800 → 1600 |
| Vida extra | ao atingir 10 000 pontos |

O placar fica no topo da tela: **Pontos, Recorde, Nível, Pastilhas restantes e Vidas**. O recorde fica salvo no navegador (`localStorage`). Pontos de fantasmas aparecem flutuando sobre eles (`+200`, ...).

## 5. Vitória, derrota e reinício

- **Vitória:** comer todas as pastilhas → tela "VOCÊ VENCEU!" com a pontuação; `Enter` segue para o próximo nível (mais rápido), mantendo os pontos.
- **Derrota:** perder as 3 vidas → tela "GAME OVER" com pontuação e recorde.
- **Reiniciar:** `R` a qualquer momento ou `Enter` na tela final.
- Há ainda telas de "PRONTO!" (antes de começar) e "PAUSADO".

## 6. Arquitetura (arquivos novos/alterados)

```
src/game/Movement.js   grade, colisão com parede, túnel, BFS de distâncias (lógica pura)
src/game/Game.js       regras: estado, pontos, vidas, IA dos fantasmas, vitória/derrota (lógica pura)
src/game/Sfx.js        efeitos sonoros sintetizados (Web Audio, sem arquivos)
src/main.js            (alterado) controles, HUD, sincronização com a cena 3D
src/scene/Maze.js      (alterado) esconder/restaurar pastilhas e animação das pastilhas de poder
src/models/*.js        (alterado) expõem mandíbulas/material para animação
index.html, css/       (alterado) placar, mensagens e barra de poder
tests/game.test.mjs    testes automáticos da lógica
```

A lógica do jogo não depende do three.js: `Game.js` só guarda o estado e `main.js` o desenha. Isso permitiu testar as regras no Node (`node --test tests/`):

- Pac-Man não atravessa parede e o túnel teletransporta;
- comer pastilhas soma pontos;
- pastilha de poder assusta e fantasma comido vale 200;
- encostar num fantasma tira uma vida e acaba o jogo ao zerar as vidas;
- comer a última pastilha vence;
- simulação de 2 minutos com entradas aleatórias: ninguém entra em parede e todos os fantasmas saem da casa.

## 7. Roteiro sugerido para o vídeo de demonstração

1. Mostrar a tela "PRONTO!" e iniciar movendo com as setas; mostrar a boca animada, a curva nas esquinas e a colisão com a parede.
2. Comer pastilhas e mostrar o placar subindo e as pastilhas sumindo; passar pelo túnel lateral.
3. Trocar de câmera (`1`, `2`, `3`) e mostrar os controles relativos na terceira pessoa.
4. Comer uma pastilha de poder: fantasmas azuis, barra de tempo, comer um fantasma (`+200`, `+400`...).
5. Ser pego por um fantasma: animação de morte e vida a menos; repetir até **GAME OVER**; reiniciar com `R`.
6. Mostrar a **vitória**: digitar `demoVitoria()` no console do navegador (deixa só as 3 pastilhas mais próximas) e comê-las.
7. Mostrar `P` (pausa) e `M` (som).
