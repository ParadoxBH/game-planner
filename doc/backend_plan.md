# Backend — Análise e Plano

Documento de planejamento do servidor Java/Spring/Postgres do Game Planner.
Escrito a partir da análise do front atual (`src/`) e da base em `public/data/`.

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

4.002 arquivos em `public/img|map|icon`. Os bytes nunca entram no Postgres — no máximo os
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
  thumbnail text, capsule text, icon text,
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
`icon`, `image`, `created_by`, `updated_by`, `created_at`, `updated_at`,
`PRIMARY KEY (game_id, ext_id)`.

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

CREATE TABLE location (           -- bioma, região, POI — o que hoje é referencePoint type=location|biome|poi
  game_id text, ext_id text,
  ... base ...,
  location_type text NOT NULL,    -- biome|region|poi|dungeon
  parent_ext_id text,             -- hierarquia, textual, pode apontar para o vazio
  map_ext_id    text,
  area geometry(Geometry, 0),     -- polígono da região
  PRIMARY KEY (game_id, ext_id)
);

CREATE TABLE spawn_point (        -- ocorrência concreta no mapa
  game_id text, ext_id text,
  ... base ...,
  map_ext_id      text,
  location_ext_id text,
  position        geometry(Geometry, 0) NOT NULL,
  respawn_mode    text,           -- once|respawn|daily|weekly
  respawn_delay_minutes int,
  PRIMARY KEY (game_id, ext_id)
);
CREATE INDEX ON spawn_point USING gist (position);
CREATE INDEX ON location    USING gist (area);

CREATE TABLE spawn_occupant (     -- o que aparece nesse ponto
  game_id text, spawn_ext_id text, ordinal int,
  target_kind text, target_ext_id text NOT NULL,
  chance numeric, qty_min int, qty_max int,
  PRIMARY KEY (game_id, spawn_ext_id, ordinal)
);
```

`geom` usa **SRID 0** — coordenadas de jogo, não geográficas. `ST_Within` substitui o ray
casting de `spatial.ts`. O WKT que já existe nos JSONs entra direto via `ST_GeomFromText`.

```sql
CREATE TABLE recipe (
  game_id text, ext_id text, ... base ...,
  craft_time_seconds int,
  PRIMARY KEY (game_id, ext_id)
);
-- ordinal = o slot da bancada quando o jogo é baseado em slot (Outward, Minecraft)
CREATE TABLE recipe_input   (game_id, recipe_ext_id, ordinal int, target_kind, target_ext_id, amount numeric, consumed boolean DEFAULT true, PRIMARY KEY (game_id, recipe_ext_id, ordinal));
CREATE TABLE recipe_output  (game_id, recipe_ext_id, ordinal int, target_kind, target_ext_id, amount numeric, chance numeric, PRIMARY KEY (game_id, recipe_ext_id, ordinal));
CREATE TABLE recipe_station (game_id, recipe_ext_id, ordinal int, target_kind, target_ext_id,                                                PRIMARY KEY (game_id, recipe_ext_id, ordinal));

CREATE TABLE shop (
  game_id text, ext_id text, ... base ...,
  npc_kind text, npc_ext_id text,
  banner text,
  PRIMARY KEY (game_id, ext_id)
);
CREATE TABLE shop_offer (         -- groups[].items[] achatado
  game_id text, shop_ext_id text, ordinal int,
  target_kind text, target_ext_id text NOT NULL,
  group_label text, reset_type text,          -- daily|weekly|unique
  amount numeric, price numeric,
  currency_kind text, currency_ext_id text,
  stock int, rarity_code text,
  PRIMARY KEY (game_id, shop_ext_id, ordinal)
);
CREATE TABLE shop_offer_cost (    -- troca por itens em vez de moeda
  game_id, shop_ext_id, offer_ordinal int, ordinal int,
  target_kind, target_ext_id text NOT NULL, amount numeric,
  PRIMARY KEY (game_id, shop_ext_id, offer_ordinal, ordinal)
);

