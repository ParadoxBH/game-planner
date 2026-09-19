# Backend — Análise e Plano

Documento de planejamento do servidor Java/Spring/Postgres do Game Planner.
Escrito a partir da análise do front atual (`src/`) e da base em `public/data/` (hoje fora do repositório,
em `C:\Dev\game-planner-data`).

---

## 1. Decisões fechadas

| Tema | Decisão |
|---|---|
| Escopo v1 | Leitura pública + **escrita autenticada** |
| Fonte da verdade | **Postgres.** Os JSONs viram histórico. O parser de carga é escrito **por fora** e sobe os dados via API |
| Integridade | **Nenhuma chave artificial e nenhuma FK entre conteúdos.** Referência a registro inexistente é estado normal do sistema |
| Identidade de linha-filha | **Posicional**: `(pai, ordinal)`. O mesmo alvo pode se repetir — é mecânica de jogo, não erro (ver 3.7) |
| Permissão | Usuário é **global**; permissão é **por jogo**, em dois campos independentes: `read_policy` e `write_policy` |
| Cadastro | **Aberto**, mas só usuário com flag `verified` edita jogo comunitário |
| Histórico | `content_revision` com **snapshot completo do agregado e restore** |
| Modelo de dados | **Desenhado para o domínio.** Não replica o formato do front nem o dos JSONs |
| Ambiente local | Docker Compose (Postgres + PostGIS) |
| Produção | Docker em VPS Ubuntu na Hostinger. Local até lá |
| Layout do repo | Front na raiz, `backend/` ao lado. Continua da branch `origin/backend` |
| Tipos de coluna | **Todo campo de texto é `text`**, nunca `varchar` ou variação. Conferido por teste (`SchemaConventionsTest`). As únicas exceções são tabelas que não são nossas: controle do Flyway e catálogo do PostGIS |
| Mídia ↔ conteúdo | Tabela de relacionamento `content_media`, **sem chave estrangeira**: a ligação pertence ao código do registro, e imagens podem ser anexadas antes de o registro existir. Vale também para o próprio jogo (ver 4.7) |
| Loja | **Três informações:** a loja, as categorias da loja e os itens de cada categoria. A categoria aponta para a loja pelo código |
| Receita | Nome **opcional** (exibição e busca usam o do primeiro produto). Desbloqueio como lista tipada `{ type, target, value }` |
| Requisito de entidade | Lista `requirements` na entidade, com `notConsumed`: energia é gasta, machado não |
| Mundo | Geometria em **WKT** na API (SRID 0, com ou sem Z). Mapa com exibição **tipada**. Ponto de spawn pode não ter posição quando está ligado a um local. Clima é evento: **sem tabela de condição** |
| Coleções e códigos | Grupo de coleção tem código próprio e **lista de coleções** (16 dos 32 grupos estão em duas). Código de resgate é identificado pelo **próprio código** |
| Árvore de crafting | Crafta quando há receita (loja fica como alternativa, escolha "buy"). Categoria sem escolha fica **em aberto**. Moeda que é conteúdo **vira nó filho** e desce. Lotes e pacotes **sempre inteiros**; o que sobra vai para o estoque e é usado antes de craftar ou comprar de novo |

---

## 2. Os três princípios

### 2.1 Referência nunca exige existência

Toda referência de um conteúdo a outro é **textual**:

```
(game_id, target_kind, target_ext_id)
```

Sem FK. Sem id resolvido. Sem tabela de resolução. Apontar para algo que ainda não foi
cadastrado é o **comportamento esperado**, não um erro a reportar.

Isso inverte o que normalmente se faz e é a decisão certa aqui: a base é montada de fora
para dentro, um item de cada vez, e a maior parte das referências vai nascer apontando
para o vazio. Uma FK estrita transformaria cada cadastro numa negociação com o banco.

**O que ganhamos de graça com isso** — e que vira funcionalidade de produto:

- `GET /games/{g}/pending-references` — toda referência que aponta para registro
  inexistente, **agrupada e ordenada pela quantidade de vezes que é citada**. É uma fila
  de trabalho priorizada: o que mais falta cadastrar aparece primeiro.
- Acessar um id não cadastrado devolve `404` com a lista de **quem aponta para ele**, para
  o front abrir a tela de cadastro já sabendo o contexto (o nome que as origens usam, o
  tipo provável, quantas receitas dependem dele).

### 2.2 Identidade é natural

A identidade de todo conteúdo é `(game_id, ext_id)` dentro do seu tipo. Nada de
`bigserial`. O id que você escreve no cadastro é o id que existe no banco, aparece na URL
e é citado nas referências.

Lembrando o que a análise mostrou (seção 3.1): o mesmo `ext_id` se repete entre tipos
diferentes — `samambaia_selvagem` é item **e** entidade. Por isso o tipo entra na
identidade: `(game_id, kind, ext_id)`.

### 2.3 O modelo é do domínio, não do front

O formato atual dos JSONs é resultado de raspagem e de decisões de renderização. O schema
novo não o copia. A seção 4 lista campo a campo o que muda e por quê.

---

## 3. Achados da análise que condicionam o desenho

### 3.1 IDs não são únicos entre tipos

| Jogo | ids distintos | colidem entre tipos |
|---|---|---|
| heartopia | 1.311 | **99** |
| windrose | 209 | **126** |
| satisfactory | 170 | 3 |
| outward | 6.125 | 1 |
| valheim | 874 | 0 |

`samambaia_selvagem` é item e entidade. `cogumelo_assado` é item e categoria. Em windrose
quase toda receita reusa o id do produto. É intencional na maioria dos casos — o nó
coletável e o item que ele larga têm o mesmo nome.

O front resolve isso por tentativa e erro: `apiService` mantém um
`lookupCache: Map<string, "item"|"entity">` e o `getEntityDetails` faz
`entityRepository.getById(x) || itemRepository.getById(x)`. No modelo novo o tipo é
explícito na referência e a ambiguidade some.

### 3.2 Três campos de `Entity` estão mortos

Contagem sobre a base real:

| Jogo | entidades | com `geom` | com `parentId` | com `potentialSpawns` |
|---|---|---|---|---|
| heartopia | 103 | 0 | 0 | 0 |
| outward | 612 | 0 | 0 | 0 |
| valheim | 92 | 0 | 0 | 0 |
| windrose | 18 | 0 | 0 | 0 |

Toda localização mora em `referencePoints`, com `type` em `location|biome|poi|rule`
(heartopia: 38 locations; valheim: 10 biomes, 1 poi, 2 rules).

Duas consequências: `doc/hierarchy.md` descreve um mecanismo de hierarquia por
`Entity.parentId` que **nunca foi usado**, e o ramo espacial de `getEntityDetails`
(`if (entity.geom?.type === "Polygon")`) **nunca executa**. O modelo novo separa
`entity` de `location` e resolve a duplicidade.

### 3.3 A lógica de domínio virou full scan no navegador

`getItemDetails` carrega **todas** as receitas, normaliza cada uma e só então filtra as que
produzem um item; depois varre todas as entidades e todos os pontos atrás de drops.
São consultas triviais em SQL. É a maior parte do que o backend absorve.

### 3.4 Vazamento de camada no front

16 componentes importam `repositories/*` direto, pulando o `apiService` (`MapView` chama
sete `getAll()` seguidos). Trocar Dexie por HTTP não é trocar um arquivo. Por isso a
migração do front é fase separada.

### 3.5 Escala é pequena

~12.200 registros, 10,7 MB de JSON, 2.354 pontos no maior mapa. Não há problema de
performance a resolver; há problema de **modelagem, integridade e edição**.

### 3.6 Os 108 MB de imagens ficam estáticos

4.002 arquivos em `img|map|icon` (antes em `public/`, hoje em `C:\Dev\game-planner-data`). Os bytes nunca entram no Postgres — no máximo os
metadados, se o acervo for migrado para o subsistema de mídia (4.7).

### 3.7 Repetir o mesmo alvo é mecânica de jogo, não erro de dado

Contei as repetições de `(pai, alvo)` na base real: 116 receitas do Outward com
ingrediente repetido, e um drop repetido em heartopia. Todas legítimas. São **duas
mecânicas diferentes**, e o modelo tem que expressar as duas:

**1. Slot de bancada — Outward, 116 receitas.** A bancada aceita um item por slot, como
Minecraft. Quatro slots com "Pedra de mana" são quatro linhas de `amount: 1`, não uma de
`amount: 4`:

