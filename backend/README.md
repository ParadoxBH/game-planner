# Game Planner — Backend

API do Game Planner. Java 21, Spring Boot 4.1, PostgreSQL 16 + PostGIS, Flyway.

O desenho está em [`../doc/backend_plan.md`](../doc/backend_plan.md). Leia antes de
mexer no modelo de dados: várias decisões aqui são deliberadas e contraintuitivas
(nenhuma FK entre conteúdos, chave natural, referência a registro inexistente é
estado normal).

## Rodando local

```bash
./mvnw spring-boot:run
```

Só isso. O `spring-boot-docker-compose` sobe o `docker-compose.yml` sozinho e injeta a
conexão a partir do container — não precisa `docker compose up` antes, nem arquivo de
propriedades local. O banco fica de pé quando a aplicação para (`start-only`), então o
próximo Run é rápido. Para derrubar o banco: `docker compose stop`.

O Flyway aplica as migrations na subida. `ddl-auto` é `validate`: quem altera schema
é migration, nunca o Hibernate.

Verificação rápida:

```bash
curl http://localhost:8080/actuator/health
```

## IntelliJ

**Abrir o projeto.** O repositório é front + back. Duas formas:

- Abrir a pasta `backend/` direto (**File → Open → backend**). Mais simples: vira um
  projeto Maven puro.
- Abrir a raiz do repositório e, no aviso *"Maven build scripts found"*, clicar
  **Load Maven Project** (ou botão direito em `backend/pom.xml` → **Add as Maven
  Project**). Dá para trabalhar no front e no back na mesma janela.

**JDK.** *File → Project Structure → Project → SDK*: **21**.

**Lombok.** O plugin já vem no IntelliJ. O annotation processing é configurado pelo
próprio `pom.xml` na importação; se aparecer erro de getter inexistente, confira
*Settings → Build → Compiler → Annotation Processors → Enable annotation processing*.

**Rodar.** Abra `GameplannerserverApplication` e clique no ▶ ao lado do `main`.
O **working directory** da run configuration precisa ser `backend/` — é lá que o Spring
procura o `docker-compose.yml`. Importando como módulo Maven isso já é o padrão
(`$MODULE_WORKING_DIR$`); se aparecer *"No Docker Compose file found"*, é isso.
Docker Desktop precisa estar aberto.

**Testes.** Botão direito em `src/test/java` → **Run 'All Tests'**. Sobem PostGIS
próprio por Testcontainers, independente do banco de desenvolvimento.

**Chamar a API.** `http/api.http` tem todas as rotas prontas para o HTTP Client
(Ultimate). Escolha o ambiente **local** no topo do editor e crie
`http/http-client.private.env.json` (fica fora do Git) com a senha:

```json
{ "local": { "password": "uma-senha-com-10-ou-mais" } }
```

Rode **Registrar** uma vez e depois **Login**: o token fica guardado e as demais
requisições já saem autenticadas.

**Reload automático (opcional).** O `devtools` está no projeto. Para reiniciar a
aplicação ao salvar: *Settings → Build → Compiler → Build project automatically* e
*Settings → Advanced Settings → Allow auto-make to start even if developed application
is currently running*.

## Testes

```bash
./mvnw verify
```

Testes de integração sobem PostGIS por Testcontainers — **exigem Docker rodando**.
Eles usam porta aleatória, independente do container do `docker compose`.

## Problemas conhecidos no Windows

**`password authentication failed for user "gameplanner"`** — há um PostgreSQL instalado
nativamente ocupando a 5432. Por isso o compose publica em **5433**: os dois convivem sem
que o conflito vire um erro que despista.

**`Could not find a valid Docker environment`** nos testes — o Docker Desktop usa o
contexto `desktop-linux` (`npipe:////./pipe/dockerDesktopLinuxEngine`), e versões antigas
do Testcontainers só procuravam o pipe padrão. Resolvido subindo para 1.21.4, que lê o
`docker context`. Não mexa na versão para baixo sem testar isso de novo.

## Convenções do banco

