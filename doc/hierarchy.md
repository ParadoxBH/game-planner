# Hierarquia e Entidades

Para suportar exploração multinível, o sistema utiliza relações de parentesco entre entidades.

## Hierarquia de Localização

As entidades podem ser organizadas de forma aninhada usando o campo `parentId`.

**Exemplo Valheim**:
- `biome_black_forest` (Pai: null)
  - `poi_burial_chambers` (Pai: `biome_black_forest`)
    - `skeleton` (Via spawn rule dentro de `poi_burial_chambers`)

## Campos de Entidade Expandidos

- `parentId`: ID da entidade pai.
- `category`: Array de strings (ex: `["biome", "location"]`). Fundamental para o Dashboard saber o que renderizar como card.
- `potentialSpawns`: Lista de entidades que *podem* aparecer nesta localização, mesmo que não haja um ponto geográfico fixo.
- `geom`: Geometria WKT que define a área da entidade (Polygon) ou sua localização (Point).

---
**Interface**: O `ApiService` resolve automaticamente os `parent` e `children` ao retornar os detalhes de uma entidade, permitindo navegação "breadcrumbs" fluida.
