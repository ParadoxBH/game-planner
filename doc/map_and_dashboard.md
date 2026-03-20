# Sistema de Mapas e Dashboard

O sistema de visualização é dividido em duas frentes: Geográfica (Mapa) e Analítica (Dashboard).

## Tipos de Mapa (`MapMetadata`)

1. **`single`**: Uma única imagem estática.
2. **`layered`**: Múltiplas imagens sobrepostas (ex: Satisfactory com cavernas).
3. **`tile`**: Sistema de tiles (Google Maps style) para mapas massivos.
4. **`procedural`**: Mapas sem representação geográfica fixa. Abrem por padrão no Dashboard.

## MapDashboard.tsx

O Dashboard é gerado automaticamente para qualquer mapa. Ele processa as entidades da categoria `location`, `biome` ou `poi` e exibe:
- Descrição da região.
- Recursos que podem aparecer lá (via `potentialSpawns` ou detecção espacial).
- Sub-regiões navegáveis.

## Configuração de Visão (`maps.json`)

```json
{
  "type": "procedural",
  "defaultView": "dashboard",
  "availableViews": ["map", "dashboard"]
}
```

- `defaultView`: Qual aba abrir primeiro.
- `availableViews`: Quais abas mostrar no alternador de topo.

---
**Renderização**: O componente `MapView.tsx` gerencia a alternância de estado e o redimensionamento do Leaflet ao trocar de abas.