- **Todo campo de texto é `text`**, nunca `varchar` ou variação. `SchemaConventionsTest` falha se
  alguma migration fugir disso. As únicas colunas `varchar` do banco são de tabelas que não são
  nossas: `flyway_schema_history` (Flyway) e o catálogo do PostGIS.
- **`content_media` não tem chave estrangeira.** A ligação de imagem pertence ao código do
  registro e pode existir antes dele. `SchemaConventionsTest` também confere isso.
- **Nunca edite uma migration já aplicada.** O Flyway confere o checksum; mudança vira uma
  migration nova.

## Primeiro administrador

Cadastro é aberto, mas conta nova nasce sem vínculo (`verified = false`) e sem poder
escrever. O primeiro `platform_admin` é promovido direto no banco:

```sql
UPDATE app_user SET platform_admin = true, verified = true WHERE username = 'seu-usuario';
```

Daí em diante ele libera os demais por `PATCH /api/v1/users/{username}`.

## Endpoints da Fase 0

| Método | Rota | Quem |
|---|---|---|
| POST | `/api/v1/auth/register` | qualquer um |
| POST | `/api/v1/auth/login` | qualquer um |
| POST | `/api/v1/auth/refresh` | qualquer um |
| GET | `/api/v1/auth/me` | autenticado |
| GET | `/api/v1/games` | qualquer um (lista só o visível) |
| GET | `/api/v1/games/{id}` | conforme `read_policy` |
| POST | `/api/v1/games` | `platform_admin` |
| PATCH | `/api/v1/games/{id}` | `owner` |
| GET | `/api/v1/games/{id}/members` | quem lê o jogo |
| PUT | `/api/v1/games/{id}/members/{username}` | `owner` |
| DELETE | `/api/v1/games/{id}/members/{username}` | `owner` |
| PATCH | `/api/v1/users/{username}` | `platform_admin` |

## Mídia (Fase 1)

Toda imagem enviada é reconvertida para WebP pelo FFmpeg em três tamanhos — `icon` 128 px,
`thumb` 512 px e `full` 1920 px, sempre o maior lado e sem nunca ampliar. O id é o
SHA-256 do resultado: reenviar a mesma imagem devolve o mesmo id sem gravar de novo.
Desenho completo em `doc/backend_plan.md` 4.7.

| Método | Rota | Quem |
|---|---|---|
| POST | `/api/v1/media` (multipart, campo `file`) | conta ativa com vínculo |
| GET | `/api/v1/media/{id}` | qualquer um |
| DELETE | `/api/v1/media/{id}` | quem enviou ou `platform_admin` |
| GET | `/media/{id}/{icon\|thumb\|full}.webp` | qualquer um, com cache permanente |

**FFmpeg é requisito.** A imagem Docker já traz. Rodando pela IDE, `ffmpeg` e `ffprobe`
precisam estar no PATH, ou aponte com `FFMPEG_PATH` e `FFPROBE_PATH`. Sem eles a aplicação
sobe normalmente, avisa no log, e só o upload responde `503`. O teste de conversão é pulado
automaticamente onde o FFmpeg não está instalado.

Limites, em `application.properties`: 8 MB por arquivo, 40 megapixels, 300 quadros de
animação e 20 s de conversão por tamanho. Formatos aceitos: PNG, JPEG, WebP e GIF — GIF
animado vira WebP animado.

Em desenvolvimento os arquivos ficam em `backend/var/media/`, fora do Git. Em produção,
no volume `media-data`.

## Conteúdo (Fase 2)

Itens, entidades, categorias e eventos usam as mesmas rotas e as mesmas regras.
`{recurso}` é `items`, `entities`, `categories`, `events`, `recipes`, `shops`, `shop-categories`,
`maps`, `locations`, `spawn-points`, `collections`, `collection-groups` ou `codes`.

