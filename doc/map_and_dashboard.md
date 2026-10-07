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

## Atalhos

Atalho (`/shortcuts`) liga dois pontos, no mesmo mapa ou em mapas diferentes, de ida e volta ou só de ida. O
mapa busca os atalhos com alguma ponta nele (`map equal`), desenha cada ponta que está ali e, com as duas no mesmo
mapa, uma linha tracejada entre elas. O popup diz aonde o atalho leva, os requisitos e o desbloqueio, e "Seguir o
atalho" abre o mapa da outra ponta (quando é outro) e aproxima nela. O tipo "Atalhos" no filtro liga e desliga a
camada, e começa sempre ligado.

Quem edita cria pelo botão direito ("Adicionar atalho": a origem é o ponto clicado). No formulário, "Marcar no
mapa" esconde a janela, abre o mapa daquela ponta e espera o clique (Esc desiste); as coordenadas também podem ser
digitadas.

---
**Renderização**: O componente `MapView.tsx` gerencia a alternância de estado e o redimensionamento do Leaflet ao trocar de abas.