```json
"ingredients": [
  { "id": "6400130", "name": "Pedra de mana", "amount": 1 },
  { "id": "6400130", "name": "Pedra de mana", "amount": 1 },
  { "id": "6400130", "name": "Pedra de mana", "amount": 1 },
  { "id": "6400130", "name": "Pedra de mana", "amount": 1 }
]
```

Heartopia não funciona assim — lá a quantidade é um número só. As duas formas convivem.

**2. Tabela de drop é uma lista com chance por entrada.** Cada entrada tem seu próprio %
de sair, e o mesmo alvo pode aparecer em mais de uma entrada. Uma criatura do Outward tem
3 drops com 100% e 2 drops com 33%. `pink_bubble` tem `estrela_desejavel` em duas
entradas, uma de 5 e outra de 10 unidades. Não há agrupamento, nem soma, nem exclusão
mútua a modelar: é a lista e as chances.

Consequências no modelo:

- **A chave da linha-filha é posicional**: `(game_id, pai_ext_id, ordinal)`. O alvo sai da
  chave, porque ele legitimamente se repete. O `ordinal` é o slot no caso 1 e a ordem da
  entrada no caso 2.
- **`chance` é por entrada**, não do alvo. Duas entradas do mesmo item com chances
  diferentes são duas linhas, e é assim que se lê.

Chave posicional combina com o desenho de revisão (4.6): como toda escrita substitui o
agregado inteiro e grava um snapshot, o `ordinal` é reescrito junto e nunca fica órfão.

(Satisfactory ficou fora da contagem: seus arquivos ainda estão no formato cru da
raspagem, com `ID`/`Ingredients`/`ClassName`.)

---

## 4. Modelo de dados

### 4.1 Como uma referência é gravada

Três colunas, em qualquer lugar que aponte para conteúdo:

```sql
target_kind   text NULL,     -- item|entity|location|recipe|category|... ; NULL = desconhecido
target_ext_id text NOT NULL  -- o id textual
-- (game_id vem do dono da linha)
```

`target_kind` é anulável de propósito: parte das origens não diz o tipo (`drops.itemId`
presume item, `potentialSpawns.entityId` presume entidade mas às vezes é item). `NULL`
significa "resolva por precedência na leitura" — precedência documentada e devolvida na
resposta, para ficar evidente o que foi assumido.

**Não há tabela `content` supertipo.** A versão anterior deste plano propunha uma, para
dar FK única às referências polimórficas. Com referência textual e sem FK, a supertabela
perdeu o motivo de existir e só traria herança `JOINED` no JPA. No lugar dela:

```sql
CREATE VIEW content_ref AS
  SELECT game_id, 'item'     AS kind, ext_id, name, icon, rarity_code FROM item
  UNION ALL
  SELECT game_id, 'entity',        ext_id, name, icon, rarity_code FROM entity
  UNION ALL
  SELECT game_id, 'location',      ext_id, name, icon, NULL        FROM location
  -- ... um SELECT por tipo
```

A view serve três coisas: resolver qualquer referência para exibição (o front renderiza um
chip com ícone e nome sem saber o tipo), busca global, e o cálculo das pendências
(`LEFT JOIN content_ref` onde der `NULL`).

### 4.2 Jogo e permissão

```sql
CREATE TABLE app_user (
  username       text PRIMARY KEY,
  password_hash  text NOT NULL,
  display_name   text,
  verified       boolean NOT NULL DEFAULT false,   -- a flag "autenticado": tem vínculo válido
  status         text NOT NULL DEFAULT 'active',   -- active|suspended
  platform_admin boolean NOT NULL DEFAULT false,   -- cria jogos, promove owners
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

**Sobre `verified` (a flag "autenticado").** O desenho futuro é um sistema de **vínculo**:
a conta se associa a algo externo — email, Discord, Twitch, o que for — e quem não tem
vínculo nenhum não edita jogo comunitário. Isso **não entra agora**. Por ora existe só a
flag, ligada à mão por `platform_admin`, e a regra de autorização já a consulta. Quando o
vínculo existir, entra uma tabela `user_link (username, provider, external_id,
verified_at)` e a flag passa a ser derivada dela — sem mexer em nenhuma regra de
autorização.

Não há coluna de email: email vira um provider de vínculo como qualquer outro, não um
campo da conta. Isso também elimina a dependência de SMTP do v1.

```sql
CREATE TABLE game (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  summary          text,
  description      text,
  -- imagens do jogo: content_media com kind = 'game' (4.7)
  status           text NOT NULL DEFAULT 'draft',      -- draft|published|coming_soon
  read_policy      text NOT NULL DEFAULT 'public',     -- public|members
  write_policy     text NOT NULL DEFAULT 'members',    -- community|members
  daily_reset_time time,
  weekly_reset_day smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE game_member (
  game_id    text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  username   text NOT NULL REFERENCES app_user(username) ON DELETE CASCADE,
  role       text NOT NULL,            -- owner|moderator|editor
  granted_by text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, username)
);

CREATE TABLE game_rarity (             -- era um jsonb solto em games.json
  game_id text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  code    text NOT NULL,
  name    text NOT NULL,
  color   text NOT NULL,
  ordinal int  NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, code)
);
```

As duas políticas são independentes, o que dá quatro combinações úteis:

| `read_policy` | `write_policy` | Resultado |
|---|---|---|
| `public` | `community` | Wiki aberto — qualquer cadastrado edita |
| `public` | `members` | Todo mundo lê, time fechado edita |
| `members` | `members` | Rascunho privado — o jogo nem aparece na listagem |
| `members` | `community` | Círculo fechado colaborativo |

Matriz de autorização:

| Ação | Quem |
|---|---|
| Ler jogo `read_policy=public` | qualquer um, sem login |
| Ler jogo `read_policy=members` | `game_member` (o jogo some de `GET /games` para os demais) |
| Criar/editar conteúdo, `write_policy=community` | usuário ativo **e com `verified`** |
| Criar/editar conteúdo, `write_policy=members` | `game_member` com `editor`+ |
| Apagar conteúdo, restaurar revisão | `moderator`+ |
| Gerir membros, mudar as políticas | `owner` |
| Criar jogo | `platform_admin` |

`game`, `app_user` e `game_member` **têm** FK entre si. A regra do "sem FK" vale para
referências **entre conteúdos de jogo**, que é onde a ausência do alvo é legítima. Um
membro de um jogo que não existe não é um caso legítimo.

### 4.3 Conteúdo

Todo conteúdo carrega a mesma base: `game_id`, `ext_id`, `name`, `summary`, `description`,
`created_by`, `updated_by`, `created_at`, `updated_at`, `PRIMARY KEY (game_id, ext_id)`.
Imagens não ficam na tabela do conteúdo: ficam em `content_media` (4.7).

```sql
CREATE TABLE item (
  game_id text, ext_id text,
  ... base ...,
  rarity_code     text,           -- -> game_rarity.code
  level           int,
  base_buy_price  numeric,
  base_sell_price numeric,
  currency_kind text, currency_ext_id text,   -- moeda é conteúdo: referência textual
  variant_of_ext_id text,         -- variante é item de verdade (ver 4.5)
  PRIMARY KEY (game_id, ext_id)
);

CREATE TABLE entity (             -- criatura, npc, estrutura, recurso coletável, bancada
  game_id text, ext_id text,
  ... base ...,
  rarity_code text,
  level int,
  respawn_delay_minutes int,
  base_buy_price numeric, base_sell_price numeric,
  variant_of_ext_id text,
  PRIMARY KEY (game_id, ext_id)
);

CREATE TABLE game_map (           -- como exibir o mapa; tudo tipado
  game_id text, ext_id text, ... base ...,
  map_type text NOT NULL,         -- single|layered|tile|procedural
  image_url text, url_pattern text, layers int,   -- caminho/URL; imagem de mapa não passa pelo pipeline de mídia
  bounds_min_x numeric, bounds_min_y numeric, bounds_max_x numeric, bounds_max_y numeric,
  min_zoom int, max_zoom int,
  tile_z int, tile_min_x numeric, tile_min_y numeric, tile_max_x numeric, tile_max_y numeric, tile_min_zoom int, tile_max_zoom int,
  grid_size numeric, rotate int,  -- rotate = quartos de volta do norte
  default_view text,
  PRIMARY KEY (game_id, ext_id)
);
-- views disponíveis, filtros ligados ao abrir (tipos, categorias, entidades) e climas (eventos)
CREATE TABLE game_map_list (game_id, map_ext_id, list text, ordinal int, value text, PRIMARY KEY (game_id, map_ext_id, list, ordinal));