CREATE TABLE drop_entry (         -- unifica entity.drops e referencePoint.customDrops
  game_id text,
  source_kind text NOT NULL,      -- entity|spawn_point
  source_ext_id text NOT NULL,
  ordinal int,
  target_kind text, target_ext_id text NOT NULL,
  chance numeric, qty_min int, qty_max int,
  PRIMARY KEY (game_id, source_kind, source_ext_id, ordinal)
);
```

Tipos restantes, mesma forma: `category`, `game_event`, `collection`, `collection_group`,
`collection_member`, `game_map`, `redemption_code`, `redemption_reward`.

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
| `shop.groups[].items[]` aninhado | `shop_offer` plano com `group_label` + `ordinal` | CRUD de uma oferta não deveria reescrever o grupo inteiro |
| `event: string \| string[]` | `content_event` | hoje normalizado em runtime em três lugares (`event \|\| events`) |
| `conditions: Record<string, any>` | `content_condition` tipada | condição precisa ser filtro, não texto |
| `entity.drops` + `referencePoint.customDrops` + `spawns[].customDrops` | `drop_entry` com `source_kind` | três tabelas com o mesmo significado; o `getItemDetails` hoje concatena as três na mão |
| `geom: { type, coordinates: "POLYGON((...))" }` | coluna `geometry` PostGIS | parser WKT manual em `wkt.ts` deixa de existir |

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
  id             text PRIMARY KEY,      -- sha256 do arquivo JÁ convertido
  game_id        text,                  -- nulo = mídia global
  width int, height int,
  uploaded_by    text NOT NULL,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  source_name    text,                  -- nome original, só para exibição
  source_mime    text,                  -- o que o ffprobe identificou na entrada
  source_bytes   bigint,
  animated       boolean NOT NULL DEFAULT false
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

Conteúdo aponta para mídia por `icon_media_id` / `image_media_id` — referência textual,
sem FK, igual a todo o resto (2.1). Ícone apontando para mídia inexistente é o mesmo caso
já previsto.

#### Pipeline de upload

1. Limite de tamanho rejeitado **antes** de ler o corpo (`max-file-size`).
2. `ffprobe` identifica o formato real e as dimensões. Rejeita o que não for imagem, e
   rejeita acima de um teto de megapixels — proteção contra bomba de descompressão, que
   um limite de bytes sozinho não pega.
3. `ffmpeg` converte para WebP gerando três variantes, sempre com `-map_metadata -1`
   (tira EXIF, GPS e afins) e decoder explícito em vez de autodetecção.
4. Hash do resultado, gravação no storage, `INSERT` idempotente.

Padrões propostos, todos configuráveis:

| Parâmetro | Valor |
|---|---|
| Tamanho máximo do upload | 8 MB |
| Teto de megapixels na entrada | 40 MP |
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
- O arquivo original é descartado após a conversão. Só o WebP gerado existe no disco.
- Servido com `Content-Type: image/webp` fixo e `X-Content-Type-Options: nosniff`, de
  rota que não executa nada.
- FFmpeg roda com timeout, sem shell, argumentos por lista — nome de arquivo do usuário
  nunca chega na linha de comando.
- Rate limit e cota por usuário; upload exige `verified`, como toda escrita.
- Mídia sem nenhuma referência é coletada por rotina de limpeza (`GET /media/orphans`
  para inspecionar antes).

#### O acervo atual passa pelo mesmo cano

Os 4.002 arquivos de `public/img|map|icon` (108 MB, em PNG e JPG) podem ser reenviados
pelo parser externo por esse mesmo endpoint. Além de unificar o armazenamento, converter
o acervo para WebP costuma cortar entre 25% e 35% do peso. Não é pré-requisito de nada —
os caminhos estáticos atuais continuam funcionando enquanto não forem migrados.

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
GET /api/v1/games
GET /api/v1/games/{game}
GET /api/v1/games/{game}/items?search=&category=&rarity=&event=&attr.peso=&page=&size=&sort=
GET /api/v1/games/{game}/items/{extId}
GET /api/v1/games/{game}/items/{extId}/details        <- agregado
GET /api/v1/games/{game}/entities | /locations | /recipes | /shops | /categories | /events | /collections | /codes
GET /api/v1/games/{game}/maps/{mapId}/spawn-points?bbox=&target=&category=&event=
GET /api/v1/games/{game}/locations/{extId}/spawn-points     <- ST_Within
GET /api/v1/games/{game}/crafting-tree?target=&amount=&choices=
GET /api/v1/games/{game}/search?q=                          <- sobre content_ref
```

### Referências pendentes — o fluxo de cadastro

```
GET /api/v1/games/{game}/pending-references?kind=&page=&size=
```

```json
{
  "content": [
    { "extId": "minerio_ferro", "guessedKind": "item", "referenceCount": 14,
      "referencedBy": [
        { "kind": "recipe", "extId": "recipe_barra_ferro", "field": "input" },
        { "kind": "shop",   "extId": "loja_blanc",         "field": "offer" }
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
  "referencedBy": [ ... ],
  "suggestedName": "Minério de Ferro"
}
```