| Método | Rota | Quem |
|---|---|---|
| GET | `/api/v1/games/{jogo}/{recurso}?search=&category=&event=&rarity=&page=&size=&sort=` | quem lê o jogo |
| GET | `/api/v1/games/{jogo}/{recurso}/{extId}` | quem lê o jogo |
| POST | `/api/v1/games/{jogo}/{recurso}` | quem edita o jogo |
| PUT | `/api/v1/games/{jogo}/{recurso}/{extId}` | quem edita o jogo |
| PUT | `/api/v1/games/{jogo}/{recurso}` (lote) | quem edita o jogo |
| DELETE | `/api/v1/games/{jogo}/{recurso}/{extId}` | `moderator`+ |
| GET | `/api/v1/games/{jogo}/{recurso}/{extId}/revisions` e `/revisions/{n}` | quem lê o jogo |
| POST | `/api/v1/games/{jogo}/{recurso}/{extId}/revisions/{n}/restore` | `moderator`+ |
| GET | `/api/v1/games/{jogo}/pending-references?kind=` | quem lê o jogo |
| GET | `/api/v1/games/{jogo}/search?q=&kind=` | quem lê o jogo |
| GET | `/api/v1/games/{jogo}/references?target=&field=` | quem lê o jogo |
| GET | `/api/v1/games/{jogo}/recipe-stations` | quem lê o jogo |
| GET | `/api/v1/games/{jogo}/changes?since=&by=` | quem lê o jogo |
| GET, PUT, DELETE | `/api/v1/games/{jogo}/attributes/{chave}` | ler, editar, `moderator` |
| GET, PUT, DELETE | `/api/v1/games/{jogo}/rarities/{código}` | ler, editar, `moderator` |
| GET | `/api/v1/games/{jogo}/{recurso}/{extId}/media` | quem lê o jogo |
| POST, PUT | `/api/v1/games/{jogo}/{recurso}/{extId}/media` | quem edita o jogo |
| DELETE | `/api/v1/games/{jogo}/{recurso}/{extId}/media/{uso}/{mediaId}` | quem edita o jogo |
| GET | `/api/v1/media/orphans` | `platform_admin` |

**Escrita é do documento inteiro.** `PUT` substitui tudo, inclusive categorias, eventos e
atributos: campo omitido vira vazio. Reenviar um documento igual ao gravado devolve o atual
sem gravar e sem criar revisão, então reimportar a base inteira é seguro. O lote (`PUT` na
coleção, até 1000 documentos) é uma transação: entra tudo ou nada, e o erro traz o `index`
do documento que falhou.

**Referência nunca exige existência.** Categoria, evento, `variantOf` e `currency` podem
apontar para id não cadastrado. `pending-references` lista o que falta, do mais citado para
o menos, e o 404 de um id ausente traz `referenceCount` e `referencedBy`.

**Ids vão na URL.** Aceitam espaço e parênteses — a base tem `lox bite` e `Hound (1)_…` —,
até 128 caracteres, sem `/ \ ? # % ;` e sem espaço nas pontas. Codifique na URL:
`/items/lox%20bite`.

**Imagens** ficam na tabela de relacionamento `content_media` e vão no documento como lista:

```json
"media": [
  { "usage": "icon", "mediaId": "…" },
  { "usage": "screenshot", "mediaId": "…" },
  { "usage": "screenshot", "mediaId": "…" }
]
```

`mediaId` é o id devolvido por `POST /api/v1/media`, nunca um caminho de arquivo, e a mídia
precisa existir (senão `422`). Usos aceitos: item e entidade `icon`, `screenshot`; categoria e
evento `icon`, `banner`; receita `icon`; loja e categoria de loja `icon`, `banner`; mapa `icon`, `thumbnail`; local `icon`, `banner`,
`screenshot`; ponto de spawn `icon`, `screenshot`; coleção e grupo de coleção `icon`, `banner`; código de resgate nenhum;
o próprio jogo, via `PATCH /api/v1/games/{jogo}`, `icon`, `capsule`,
`thumbnail`, `banner`. A ordem dentro de cada uso é a da lista. A resposta traz `addedBy` e
`addedAt` de cada imagem, que se mantêm enquanto ela continuar no mesmo uso. Entre vários
ícones, o exibido é o mais recente. Mídia em uso não pode ser apagada (`409`).