CREATE TABLE location (           -- bioma, região, POI — o que hoje é referencePoint type=location|biome|poi
  game_id text, ext_id text,
  ... base ...,
  location_type text NOT NULL,    -- código aberto: region (padrão), biome, poi, dungeon
  parent_ext_id text,             -- hierarquia, textual, pode apontar para o vazio
  map_ext_id    text,
  area geometry,                  -- polígono da região, ponto do POI; nulo em bioma procedural
  PRIMARY KEY (game_id, ext_id)
);

CREATE TABLE spawn_point (        -- onde algo aparece; nome opcional (vale o do primeiro ocupante)
  game_id text, ext_id text,
  ... base ...,
  map_ext_id      text,
  location_ext_id text,
  position        geometry,       -- ponto, com ou sem Z; nulo = vale para o local inteiro
  respawn_mode    text,           -- once|respawn|daily|weekly
  respawn_delay_minutes int,
  PRIMARY KEY (game_id, ext_id),
  CHECK (position IS NOT NULL OR location_ext_id IS NOT NULL)
);
CREATE INDEX ON spawn_point USING gist (position);
CREATE INDEX ON location    USING gist (area);

CREATE TABLE spawn_occupant (     -- o que aparece nesse ponto
  game_id text, spawn_ext_id text, ordinal int,
  target_kind text, target_ext_id text NOT NULL,
  chance numeric, amount numeric, max_amount numeric,
  PRIMARY KEY (game_id, spawn_ext_id, ordinal)
);
```

`geometry` usa **SRID 0** — coordenadas de jogo, não geográficas — e não fixa o tipo, porque o
mesmo mapa mistura ponto 2D e 3D (Outward). `ST_Within` substitui o ray casting de `spatial.ts`.
Na API a geometria é **WKT**, igual aos JSONs: o servidor valida (JTS), normaliza o texto e troca
com o banco por WKB, que preserva cada coordenada. Reimportar o mesmo ponto com outro espaçamento
não gera revisão.

```sql
CREATE TABLE recipe (
  game_id text, ext_id text, ... base ...,   -- name opcional: sem ele, vale o do primeiro produto
  craft_time_seconds int,
  PRIMARY KEY (game_id, ext_id)
);
-- ordinal = o slot da bancada quando o jogo é baseado em slot (Outward, Minecraft)
CREATE TABLE recipe_input   (game_id, recipe_ext_id, ordinal int, target_kind, target_ext_id, amount numeric, not_consumed boolean DEFAULT false, PRIMARY KEY (game_id, recipe_ext_id, ordinal));
CREATE TABLE recipe_output  (game_id, recipe_ext_id, ordinal int, target_kind, target_ext_id, amount numeric, chance numeric, level int,        PRIMARY KEY (game_id, recipe_ext_id, ordinal));
CREATE TABLE recipe_station (game_id, recipe_ext_id, ordinal int, station_ext_id,                                                              PRIMARY KEY (game_id, recipe_ext_id, ordinal));
-- desbloqueio: evento, quest, nível de bancada... target = o conteúdo envolvido; value = o que não é conteúdo
CREATE TABLE recipe_unlock  (game_id, recipe_ext_id, ordinal int, unlock_type, target_kind, target_ext_id, value text,                         PRIMARY KEY (game_id, recipe_ext_id, ordinal));

-- Loja: três informações. A loja, as categorias da loja e os itens de cada categoria.
CREATE TABLE shop (
  game_id text, ext_id text, ... base ...,
  npc_ext_id text, reset_type text,
  PRIMARY KEY (game_id, ext_id)
);
CREATE TABLE shop_category (      -- aponta para a loja pelo código; pode existir antes dela
  game_id text, ext_id text, ... base ...,
  shop_ext_id text, reset_type text,
  PRIMARY KEY (game_id, ext_id)
);
CREATE TABLE shop_category_item (
  game_id text, category_ext_id text, ordinal int,
  target_kind text, target_ext_id text NOT NULL,
  quantity numeric,               -- tamanho do pacote; nulo = avulso
  purchase_limit int,             -- quantas compras até o reset
  price numeric, currency_kind text, currency_ext_id text,
  reset_type text, rarity_code text,
  PRIMARY KEY (game_id, category_ext_id, ordinal)
);

-- o que a entidade exige para ser coletada ou derrotada: energia (gasta), machado (não gasta)
CREATE TABLE entity_requirement (game_id, entity_ext_id, ordinal int, target_kind, target_ext_id, amount numeric, not_consumed boolean DEFAULT false, PRIMARY KEY (game_id, entity_ext_id, ordinal));

CREATE TABLE drop_entry (         -- unifica entity.drops e referencePoint.customDrops
  game_id text,
  source_kind text NOT NULL,      -- entity|spawn_point
  source_ext_id text NOT NULL,
  ordinal int,
  target_kind text, target_ext_id text NOT NULL,
  chance numeric, amount numeric NOT NULL, max_amount numeric,
  PRIMARY KEY (game_id, source_kind, source_ext_id, ordinal)
);
```

Coleções e códigos de resgate:

```sql
CREATE TABLE collection        (game_id, ext_id, ... base ..., PRIMARY KEY (game_id, ext_id));
CREATE TABLE collection_group  (game_id, ext_id, ... base ..., PRIMARY KEY (game_id, ext_id));
-- um grupo pode estar em mais de uma coleção
CREATE TABLE collection_group_collection (game_id, group_ext_id, ordinal int, collection_ext_id,       PRIMARY KEY (game_id, group_ext_id, ordinal));
CREATE TABLE collection_group_member     (game_id, group_ext_id, ordinal int, target_kind, target_ext_id, PRIMARY KEY (game_id, group_ext_id, ordinal));

CREATE TABLE redemption_code (    -- ext_id é o próprio código; name opcional
  game_id text, ext_id text, ... base ...,
  added_on date, expires_on date,
  PRIMARY KEY (game_id, ext_id)
);
CREATE TABLE redemption_reward (game_id, code_ext_id, ordinal int, target_kind, target_ext_id, amount numeric, PRIMARY KEY (game_id, code_ext_id, ordinal));
```

### 4.4 Transversais

```sql
CREATE TABLE content_category (game_id, kind, ext_id, category_ext_id, PRIMARY KEY (game_id, kind, ext_id, category_ext_id));
CREATE TABLE content_event    (game_id, kind, ext_id, event_ext_id,    PRIMARY KEY (game_id, kind, ext_id, event_ext_id));

-- atributos declarados por jogo (era o ItemMetadata solto)
CREATE TABLE attribute_definition (
  game_id text, key text,
  label text NOT NULL,
  data_type text NOT NULL,        -- number|text|boolean|reference
  unit text, ordinal int,
  PRIMARY KEY (game_id, key)
);
CREATE TABLE content_attribute (
  game_id, kind, ext_id, key,
  value_num numeric, value_text text, value_bool boolean,
  PRIMARY KEY (game_id, kind, ext_id, key)
);

