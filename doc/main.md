# Game Planner - Arquitetura e Especificações

Este diretório contém a documentação técnica do sistema, desenhada para auxiliar tanto desenvolvedores quanto assistentes de IA a entenderem o funcionamento do projeto.

## Índice de Documentação

1. [Estrutura de Dados e Carregamento](./data_structure.md)
   - Organização de arquivos JSON (`games.json`, `maps.json`).
   - Manifestos e carregamento dinâmico.

2. [Sistema de Mapas e Dashboard](./map_and_dashboard.md)
   - Tipos de mapa (Fixo, Layered, Tile, Procedural).
   - Alternância entre visão geográfica e Dashboard analítico.

3. [Spawns e Inteligência Espacial](./spawn_and_spatial.md)
   - Sistema de spawns baseado em regras vs. pontos fixos.
   - Lógica de detecção de pontos dentro de polígonos (Spatial detection).

4. [Hierarquia e Entidades](./hierarchy.md)
   - Relação entre Biomas, Regiões e Pontos de Interesse (parentId).
   - Definição de recursos potenciais.

---
**Dica para IA**: Sempre consulte esses arquivos ao propor alterações no motor de dados ou na renderização de mapas para garantir consistência com os padrões estabelecidos.
