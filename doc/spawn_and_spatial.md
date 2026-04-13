# Spawns e Inteligência Espacial

O sistema de spawns evoluiu de pontos fixos para um sistema híbrido de regras e geometria.

## Modelos de Spawn (`Spawn`)

- **Tipo `geom` (Point)**: Localização exata de um recurso/NPC usando coordenadas WKT: `POINT(X Y)`.
- **Tipo `rule`**: Define que uma entidade spawna em uma localização conceitual (`locationId`), sem coordenadas fixas. Ideal para jogos procedurais (Valheim).
- **Campos Importantes**:
  - `locationId`: ID da entidade (Bioma/Região) que contém este spawn.
  - `chance`: Probabilidade (0 a 1).
  - `quantity`: Descrição da quantidade (ex: "3-5", "Vários").

## Detecção Espacial (`ApiService.getEntityDetails`)

Quando uma região (Entidade com categoria `biome`/`location`) possui um polígono definido em seu campo `geom` (WKT `POLYGON`), o sistema:
1. Recupera as coordenadas do polígono.
2. Varre todos os spawns globais do tipo `Point`.
3. Utiliza a utilidade `spatial.ts` (`isPointInPolygon`) para verificar quais pontos estão geometricamente dentro da região.
4. Mescla esses pontos detectados com as regras explícitas de `potentialSpawns`.

---
**Utilidade `spatial.ts`**: Implementa o algoritmo de Ray Casting para garantir performance mesmo com polígonos complexos.