**A ligação pertence ao código do registro, não ao registro.** Durante o cadastro, dá para anexar
imagens antes de criar o conteúdo — o código não se repete. As rotas `.../{extId}/media`
funcionam exista o registro ou não: `POST` anexa uma imagem no fim do uso (repetir não duplica),
`PUT` substitui ou reordena, `DELETE .../media/{uso}/{mediaId}` remove. Gravar o documento **sem**
o campo `media` não mexe nas imagens; com `media`, mesmo vazio, substitui. Apagar o conteúdo não
apaga as ligações.

**Atributos** aceitam número, texto ou booleano, com ou sem definição. Se a chave tem
definição em `/attributes`, o tipo é conferido e divergência dá `422`.

**Paginação** começa em `page=0`. `sort` aceita `name`, `extId`, `createdAt` e `updatedAt`
(mais `level` em item e entidade, `periodStart` em evento e `craftTimeSeconds` em receita), com `-` na frente para ordem
decrescente. Várias `category` combinam com E. Toda listagem aceita também `withoutCategory` (exclui categorias),
`exclude` (esconde esses códigos, ex.: os códigos de resgate já coletados) e
`activeEvents` (esconde conteúdo de evento fora da lista; vazio mostra só o que não tem evento), com códigos
separados por vírgula. Itens aceitam `trade`: `buyable` (preço base de compra ou vendido em loja), `sellable`,
`traded` ou `untraded`. Itens e entidades aceitam `variantOf` (código do conteúdo base). Eventos aceitam `type` (tipo do
evento) e categorias, `appliesTo` (`item` e `entity` trazem também as categorias de ambos). Com `references=true`, a página traz
também `references`: toda referência citada pelos documentos da página, com nome e ícone, como no detalhe.

## Crafting e economia (Fase 3)

Receitas, lojas e categorias de loja usam as rotas de conteúdo acima (`recipes`, `shops`,
`shop-categories`), com revisões, lote, pendências e imagens. Drops e requisitos ficam dentro do
documento da entidade.

**Listas posicionais.** Ingredientes, produtos, drops, requisitos e itens de loja são listas: a
ordem é a do documento e o mesmo alvo pode se repetir — quatro slots com o mesmo ingrediente, dois
drops do mesmo item com chances diferentes, o mesmo item em pacotes de tamanhos diferentes. Todo
alvo é `{ "kind": "item", "extId": "madeira" }`, e `kind` pode faltar quando a origem não sabe o
tipo.

```json
{ "extId": "tabua", "craftTimeSeconds": 30, "stations": ["bancada"],
  "inputs":  [ { "target": { "kind": "item", "extId": "madeira" }, "amount": 2 },
               { "target": { "kind": "item", "extId": "serrote" }, "amount": 1, "notConsumed": true } ],
  "outputs": [ { "target": { "kind": "item", "extId": "tabua" }, "amount": 4 } ],
  "unlock":  [ { "type": "event", "target": { "kind": "event", "extId": "gala_neve" } },
               { "type": "station_level", "value": "2" } ] }
```

- **Receita:** `name` é opcional; sem ele, a busca e a exibição usam o nome do primeiro produto
  cadastrado. `notConsumed: true` marca o que é exigido mas não gasto (padrão `false`). `chance` vai de 0 a 1. `stations` são códigos de
  entidade.
- **Entidade:** `requirements` (mesma forma do ingrediente) e `drops`
  (`{ target, chance, amount, maxAmount }`). O documento é inteiro: `PUT` sem `drops` apaga os drops.
- **Loja** em três partes: `shops` (`npc`, `resetType`), `shop-categories` (`shop` = código da loja,
  `resetType`, `events`, `items`) e os itens da categoria (`target`, `quantity` = tamanho do
  pacote, `purchaseLimit`, `price`, `currency`, `resetType`, `rarityCode`). A categoria pode ser
  cadastrada antes da loja, que aparece em `pending-references` enquanto não existir.
- `resetType` e `unlock.type` são códigos livres em minúsculas, ex.: `daily`, `weekly`, `unique`,
  `event`, `quest`, `station_level`.

**O que produz, consome, vende ou dropa.** Alvo como `tipo:id`, ou só `id` para qualquer tipo:

| Rota | Filtros |
|---|---|
| `GET /api/v1/games/{jogo}/recipes` | `produces`, `consumes`, `station` |
| `GET /api/v1/games/{jogo}/entities` | `drops`, `requires` |
| `GET /api/v1/games/{jogo}/shop-categories` | `sells`, `shop` |
| `GET /api/v1/games/{jogo}/shops` | `npc` |
| `GET /api/v1/games/{jogo}/references?target=&field=` | toda origem que aponta para o alvo, de qualquer tipo |

## Mundo (Fase 4)

Mapas, locais e pontos de spawn usam as rotas de conteúdo (`maps`, `locations`, `spawn-points`).
Geometria é **WKT em coordenadas de jogo**, com ou sem Z, igual aos JSON atuais. O servidor valida
(tipo certo, polígono sem autointerseção) e devolve o texto normalizado: `POINT Z (1147.01 1185.50 37.39)`
volta como `POINT Z(1147.01 1185.5 37.39)`, e reenviar o mesmo ponto escrito de outro jeito não gera
revisão.

```json
{ "extId": "bau-1", "map": "Caldera", "position": "POINT Z (1147.01 1185.50 37.39)",
  "respawnMode": "once", "events": ["gala_neve"],
  "occupants": [ { "target": { "kind": "entity", "extId": "bau" }, "chance": 1 } ],
  "drops":     [ { "target": { "kind": "item", "extId": "ouro" }, "chance": 0.06, "amount": 1, "maxAmount": 3 } ] }
```

- **Ponto de spawn:** `position` é ponto; sem ele, o ponto precisa de `location` e vale para o local
  inteiro (minério num bioma). `occupants` é o que aparece ali (chance e quantidade opcionais);
  `drops`, o que o ponto larga além do drop da entidade. Sem `name`, a exibição e a busca usam o nome
  do primeiro ocupante cadastrado.
- **Local:** `area` é polígono, multipolígono ou ponto (POI), e pode faltar. `locationType` é código
  livre (`region` por padrão, `biome`, `poi`...). `parent` é o local que o contém.
- **Mapa:** `mapType` (`single`, `layered`, `tile`, `procedural`), `imageUrl` ou `urlPattern` +
  `layers`, `bounds` e `tiles` como `{ minX, minY, maxX, maxY }`, `minZoom`, `maxZoom`, `rotate`
  (quartos de volta, 0 a 3), `defaultView`, `availableViews`, `defaultFilters` (`types`,
  `categories`, `entities`) e `weathers` (eventos de clima). Nos JSON antigos, `bounds` estava na
  ordem do Leaflet, `[[minY, minX], [maxY, maxX]]`.

| Rota | Filtros |
|---|---|
| `GET /api/v1/games/{jogo}/spawn-points` | `map`, `location` (ligados ao local ou dentro da área), `occupant`, `occupantCategory`, `drops`, `bbox` |
| `GET /api/v1/games/{jogo}/locations` | `containing` (código de ponto), `parent`, `type`, `map` |
| `GET /api/v1/games/{jogo}/maps/{mapa}/spawn-points` | marcadores compactos, sem página: mesmos filtros, mais `limit` (até 10000); `truncated` avisa se cortou |

`bbox` é `minX,minY,maxX,maxY` em coordenadas de jogo. Alvos como `entity:bau` ou só `bau`.

## Coleções e códigos (Fase 5)

**Coleção** (`collections`) é o conjunto exibido, como "Flores e Hibridações". Os membros ficam nos
**grupos** (`collection-groups`), que têm código próprio e podem estar em mais de uma coleção:

```json
{ "extId": "set_margarida", "name": "Margaridas", "collections": ["flower", "seed"],
  "members": [ { "kind": "item", "extId": "margarida_vermelha" },
               { "kind": "item", "extId": "margarida_branca" } ] }
```

**Código de resgate** (`codes`) é identificado pelo próprio código, como o jogador digita:
`PUT /api/v1/games/heartopia/codes/SPRINGFEST2026`. `name` é opcional; `addedOn` e `expiresOn` são
datas, e o código vale até o fim de `expiresOn`.