-- condições tipadas (era conditions: Record<string, any>)
CREATE TABLE content_condition (
  game_id, kind, ext_id, ordinal,
  condition_type text NOT NULL,   -- weather|time_of_day|event|quest|season
  operator text NOT NULL,         -- eq|gte|lte|in
  value text NOT NULL,
  PRIMARY KEY (game_id, kind, ext_id, ordinal)
);
```

`content_condition` tipada em vez de `jsonb` porque a condição é **filtrável**: o front já
tem `MapWeatherPanel` e `availableWeathers` para "mostre só o que aparece com chuva".
Com jsonb isso não indexa.

**Na Fase 4 a tabela não foi criada.** Nenhum dado usa `conditions`, e clima já é evento: rainbow,
rainy, meteor_shower e petal_rain são eventos do tipo clima. "Aparece com chuva" é o filtro por
evento, que já existe.

### 4.5 O que muda em relação ao formato atual, e por quê

| Hoje | Novo | Motivo |
|---|---|---|
| `variants: Partial<Item>[]` (objeto de patch aninhado) | item/entidade de verdade com `variant_of_ext_id` | variante vira referenciável (uma receita pode pedir a variante), pesquisável e editável isolada |
| `metadata: ItemMetadata[]` solto | `attribute_definition` + `content_attribute` tipado | permite filtrar e ordenar por atributo; hoje a `MetadataDetailsPage` varre tudo na mão |
| `rarity` como mapa jsonb em `games.json` | tabela `game_rarity` | editável pelo CRUD, e `rarity_code` passa a ter significado verificável |
| `Entity.geom` / `parentId` / `potentialSpawns` | removidos; viram `location` | zero uso em 825 entidades nos 4 jogos (3.2) |
| `referencePoints.type` com 5 significados | `location` (área) + `spawn_point` (ocorrência) | um `type` que decide quais colunas valem é discriminador disfarçado |
| `Recipe.itemId` + `amount` **e** `products[]` | sempre `recipe_output` | dois caminhos para a mesma coisa; o front normaliza em runtime a cada leitura |
| `Ingredients`/`Products`/`ProducedIn` ("Raw data support") | removidos | resíduo de raspagem do Satisfactory |
| `shops` + `shopCategories[].items[]` | `shop`, `shop_category` (aponta para a loja pelo código) e `shop_category_item` posicional | são três informações; editar uma categoria não reescreve a loja inteira |
| `ShopItem.amount` (limite) e `quant` (pacote) | `purchaseLimit` e `quantity` | `amount` era limite de compra na loja e quantidade na receita |
| `ingredients[].notConsume` | `notConsumed`, padrão `false` | o mesmo sentido do dado original, no padrão de nomes da API |
| `unlock: { type, id?, subject?, value }` | `recipe_unlock` com `type`, `target` (referência) e `value` | evento, quest de NPC e nível de bancada cabem na mesma forma, e o alvo entra nas pendências |
| `Entity.requirements` | `entity_requirement`, mesma forma do ingrediente | energia e ferramenta para coletar são requisito, não drop |
| `ConjuntoGroup.items` + `entitys` | `members`, lista de referências | um grupo de item e um de entidade têm a mesma forma |
| `RedemptionCode.addedAt` / `expiresAt` (datas) | `addedOn` / `expiresOn` | são datas, não instantes; o código vale até o fim do dia |
| `event: string \| string[]` | `content_event` | hoje normalizado em runtime em três lugares (`event \|\| events`) |
| `conditions: Record<string, any>` | `events` | nenhum dado usa `conditions`; clima é evento e o filtro por clima é o filtro por evento |
| `entity.drops` + `referencePoint.customDrops` + `spawns[].customDrops` | `drop_entry` com `source_kind` | três tabelas com o mesmo significado; o `getItemDetails` hoje concatena as três na mão |
| `geom: { type, coordinates: "POLYGON((...))" }` | coluna `geometry` PostGIS; na API continua WKT, normalizado | a consulta espacial vai para o banco; o ray casting de `spatial.ts` deixa de existir |
| `referencePoint.entityId` + `spawns[]` | `occupants`, sempre lista | um ocupante ou vários, a mesma forma |
| `type: rule` (entidade num bioma, sem posição) | `spawn_point` sem `position`, com `location` | é um "onde aparece"; mesmas consultas e drops |
| `MapMetadata.bounds` `[[minY, minX], [maxY, maxX]]` | `bounds: { minX, minY, maxX, maxY }` | a ordem do Leaflet fica no front |
| `availableWeathers` | `weathers`, referência a evento | clima é evento; o que não está cadastrado entra nas pendências |

### 4.6 Auditoria

Cadastro é aberto e jogo `community` aceita escrita de qualquer cadastrado. Auditoria
deixa de ser opcional. Todo conteúdo tem `created_by` / `updated_by` / `updated_at`, e:

```sql
CREATE TABLE content_revision (
  game_id text, kind text, ext_id text, revision int,
  operation text NOT NULL,        -- create|update|delete|restore
  changed_by text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  snapshot  jsonb NOT NULL,       -- agregado completo após a operação
  PRIMARY KEY (game_id, kind, ext_id, revision)
);
CREATE INDEX ON content_revision (game_id, changed_at DESC);
CREATE INDEX ON content_revision (changed_by, changed_at DESC);
```

**A revisão é do agregado, não da linha.** O snapshot de uma receita inclui seus inputs,
outputs e estações; o de uma loja inclui suas ofertas. Restaurar uma receita sem restaurar
seus ingredientes não restauraria nada de útil. Na prática: toda escrita substitui o
agregado inteiro e grava uma revisão.

Restaurar (`moderator`+) não apaga histórico — grava uma nova revisão com
`operation='restore'` copiando o snapshot antigo. O histórico é sempre append-only.

Os dois índices por `changed_at` existem para as duas telas que edição comunitária exige
na prática: "mudanças recentes neste jogo" e "tudo que este usuário mexeu" — esta última
é o que permite desfazer um estrago em massa.

---

### 4.7 Mídia

Usuários sobem imagens para servir de ícone e thumbnail. Toda imagem recebida é
**reconvertida para WebP via FFmpeg** — nenhum byte enviado pelo usuário é servido de
volta como veio.

```sql
CREATE TABLE media (
  id             text PRIMARY KEY,      -- sha256 da variante "full" já convertida
  width int, height int,                -- dimensões da imagem enviada
  animated       boolean NOT NULL DEFAULT false,
  source_name    text,                  -- nome original, só para exibição
  source_format  text NOT NULL,         -- demuxer que o ffprobe identificou na entrada
  source_bytes   bigint NOT NULL,
  uploaded_by    text NOT NULL,
  uploaded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media_variant (
  media_id   text NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  variant    text NOT NULL,             -- icon|thumb|full
  width int, height int, byte_size bigint,
  storage_path text NOT NULL,
  PRIMARY KEY (media_id, variant)
);
```

O `id` é o hash do conteúdo convertido, o que dá **deduplicação de graça**: o mesmo ícone
enviado por cinco pessoas ocupa um arquivo. E permite servir com
`Cache-Control: immutable`, já que um id nunca muda de conteúdo.

**Mídia não pertence a jogo.** Como o id é o hash, a mesma imagem usada em dois jogos é
uma linha só — um `game_id` nela seria de quem enviou primeiro. O contexto de jogo fica
em quem referencia a imagem. Consequência: apagar é permitido a quem enviou ou a
`platform_admin`, não a moderador de um jogo.

**Mídia se liga a conteúdo por uma tabela de relacionamento, `content_media`**, e não por
colunas em cada tabela. Cada linha diz: qual mídia, em qual conteúdo (ou no próprio jogo), com
qual uso, em que posição, e quem a ligou e quando.

```sql
CREATE TABLE content_media (
  game_id  text NOT NULL,        -- sem FK nesta tabela (ver abaixo)
  kind     text NOT NULL,        -- game | item | entity | category | event
  ext_id   text NOT NULL,        -- para kind = game, igual a game_id
  usage    text NOT NULL,        -- icon | capsule | thumbnail | banner | screenshot
  media_id text NOT NULL,
  ordinal  int  NOT NULL,        -- posição entre as mídias do mesmo uso
  added_by text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, kind, ext_id, usage, media_id)
);
```

- **Vários por uso, com ordem.** Um item pode ter várias screenshots; `ordinal` é a ordem de
  exibição. A mesma imagem não aparece duas vezes no mesmo uso.
- **Autoria preservada.** A escrita é do documento inteiro, mas uma imagem que continua no mesmo
  uso mantém `added_by` e `added_at`; só a imagem nova leva o autor e a hora da escrita atual.
- **A atual é a mais recente.** Entre várias imagens do mesmo uso, a exibida (ex.: o ícone na
  busca e nas referências) é a de `added_at` mais recente.
- **Lista fechada de usos, validada por tipo de conteúdo:**

  | Tipo | Usos |
  |---|---|
  | jogo | `icon`, `capsule`, `thumbnail`, `banner` |
  | item, entidade | `icon`, `screenshot` |
  | categoria, evento | `icon`, `banner` |

- **Sem chave estrangeira (V6).** A ligação pertence ao **código** do registro, não ao registro:
  durante o cadastro o usuário anexa imagens antes de o conteúdo existir, já que o código não se
  repete. A tabela não amarra jogo, mídia nem conteúdo. A aplicação ainda recusa `mediaId` que
  nunca foi enviado (422) e impede apagar mídia em uso (409).
- **Rotas próprias de imagem**, que funcionam exista o registro ou não:
  `GET`, `POST` (anexa uma) e `PUT` (substitui ou reordena) em `.../{recurso}/{extId}/media`, e
  `DELETE .../{extId}/media/{uso}/{mediaId}`.
- **Documento sem `media` não mexe nas imagens.** Com `media` presente, mesmo vazio, substitui.
  Criar o registro depois de anexar as imagens não as apaga.
- **Apagar o conteúdo não apaga as ligações.** Se o registro for restaurado ou recriado com o
  mesmo código, as imagens continuam lá.
- Um uso novo de imagem é um valor na lista, não uma coluna nova.
- **O jogo também.** Os caminhos de arquivo `icon`/`capsule`/`thumbnail` de `game` saíram (V5).

#### Pipeline de upload

1. Limite de tamanho rejeitado **antes** de ler o corpo (`max-file-size`).
2. `ffprobe` identifica o formato real e as dimensões. Rejeita o que não for imagem, e
   rejeita acima de um teto de megapixels — proteção contra bomba de descompressão, que
   um limite de bytes sozinho não pega.
3. `ffmpeg` converte para WebP gerando três variantes, sempre com `-map_metadata -1`
   (tira EXIF, GPS e afins), `-f` com o demuxer que o `ffprobe` identificou (sem nova
   autodetecção) e `-fflags +bitexact` (mesma entrada, mesmos bytes — é o que faz o hash
   deduplicar).
4. Hash do resultado, gravação no storage, `INSERT` idempotente.

Padrões propostos, todos configuráveis:

| Parâmetro | Valor |
|---|---|
| Tamanho máximo do upload | 8 MB |
| Teto de megapixels na entrada | 40 MP |
| Quadros de animação | 300 |
| `icon` | 128 px no maior lado |
| `thumb` | 512 px |
| `full` | 1920 px |
| Timeout do FFmpeg | 20 s por variante |

FFmpeg em vez de uma biblioteca de imagem tem uma vantagem concreta aqui: GIF animado
entra e sai como **WebP animado**, sem caminho especial.

#### Storage

Arquivos em volume montado, não no Postgres, atrás de uma interface `MediaStorage` para
trocar por S3 depois sem mexer em serviço. O caminho é derivado do hash
(`ab/cd/abcd…_icon.webp`), **nunca** de nome enviado pelo usuário.

#### Segurança

Cadastro é aberto (4.2), então upload é entrada de arquivo hostil por definição:

- Tipo vem do `ffprobe`, **nunca** da extensão ou do `Content-Type` do cliente.
- `ffprobe` e `ffmpeg` rodam com `-format_whitelist` (só `png_pipe`, `jpeg_pipe`,
  `webp_pipe`, `gif`, `gif_pipe`) e `-protocol_whitelist file`. É a defesa contra o
  ataque clássico em que um "PNG" é na verdade uma playlist HLS e faz o FFmpeg abrir
  arquivos locais do servidor. Olhar a extensão não protege: o FFmpeg decide o formato
  pelo conteúdo, e isso já acontece no `ffprobe`.
- O arquivo original é descartado após a conversão. Só o WebP gerado existe no disco.
- Servido com `Content-Type: image/webp` fixo e `X-Content-Type-Options: nosniff`, de
  rota que não executa nada.
- FFmpeg roda com timeout, sem shell, argumentos por lista — nome de arquivo do usuário
  nunca chega na linha de comando.
- Rate limit e cota por usuário; upload exige `verified`, como toda escrita.
- Mídia sem nenhuma referência é coletada por rotina de limpeza (`GET /media/orphans`
  para inspecionar antes). **Entra na Fase 2**: até existir conteúdo referenciando
  imagem, toda imagem seria órfã.

#### O acervo atual passa pelo mesmo cano

Os 4.002 arquivos de `img|map|icon` (108 MB, em PNG e JPG) podem ser reenviados
pelo parser externo por esse mesmo endpoint. Além de unificar o armazenamento, converter
o acervo para WebP costuma cortar entre 25% e 35% do peso. O acervo saiu de `public/` e está em
`C:\Dev\game-planner-data`, então o front não serve mais esses caminhos estáticos: as imagens só
voltam a aparecer depois de importadas.

---

## 5. Contrato da API

### Autenticação

```
POST /api/v1/auth/register        { username, password }
POST /api/v1/auth/login           -> { accessToken, refreshToken }
POST /api/v1/auth/refresh
GET  /api/v1/auth/me              -> usuário + flag verified + papéis por jogo
PATCH /api/v1/users/{username}    { verified, status }        [platform_admin]
```

JWT bearer, access curto + refresh, senha com BCrypt. Stateless, CSRF desligado.

Cadastro é **aberto**, mas registrar-se não dá direito de escrever em jogo comunitário:
isso exige a flag `verified` (o vínculo descrito em 4.2). Dois controles acompanham:

- **Rate limit por usuário** nas rotas de escrita.
- **`app_user.status = 'suspended'`**, aplicado por `platform_admin`, corta escrita sem
  apagar o histórico da pessoa.

### Leitura — pública, sem login

```
GET  /api/v1/games
GET  /api/v1/games/{game}
POST /api/v1/games/{game}/{resource}/query?page=&size=&sort=&references=   <- listagem; corpo = QueryJson
GET  /api/v1/games/{game}/{resource}/query/fields                         <- campos do filtro e sorts
GET  /api/v1/games/{game}/{resource}/{extId}
GET  /api/v1/games/{game}/{resource}/{extId}/details   <- agregado de qualquer tipo
POST /api/v1/games/{game}/maps/{mapId}/spawn-points/query?limit=           <- marcadores compactos; corpo = QueryJson
GET  /api/v1/games/{game}/maps/{mapId}/spawn-points/query/fields
GET  /api/v1/games/{game}/references?target=item:x&field=    <- quem aponta para um alvo, de qualquer tipo
GET  /api/v1/games/{game}/crafting-tree?target=item:x&amount=&choices=
GET  /api/v1/games/{game}/search?q=                          <- sobre content_ref
```

`{resource}` é items, entities, categories, events, recipes, shops, shop-categories, maps, locations,
spawn-points, collections, collection-groups ou codes. A listagem é `POST` porque o filtro vai no corpo,
mas é leitura: aberta sem login como os `GET`, e fora do rate limit de escrita.

### Filtro de consulta — QueryJson

Toda listagem recebe um **QueryJson**, sempre um grupo na raiz. Grupo junta regras (`rules`, só
regras) e subgrupos (`groups`, só grupos) com `operator` `and` ou `or`; regra compara um campo:

```json
{ "type": "group", "operator": "and",
  "rules": [ { "type": "rule", "field": "rarity", "operator": "in", "value": ["rare", "epic"] } ],
  "groups": [ { "type": "group", "operator": "or", "groups": [],
                "rules": [ { "type": "rule", "field": "event", "operator": "is_null" },
                           { "type": "rule", "field": "event", "operator": "in", "value": ["natal"] } ] } ] }