O front usa isso para abrir a tela de cadastro já preenchida com o que as origens sabem.

### Escrita — autenticada, autorizada por jogo

Mesmos caminhos da leitura, métodos diferentes. Não há prefixo `/admin`: a autorização é
função do jogo, não da rota.

```
POST   /api/v1/games/{game}/{resource}              cria
PUT    /api/v1/games/{game}/{resource}              upsert em lote (array)
PATCH  /api/v1/games/{game}/{resource}/{extId}      edita
DELETE /api/v1/games/{game}/{resource}/{extId}

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
DELETE /api/v1/media/{id}         [quem subiu, ou moderator]
GET    /api/v1/media/orphans      mídia sem referência     [moderator]

GET    /media/{id}/{variant}.webp   o arquivo — fora de /api, Cache-Control immutable
```

`POST` devolve `{ id, width, height, variants: { icon, thumb, full } }`. Reenviar a mesma
imagem devolve o mesmo `id` sem gravar de novo.

`PUT` em lote é transacional e idempotente por `(game_id, ext_id)`; devolve
`{ created, updated, unchanged }`. Nenhuma carga é rejeitada por referência inexistente —
elas só passam a constar em `pending-references`.

**Ordem de carga para o parser externo:** irrelevante. Sem FK entre conteúdos, qualquer
ordem funciona. Essa é a consequência prática mais útil do princípio 2.1.

### Convenções

- Erros em `ProblemDetail` (RFC 9457, nativo no Spring).
- Paginação `{ content, page, size, total, totalPages }`.
- OpenAPI em `/swagger-ui`.

---

## 6. Roadmap — fatias verticais

Cada fatia entrega migration + leitura + escrita + testes do seu grupo.

### Fase 0 — Fundação e identidade
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
`media`, `media_variant`, pipeline FFmpeg, storage em volume, endpoint de upload e de
entrega. Vem antes do conteúdo porque todo tipo de conteúdo tem ícone, e `icon_media_id`
nasce junto com as tabelas da fase seguinte.

### Fase 2 — Núcleo de conteúdo
`item`, `entity`, `category`, `game_event`, `content_category`, `content_event`,
`attribute_definition`, `content_attribute`, `content_revision` (com restore).
View `content_ref`, busca global, **`pending-references` e o 404 enriquecido**.
Ao fim desta fase o parser externo já sobe o grosso da base.

### Fase 3 — Crafting e economia
`recipe` + inputs/outputs/stations, `shop` + offers/costs, `drop_entry`.
Consultas "o que produz X", "o que consome X", "onde se compra X", "quem dropa X".

### Fase 4 — Mundo (PostGIS)
`game_map`, `location`, `spawn_point`, `spawn_occupant`. Consulta por bbox e
`ST_Within` substituindo `spatial.ts`. Índices GiST.

### Fase 5 — Extras
`collection`, `collection_group`, `redemption_code`.

### Fase 6 — Agregações
Endpoints `/details`, `crafting-tree` no servidor, ETag e `Cache-Control`.

### Fase 7 — Migração do front (depois, incremental)
1. Trocar `dataLoader` por chamadas à API, mantendo Dexie como cache offline — muda
   ~1 arquivo, o front continua funcionando igual.
2. Consolidar os 16 componentes que falam com repositories atrás de um único `apiClient`.
3. Trocar `getItemDetails`/`getEntityDetails` pelos endpoints agregados e apagar as
   varreduras do `apiService`.
4. Telas novas que o backend habilita: login, gestão de membros, fila de
   `pending-references`, cadastro a partir do 404, histórico de revisões.

---

## 7. Riscos e itens em aberto

| Risco | Mitigação |
|---|---|
| Sem FK, erro de digitação num id vira registro pendente silencioso | `pending-references` é a tela que expõe isso; ordenar por contagem faz o erro de digitação aparecer com contagem 1 no fim da fila |
| Colisão de ids entre tipos (99 em heartopia, 126 em windrose) | `kind` na identidade e na referência; `target_kind` vazio só quando a origem realmente não sabe |
| Cadastro aberto + jogo `community` é superfície de abuso | Flag `verified` para escrever, rate limit, `status=suspended`, e `content_revision` com restore e índice por autor para desfazer estrago em massa |
| Chave posicional: reordenar filhos reescreve `ordinal` | Escrita é sempre do agregado inteiro (4.6), então o `ordinal` é reescrito junto por definição |
| Flag `verified` ligada à mão vira gargalo se o cadastro crescer | É provisória por decisão; a tabela `user_link` a substitui sem mexer em autorização |
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
