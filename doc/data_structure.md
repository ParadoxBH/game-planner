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

## Mecanismos de Carregamento (`dataLoader.ts`)

- **Manifesto**: O sistema tenta carregar um manifesto para listar múltiplos arquivos de uma categoria.
- **Fallback**: Se o manifesto não existir, ele tenta carregar o arquivo `.json` padrão da categoria.
- **Maps**: O hook `useApi` carrega o arquivo `maps.json` automaticamente e o mescla ao estado global do jogo selecionado.

---
**Padrão de IDs**: IDs devem ser únicos preferencialmente no formato `tipo_nome` (ex: `spawn_coal_node`, `biome_meadows`).