```

O **QueryBuilder** do tipo gera o `WHERE` e descreve os campos em `.../query/fields`:
`{ fields: [{ name, label, type, operators, kind?, options? }], sorts: [...] }`. Nome e código de
tabela vêm de código; o JSON só escolhe campo, operador e valor, que vai por parâmetro.

| Tipo | Valor | Operadores |
|---|---|---|
| `text` | texto | equal, not_equal, in, not_in, contains, not_contains, begins_with, ends_with, is_null, is_not_null |
| `number` | número | equal, not_equal, in, not_in, less, less_or_equal, greater, greater_or_equal, between, is_null, is_not_null |
| `date` | `"2026-09-18"` | equal, not_equal, less..., between, is_null, is_not_null |
| `datetime` | ISO-8601 com fuso | less..., between, is_null, is_not_null |
| `boolean` | true/false | equal |
| `enum` | uma das `options` | equal, not_equal, in, not_in |
| `code` | código de um registro do tipo `kind` | equal, not_equal, in, not_in, is_null, is_not_null |
| `reference` | `"tipo:id"` ou `"id"` | equal, not_equal, in, not_in, is_null, is_not_null |
| `geometry` | `[minX, minY, maxX, maxY]` | intersects, is_null, is_not_null |

Campo de lista (categoria, evento, atributo, drops, ocupante, produto...) é "tem": `equal` é ter o
valor, `in` ter algum, `not_equal`/`not_in` não ter, `is_null` não ter nenhum. "Todas as categorias"
é um `and` de `equal`. `not_equal` e `not_in` incluem quem não tem valor. `in []` não casa nada e
`not_in []` casa tudo. Subgrupo vazio é ignorado. Limites: 8 níveis, 200 regras, 1.000 valores num `in`.

Comuns a todo tipo: `name`, `extId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy` e, quando o tipo
tem, `rarity`, `category`, `event` e `attribute` (tem o atributo). Próprios:

| Recurso | Campos |
|---|---|
| items | level, baseBuyPrice, baseSellPrice, variantOf, buyable (preço de compra ou vendido em loja), sellable |
| entities | level, respawnDelayMinutes, baseBuyPrice, baseSellPrice, variantOf, drops, requires |
| categories | appliesTo (enum item, entity, both) |
| events | type, periodStart, periodEnd |
| recipes | craftTimeSeconds, produces, consumes, station |
| shops | npc, resetType |
| shop-categories | shop, resetType, sells |
| maps | type, weather |
| locations | type, parent, map, area, containing (código de ponto: os locais que o contêm) |
| spawn-points | map, location (inclui ponto dentro da área), position, respawnMode, respawnDelayMinutes, occupant, drops, yields (drop do ponto ou das entidades nele), occupantCategory |
| collections | member |
| collection-groups | collection, member |
| codes | addedOn, expiresOn, active (sem validade ou vencendo hoje ou depois), rewards |

### Referências pendentes — o fluxo de cadastro

```
GET /api/v1/games/{game}/pending-references?kind=&page=&size=
```

```json
{
  "content": [
    { "extId": "minerio_ferro", "guessedKind": "item", "referenceCount": 14,
      "referencedBy": [
        { "kind": "recipe", "extId": "recipe_barra_ferro", "field": "inputs" },
        { "kind": "shop_category", "extId": "blanc_ferramentas", "field": "items" }
      ] }
  ],
  "total": 137
}
```

Ordenado por `referenceCount` desc: o que mais falta cadastrar vem primeiro.

E ao acessar um id inexistente, `404` com o contexto no corpo:

```json
{
  "type": "https://gameplanner/errors/unregistered-content",
  "title": "Conteúdo não cadastrado",
  "status": 404,
  "gameId": "heartopia", "kind": "item", "extId": "minerio_ferro",
  "referenceCount": 14,
  "referencedBy": [ ... ]
}
```

O front usa isso para abrir a tela de cadastro já sabendo quem depende daquele id. Não há
`suggestedName`: no modelo novo a referência é só o id, não carrega nome.

### Escrita — autenticada, autorizada por jogo

Mesmos caminhos da leitura, métodos diferentes. Não há prefixo `/admin`: a autorização é
função do jogo, não da rota.

```
POST   /api/v1/games/{game}/{resource}              cria (409 se o id já existe)
PUT    /api/v1/games/{game}/{resource}/{extId}      substitui o documento inteiro, ou cria
PUT    /api/v1/games/{game}/{resource}              lote (array), numa transação só
DELETE /api/v1/games/{game}/{resource}/{extId}      [moderator]

