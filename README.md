# Pac-Man 3D — Computação Gráfica

Jogo Pac-Man em 3D feito com [three.js](https://threejs.org/) (r160), em HTML + módulos ES, sem etapa de build.

## Como rodar

Os módulos ES não funcionam abrindo o `index.html` direto (`file://`). Sirva a pasta com qualquer servidor estático:

```bash
cd CgGame
python3 -m http.server 8000
# abra http://localhost:8000
```

(Ou use a extensão *Live Server* do VS Code.) É preciso internet para baixar o three.js do CDN.
