# Estrutura de Dados e Carregamento

O front não carrega mais arquivos de dados: todas as telas leem a API do backend (`src/api`). O formato dos
documentos da API está em `backend/README.md`.

## Acervo antigo (fora do repositório)

Os JSON e as imagens do modelo antigo saíram de `public/` e estão em `C:\Dev\game-planner-data`, fonte para o
script de importação na base:

- `data/games.json`: lista global de jogos.
- `data/[gameId]/`: um diretório por jogo (`maps.json`, `items/`, `recipes.json`, `entity/`, `spawns.json`,
  `categories/`, `conjuntos/`, `events.json`...). Vários tipos são divididos em arquivos por tema com um
  `manifest.json`.
- `data/codes/`: códigos de resgate por mês, com `manifest.json`.
- `img/`, `icon/`, `map/`: imagens, ícones e mapas/tiles. Os JSON apontam para eles com caminhos relativos à raiz
  do acervo, com ou sem `/` inicial (`/img/heartopia/logo.png` ou `img/heartopia/logo.png`).

O histórico desses arquivos continua no git deste repositório (até o commit `4a5c031`).

Em `public/` ficam só assets da aplicação (`vite.svg`, `img/add.png`).

---
**Padrão de IDs**: IDs devem ser únicos preferencialmente no formato `tipo_nome` (ex: `spawn_coal_node`, `biome_meadows`).