GET    /api/v1/games/{game}/members
PUT    /api/v1/games/{game}/members/{username}      { role }          [owner]
DELETE /api/v1/games/{game}/members/{username}                        [owner]
PATCH  /api/v1/games/{game}   { readPolicy, writePolicy }             [owner]

GET    /api/v1/games/{game}/{resource}/{extId}/revisions
POST   /api/v1/games/{game}/{resource}/{extId}/revisions/{n}/restore  [moderator]
GET    /api/v1/games/{game}/changes?since=&by=                        histórico do jogo
```

### Mídia

```
POST   /api/v1/media              multipart/form-data      [verified]
GET    /api/v1/media/{id}         metadados e variantes
DELETE /api/v1/media/{id}         [quem subiu, ou platform_admin]
GET    /api/v1/media/orphans      mídia sem referência     [Fase 2]

GET    /media/{id}/{variant}.webp   o arquivo — fora de /api, Cache-Control immutable
```

`POST` devolve `201` com `{ created: true, media: { id, width, height, animated, variants } }`,
e cada variante traz `url`, dimensões e tamanho em bytes. Reenviar a mesma imagem devolve
`200` com `created: false` e o mesmo `id`, sem gravar de novo.

`PUT` em lote é transacional e idempotente por `(game_id, ext_id)`; devolve
`{ created, updated, unchanged }`. Nenhuma carga é rejeitada por referência inexistente —
elas só passam a constar em `pending-references`.

**Ordem de carga para o parser externo:** irrelevante. Sem FK entre conteúdos, qualquer
ordem funciona. Essa é a consequência prática mais útil do princípio 2.1.

### Convenções

- Erros em `ProblemDetail` (RFC 9457, nativo no Spring).
- Paginação `{ content, page, size, total, totalPages }`, com `page` começando em 0.
- OpenAPI em `/swagger-ui`.

---

## 6. Roadmap — fatias verticais

Cada fatia entrega migration + leitura + escrita + testes do seu grupo.

### Fase 0 — Fundação e identidade
**Status: concluída.** Verificada rodando, com a matriz de autorização exercitada de ponta a ponta.

Docker Compose com `postgis/postgis:16`; `ddl-auto=validate` (hoje está `update`,
conflitando com Flyway); Java 21 (pom está em 17); credenciais em env var;
`hibernate-spatial`; `ProblemDetail`; CORS; springdoc; `/actuator/health`;
CI com `mvnw verify`; Testcontainers.
**Mais `app_user`, `game`, `game_member`, `game_rarity`, JWT, flag `verified`, rate limit
e a matriz de autorização** — porque toda escrita das fases seguintes depende disso.

Sai daqui também o **`Dockerfile` do app e um `docker-compose.prod.yml`** (app + PostGIS),
já apontando para o destino final: VPS Ubuntu na Hostinger. Rodar em produção desde a
Fase 0 é barato; descobrir na Fase 5 que a imagem não sobe, não.

### Fase 1 — Mídia
**Status: concluída.** 15 testes automatizados, com conversão real pelo FFmpeg, e roteiro de 16
verificações contra a imagem Docker de produção: autorização, dimensões ímpares, GIF animado,
playlist HLS disfarçada, limites de megapixels e de bytes, cache/ETag e remoção.

`media`, `media_variant`, pipeline FFmpeg, storage em volume, endpoint de upload e de
entrega. Vem antes do conteúdo porque todo tipo de conteúdo tem ícone, e `icon_media_id`
nasce junto com as tabelas da fase seguinte.

### Fase 2 — Núcleo de conteúdo
**Status: concluída.** 11 testes de contrato HTTP (MockMvc + banco real) somados aos 15 anteriores.
Decisões tomadas na implementação, que ajustam o plano acima:

- **`PUT` do documento inteiro no lugar de `PATCH`.** A revisão é do agregado (4.6); um PATCH
  sobre listas de categorias e atributos teria semântica ambígua.
- **Escrita idêntica ao gravado não grava nem gera revisão.** Reimportar a base inteira não enche
  o histórico. A comparação normaliza números (`10` e `10.0` são o mesmo valor).
- **`ext_id` aceita espaço e parênteses.** A base real tem 566 ids assim (`lox bite`,
  `Hound (1)_…`). Recusa só `/ \ ? # % ;`, caractere de controle e espaço nas pontas.
- **Atributo sem definição é aceito**, com o tipo vindo do valor JSON. Com definição, o tipo é
  conferido (422). O parser não precisa cadastrar definições antes dos itens.
- **Mídia ligada por `media: [{ usage, mediaId }]`** (tabela `content_media`, ver 4.7): id de mídia
  com 64 hex, caminho de arquivo dá 400, mídia não enviada dá 422.
- **Referências centralizadas na view `content_reference`.** Pendências e o 404 enriquecido só
  leem dela; cada fase nova acrescenta ali suas colunas de referência.
- **Atributo com `data_type = reference` ficou de fora**: exigiria o kind junto do valor. Entra
  quando um jogo precisar.
- **Persistência de conteúdo em JDBC (`JdbcClient`), não JPA**: chave natural, sem FK, upsert e
  lote ficam explícitos em SQL. JPA segue em identidade e mídia.

`item`, `entity`, `category`, `game_event`, `content_category`, `content_event`,
`attribute_definition`, `content_attribute`, `content_revision` (com restore).
View `content_ref`, busca global, **`pending-references` e o 404 enriquecido**.
Também entra `GET /media/orphans`, que só faz sentido quando houver conteúdo apontando para imagem.
Ao fim desta fase o parser externo já sobe o grosso da base.

### Fase 3 — Crafting e economia
**Status: concluída.** 7 testes de contrato HTTP, 38 no total.
Decisões tomadas na implementação, que ajustam o plano acima:

- **Loja em três informações:** `shop`, `shop_category` e `shop_category_item`. A categoria tem
  código próprio e aponta para a loja pelo código, como nos dados (`shopCategories` com `shopId`),
  e pode ser cadastrada antes dela. Editar uma categoria não reescreve a loja.
- **Evento só na categoria de loja.** Nos itens de heartopia, a condição de evento repete sempre o
  evento da categoria (11 de 11).
- **Troca por itens (`exchange`) ficou fora.** Nenhum uso na base. O preço é `price` + `currency`,
  e toda moeda da base já é item cadastrado, inclusive `rmt_br`. Com isso `shop_offer_cost` não
  foi criada.
- **Na loja, `amount` virou `purchaseLimit`, e `quant`, `quantity`.** `amount` era limite de compra
  na loja e quantidade na receita.
- **Requisitos de entidade** (`requirements`, com `notConsumed`) entraram, com a mesma forma do
  ingrediente de receita.