```json
{ "addedOn": "2026-05-18", "expiresOn": "2026-06-30",
  "rewards": [ { "target": { "kind": "item", "extId": "estrela_desejavel" }, "amount": 3 } ] }
```

| Rota | Filtros |
|---|---|
| `GET /api/v1/games/{jogo}/collections` | `member` (coleções com um grupo que tem o alvo) |
| `GET /api/v1/games/{jogo}/collection-groups` | `collection`, `member` |
| `GET /api/v1/games/{jogo}/codes` | `active` (`true` = ainda vale hoje), `rewards`; `sort` aceita `addedOn` e `expiresOn` |

## Agregações (Fase 6)

**Detalhe numa chamada:** `GET /api/v1/games/{jogo}/{recurso}/{extId}/details`, para qualquer
recurso de conteúdo. Traz:

- `document`: o conteúdo;
- `related`: uma página por relação, sempre presente, até 200 documentos cada (com `total`);
- `references`: toda referência citada pelo documento e pelos relacionados, com `name` e
  `iconMediaId` — `resolvedKind` nulo quando o alvo não está cadastrado;
- `categoryMembers`: em receita, os itens e entidades de cada categoria usada como ingrediente.

| Recurso | Relações |
|---|---|
| item | `producedBy`, `usedIn`, `droppedBy`, `dropPoints`, `spawnPoints`, `soldIn`, `requiredBy`, `rewardOf`, `collectionGroups`, `variants` |
| entidade | `producedBy`, `usedIn`, `craftedHere`, `droppedBy`, `spawnPoints`, `soldIn`, `requiredBy`, `shops`, `rewardOf`, `collectionGroups`, `variants` |
| receita | `soldIn`, `rewardOf` |
| categoria | `items`, `entities`, `shops`, `producedBy`, `usedIn` |
| evento | `items`, `entities`, `categories`, `recipes`, `shops`, `shopCategories`, `maps`, `mapsWithWeather`, `locations`, `spawnPoints`, `collections`, `collectionGroups` |
| loja | `categories` |
| local | `spawnPoints`, `children` |
| ponto de spawn | `locations` |
| mapa | `locations` |
| coleção | `groups` |

**Árvore de crafting:** `GET /api/v1/games/{jogo}/crafting-tree?target=item:tabua&amount=6`.

- Com receita, crafta. Sem receita, compra na oferta mais barata por unidade; sem oferta, usa o
  preço base; sem nada, é recurso base.
- Moeda que é conteúdo vira nó filho com o valor gasto e desce na árvore.
- `choices` se repete: `category:vegetal=item:tomate` escolhe o membro da categoria (sem escolha,
  a categoria fica em aberto); `item:prego=buy` compra em vez de craftar; `item:prego=base` para ali;
  `item:prego=fazer_prego_2` escolhe a receita.
- Lotes e pacotes são sempre inteiros. O que sobra (o excedente do último lote, o resto do pacote,
  os subprodutos da receita) vai para o estoque, e o próximo passo que precisa do mesmo alvo usa o
  estoque antes de craftar ou comprar de novo. Ferramenta não consumida é obtida uma vez.
- Cada nó traz `source` (`recipe`, `shop`, `price`, `base`, `stock`, `category`, `cycle`), `amount`,
  `fromStock` (quanto veio do que sobrou), `leftover` (quanto sobrou dele), nome, ícone, `recipe`
  (lotes, produzido, tempo, bancadas), `purchase` (pacotes, custo, moeda), `alternatives` (receitas
  do alvo), `buyable` e `children`. `totals` soma recursos base, ferramentas (não consumidos),
  `leftovers` (o que sobrou no fim), compras, receitas, bancadas, tempo, categorias em aberto e ciclos.

**Cache:** toda leitura da API responde com `ETag` e `Cache-Control: no-cache`. Reenviando
`If-None-Match`, a resposta é `304` sem corpo quando nada mudou.

## Produção

```bash
cp .env.example .env    # editar
docker compose -f docker-compose.prod.yml up -d --build
```

A imagem já traz `ffmpeg`, requisito do subsistema de mídia (Fase 1), roda como
usuário sem privilégio e expõe a porta só no loopback — quem publica na internet
é o reverse proxy com TLS.
