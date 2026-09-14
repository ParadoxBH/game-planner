# Estrutura de Dados e Carregamento

O Game Planner utiliza um sistema descentralizado de arquivos JSON para facilitar a manutenção e escalabilidade.

## Organização de Arquivos

### 1. `public/data/games.json`
Contém apenas a lista global de jogos e seus metadados básicos (ID, Nome, Descrição, Thumbnail). **Não deve conter detalhes de mapas ou receitas.**

### 2. Diretórios por Jogo (`public/data/[gameId]/`)
Cada jogo tem sua própria pasta contendo:
- `maps.json`: Especificações de todos os mapas disponíveis para o jogo.
- `items.json` ou pasta `items/`: Dicionário de itens.
- `recipes.json`: Lista de receitas/crafting.
- `entity.json`: Entidades, NPCs, Inimigos e Regiões.
- `spawns.json`: Localização ou regras de spawn.

## Uso dos arquivos

O front não carrega mais estes arquivos: todas as telas leem a API do backend (`src/api`), e o antigo
carregamento por `dataLoader.ts`, `useApi` e o cache Dexie foi removido. Os JSON continuam no repositório
como fonte dos dados para importar na API; o formato dos documentos da API está em `backend/README.md`.

---
**Padrão de IDs**: IDs devem ser únicos preferencialmente no formato `tipo_nome` (ex: `spawn_coal_node`, `biome_meadows`).