- **Desbloqueio de receita tipado:** `{ type, target, value }`, com `type` em código aberto.
- **Receita com nome opcional.** Sem nome, `content_ref` usa o do primeiro produto cadastrado, e a
  busca e a ordenação por nome usam o mesmo.
- **Drops e requisitos vão no documento da entidade.** A escrita continua do agregado inteiro:
  `PUT` sem `drops` deixa a entidade sem drops. Só `media` tem a exceção de ficar como está.
- **Consultas inversas como filtro de listagem**, com alvo `tipo:id` ou só `id`:
  `recipes?produces=&consumes=&station=`, `entities?drops=&requires=`,
  `shop-categories?sells=&shop=` e `shops?npc=`. E `GET /references?target=&field=` lista toda
  origem que aponta para um alvo, de qualquer tipo.
- **Linhas-filhas num helper só** (`ChildRows`): chave `(pai, ordinal)`, a lista inteira regravada
  junto com o pai. As fases seguintes reusam o mesmo mecanismo.

### Fase 4 — Mundo (PostGIS)
**Status: concluída.** 5 testes de contrato HTTP e 3 de geometria, 46 no total.
Decisões tomadas na implementação, que ajustam o plano acima:

- **Geometria em WKT na API.** O parser não converte nada. O servidor valida com JTS (tipo certo,
  polígono sem autointerseção) e normaliza o texto; o banco recebe e devolve WKB, que preserva cada
  coordenada. Os 38 polígonos reais de heartopia são válidos.
- **Coluna `geometry` sem tipo fixo**, com CHECK de tipo e SRID: o mesmo mapa mistura 2D e 3D.
- **Ponto de spawn sem posição** quando está ligado a um local (a `rule` de Valheim). Ocupantes são
  sempre lista, com chance e quantidade opcionais; drops de ponto vão em `drop_entry`.
- **"Pontos do local"** é o filtro `spawn-points?location=`: os ligados pelo código e os que têm
  posição dentro da área, no mesmo mapa. O inverso é `locations?containing=`. Não criei a rota
  `/locations/{id}/spawn-points` do contrato: o filtro faz o mesmo.
- **Marcadores compactos** em `/maps/{mapa}/spawn-points` (hoje `POST .../query`, ver Fase 8): sem paginação, até 10.000 pontos
  (o maior mapa tem 2.354), com nome e ícone do ocupante já resolvidos e os mesmos filtros da
  listagem. `truncated` avisa quando o limite cortou.
- **Mapa tipado:** imagem, camadas, bounds, zoom, tiles, rotação, views, filtros iniciais e climas.
  A imagem do mapa é caminho ou URL: o pipeline de mídia reduziria a 1920 px. A miniatura, sim, é
  mídia (`thumbnail`).
- **Sem `content_condition`**: clima é evento (ver 4.4).
- **Hierarquia de local não é recursiva** nos filtros: `location=biome` pega os pontos do bioma, não
  os dos locais filhos.

### Fase 5 — Extras
**Status: concluída.** 2 testes de contrato HTTP, 48 no total.
Decisões tomadas na implementação, que ajustam o plano acima:

- **Grupo de coleção tem código próprio e lista de coleções.** 16 dos 32 grupos de heartopia estão
  em duas coleções, e 4 códigos de coleção citados não existem (viram pendência).
- **Membros numa lista só** (`members`), de qualquer tipo e sem repetição. Os dados separam
  `items` e `entitys`, mas nenhum grupo mistura os dois.
- **Código de resgate identificado pelo próprio código**, como o jogador digita (há `SPRINGFEST2026`
  em maiúsculas). `name` é opcional; sem ele, vale o código.
- **Datas de código são datas** (`addedOn`, `expiresOn`). `active=true` são os sem validade ou que
  vencem hoje ou depois.
- **Na base atual há dois problemas para o parser resolver:** `m2q7r6a9k3` aparece duas vezes em
  `codes_26_05.json`, com as mesmas recompensas e datas diferentes; e `p6n4m9q3a2` tem
  `addedAt: "2026-04-06-04"`.
- **`heartopia/quest.json` ficou de fora:** uma quest ("Tesouro de Alu") com pontos de spawn
  liberados por ela. Quest não estava no roadmap.

### Fase 6 — Agregações
**Status: concluída.** 7 testes de contrato HTTP, 55 no total.
Decisões tomadas na implementação, que ajustam o plano acima:

- **Um `/details` genérico** para todo tipo: `GET /{recurso}/{extId}/details` devolve o documento,
  `related` (uma página por relação: `producedBy`, `usedIn`, `droppedBy`, `soldIn`, `rewardOf`...)
  e `references`, toda referência citada pelo documento e pelos relacionados já com nome e ícone,
  resolvida numa consulta só sobre `content_reference`. Receita traz também `categoryMembers`, as
  opções de cada ingrediente que é categoria. As relações reusam os filtros de listagem das fases
  anteriores; cada uma traz até 200 documentos e o total.
- **Árvore de crafting no servidor** (`GET /crafting-tree`), sobre o jogo inteiro carregado de uma
  vez (receitas, ofertas, preços base e membros de categoria):
  - com receita, crafta; a loja fica como alternativa (`buyable`), e a escolha `item:x=buy` compra;
    `item:x=base` para ali, e `item:x=codigo_da_receita` escolhe entre as receitas do alvo;
  - sem receita, compra na oferta de menor preço por unidade; sem oferta, usa o preço base;
  - moeda que é conteúdo vira nó filho com o valor gasto e desce como qualquer alvo;
  - categoria sem escolha fica em aberto, com as opções; com um membro só, usa ele;
  - lotes e pacotes sempre inteiros. O que sobra — o excedente do último lote, o resto do pacote e
    os subprodutos certos da receita (chance nula ou 1) — vai para um estoque, e o próximo nó que
    precisa do mesmo alvo usa o estoque antes de craftar ou comprar de novo (`source: stock`,
    `fromStock`). Cada nó mostra o `leftover` que gerou, e `totals.leftovers` o que sobrou no fim;
  - ingrediente não consumido é obtido uma vez e fica com o jogador;
  - alvo que já está no caminho para (`cycle`); limite de 5.000 nós e 64 níveis (`422`);
  - `totals` soma recursos base, ferramentas, sobras, compras, receitas, bancadas, tempo, categorias
    em aberto e ciclos.
- **Sem cálculo proporcional.** A árvore e as calculadoras (lucro, lucro por tempo) usam lotes
  inteiros, como o jogador faz; o custo por unidade sai do total dividido pela quantidade pedida.
- **ETag e `Cache-Control: no-cache` em toda leitura da API**, com `Vary: Authorization`. O navegador
  revalida e recebe `304` quando nada mudou. O `Cache-Control` é definido antes da cadeia de
  segurança, que senão escreveria `no-store`.

### Fase 7 — Migração do front (depois, incremental)
**Status: concluída.** Migração tela a tela para os tipos da API, com TanStack Query. Telas migradas:
- itens: lista (`/items`, com `withoutCategory`, `activeEvents` e `trade` criados para ela) e detalhe
  (`/items/{id}/details`);
- entidades: lista (`/entities`) e detalhe (`/entities/{id}/details`). As abas de variante viraram a
  relação `variants`, com o filtro `variantOf` em itens e entidades;
- receitas: lista (`/recipes?references=true` e `/recipe-stations`, criados para ela), detalhe e árvore
  de produção calculada no servidor, com escolha de categoria, de receita e de comprar em vez de craftar.
  A aba de fluxo de produção (grafo) saiu por enquanto: calculava custo e sobras no formato antigo;
- lojas: lista (`/shops?references=true`, com o NPC resolvido) e loja aberta (`/shops/{id}/details`, com as
  categorias e seus itens), mais onde encontrar o NPC (`/spawn-points?occupant=entity:x`). Categorias de
  evento inativo ficam ocultas, pela mesma regra de `activeEvents`. Requisitos da loja, troca por itens e
  condições por oferta do JSON antigo não existem no modelo e saíram da tela;
- categorias: lista (`/categories?appliesTo=`, filtro criado para ela) e detalhe, com itens e entidades
  paginados pela listagem (`?category=`) e receitas e lojas vindas de `/categories/{id}/details`;
- eventos: lista (`/events?type=`, filtro criado para ela, mais recentes primeiro) e detalhe
  (`/events/{id}/details`, com tudo que pertence ao evento). A situação (acontecendo, em breve, encerrado)
  vem do período, e o evento pode ser ligado ou desligado no filtro de eventos ativos pela própria tela;
- códigos de resgate: lista (`/codes?active=&exclude=&references=true`, os mais novos primeiro). `exclude`,
  comum a toda listagem, foi criado para esconder os códigos já coletados sem quebrar a paginação;
- conjuntos: lista de coleções (`/collections`, com o progresso somado de `/collection-groups`) e coleção
  aberta (`/collections/{id}/details`, com os grupos e os membros resolvidos). O que foi obtido continua
  marcado no navegador, na mesma chave das telas antigas;
- metadados: viraram atributos. A tela lista itens e entidades com o atributo (`?attribute=`, filtro criado
  para ela), e os chips de atributo das telas migradas abrem essa tela;
- filtro global de eventos (cabeçalho): lê `/events`, com as datas ISO, e mantém as preferências salvas no
  navegador pelo código do evento;
- calculadoras: a de crafting usa `/crafting-plan` (vários alvos numa árvore só, dividindo as sobras, com
  custo e venda por moeda); rentabilidade e lucro por tempo usam `/crafting-profits`, que calcula um lote
  de cada produto no servidor, com busca, ordenação e paginação. Custo e venda só se comparam na mesma
  moeda; o que tem categoria em aberto ou ciclo aparece marcado como incompleto;
- mapa: seletor (`/maps`), mapa com marcadores (`/maps/{id}/spawn-points`, que passou a trazer ícone,
  respawn e categorias dos ocupantes, e ganhou `yields` para "onde conseguir este item"), áreas dos locais
  (`/locations?map=`), climas pelos eventos de `weathers`, popup do ponto e drawer de item/entidade pelo
  `/details`, e dashboard com ocupantes, lojas e locais. As marcações da ferramenta de pontos exportam JSON
  no formato da API (pontos de spawn e locais);
- shell: lista de jogos (`/games`) na página inicial e no menu mobile, nome do jogo no cabeçalho e menu do
  jogo montado por `/content-counts` (criado para ele), categorias, bancadas e lojas. O item "Quests" saiu:
  não há modelo de quest na API.

As telas compartilham componentes de detalhe (pontos por mapa, ofertas de loja, drops, códigos, coleções,
variantes). O front não lê mais os JSON: `dataLoader`, `useApi`, `apiService`, `dbService`, os
repositories, o banco Dexie e os componentes que só eles usavam foram removidos. O cache fica com o
TanStack Query e o ETag da API.

Próximos passos, fora desta fase: telas que o backend já habilita e o front ainda não tem — gestão de
membros, fila de `pending-references`, cadastro a partir do 404 e histórico de revisões.

### Fase 8 — QueryBuilder
**Status: concluída.** Os filtros soltos na URL (`search`, `category`, `produces`, `activeEvents`,
`trade`, `bbox`...) deram lugar a um formato só, o QueryJson (ver 5), com `and`, `or` e grupos
aninhados. Decisões:

- **Listagem por `POST .../query`**, com o QueryJson no corpo e página, ordenação e `references` na
  URL. `GET` com o JSON na URL ficaria longo com listas de eventos e ocupantes. Por ser leitura, a
  rota é liberada sem login no `SecurityConfig` e fica fora do `RateLimitFilter`; o ETag, que só vale
  para `GET`, não se aplica a ela.
- **Os parâmetros antigos saíram**, sem período de convivência: o único cliente é o front, migrado
  junto. O `GET` da coleção (`/items`) deixou de existir.
- **Cada handler declara seus campos** (`specificFields()`), e o `AbstractContentHandler` junta os
  comuns. `hasCategories()`, `hasEvents()` e `hasAttributes()` dizem quais etiquetas o tipo tem,
  como já fazia `hasRarity()`. Os `/details` montam suas relações com o mesmo QueryJson.
- **Filtros viraram campos genéricos:** `trade` virou `buyable` e `sellable`; `active` de código, um
  booleano; `withoutCategory` é `category not_in`; `exclude` é `extId not_in`; `activeEvents` é
  `event is_null or event in [...]`; `bbox` é `position intersects`; `appliesTo=item` é
  `appliesTo in [item, both]`; `search` é `name contains or extId contains`.
- **Fora desta fase:** `/crafting-profits`, `/changes`, `/pending-references` e `/references`, que têm
  SQL próprio fora dos handlers, continuam com parâmetros na URL.

### Fase 9 — Filtros de tela vindos do backend
**Status: concluída.** A busca e os seletores acima de cada lista (categoria, sub-categoria, status,
raridade, bancada, tipo de evento, "ocultar expirados") saíram do front: `GET /{recurso}/query/filters`
descreve a barra, e o front a desenha com um componente só (`ListingFilterBar`). Decisões:

- **Declarados num lugar só**, `ListingFilterService`, como as relações do `DetailsService`. Opção
  fixa leva o QueryJson que aplica (Status, Agrupa); opção que é dado do jogo (categorias,
  raridades, bancadas, tipos de evento) é lida a cada pedido e usa `field equal valor`.
- **`field` no filtro**, e não só QueryJson pronto em cada opção: um valor que chega pela URL
  (`/items/list/flor`) e não está entre as opções ainda filtra, e as opções de dados ficam leves.
- **Validação na subida:** campo que não existe, campo sem `equal`/`not_equal` ou opção com QueryJson
  inválido impede a aplicação de subir, com o recurso e o filtro na mensagem.
- **O front espera o schema antes da primeira busca** (`useListing` lê o schema pelo mesmo cache da
  barra), para o filtro da URL já valer; erro no schema aparece como erro da listagem.
- **Filtro global de eventos ativos na raiz.** O schema diz se a listagem tem eventos (`activeEvents`,
  deduzido do campo `event`), e o hook de listagem do front põe na raiz de toda consulta um grupo só:
  `event is_null or event in [ativos]`. As telas não repassam mais o filtro. "Ocultar coletados" e
  "esconder completos" saíram por enquanto.
- **QueryJson sem ruído:** o JSON não leva mais `"group"` (vinha do `isGroup()` do record), e o front
  desfaz grupo vazio, grupo com um filho só e grupo com o mesmo operador do pai.
- Os rótulos dos tipos de evento conhecidos (clima, season, mapa, event) estão no serviço; tipo novo
  aparece com o próprio código.

---

## 7. Riscos e itens em aberto

| Risco | Mitigação |
|---|---|
| Sem FK, erro de digitação num id vira registro pendente silencioso | `pending-references` é a tela que expõe isso; ordenar por contagem faz o erro de digitação aparecer com contagem 1 no fim da fila |
| Colisão de ids entre tipos (99 em heartopia, 126 em windrose) | `kind` na identidade e na referência; `target_kind` vazio só quando a origem realmente não sabe |
| Cadastro aberto + jogo `community` é superfície de abuso | Flag `verified` para escrever, rate limit, `status=suspended`, e `content_revision` com restore e índice por autor para desfazer estrago em massa |
| Chave posicional: reordenar filhos reescreve `ordinal` | Escrita é sempre do agregado inteiro (4.6), então o `ordinal` é reescrito junto por definição |
| Flag `verified` ligada à mão vira gargalo se o cadastro crescer | É provisória por decisão; a tabela `user_link` a substitui sem mexer em autorização |
| Deduplicação de mídia depende da versão do FFmpeg | `+bitexact` garante bytes idênticos só dentro da mesma versão. A mesma imagem enviada em dev (FFmpeg da máquina) e em produção (8.0.1 do Ubuntu), ou reenviada depois de atualizar o FFmpeg da imagem Docker, gera outro hash: vira duplicata, não erro. Atualizar o FFmpeg em produção deve ser decisão consciente |
| Spring Boot 4.1 recente; starters renomeados | Validado na Fase 0: compila em Java 21, e `actuator`, `oauth2-resource-server` e `hibernate-spatial` resolvem. Testcontainers **não** é mais versionado pelo parent — o BOM entra explícito no pom |
| Boot 4 usa **Jackson 3** (`tools.jackson`), não Jackson 2 | `com.fasterxml.jackson` não está no classpath e `MappingJackson2HttpMessageConverter` está deprecado. Serialização manual onde não há conversor (filtros de segurança) |
| springdoc-openapi com Boot 4 | Adiado: exige springdoc 3.x. OpenAPI segue opcional, como previsto |
| Postgres como fonte da verdade sem backup | `pg_dump` agendado antes de aposentar os JSONs |

### Em aberto

- Sistema de vínculo de conta (email / Discord / Twitch / outro) — adiado por decisão;
  por ora só a flag `verified`.
- Formato cru do Satisfactory (`ID`/`Ingredients`/`ClassName`) não foi analisado; aquele
  jogo precisa de uma passada própria antes de entrar.
- Domínio e TLS na Hostinger (reverse proxy, certificado) — só importa quando for subir.
