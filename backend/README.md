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
`{recurso}` é `items`, `entities`, `categories` ou `events`.

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
evento `icon`, `banner`; o próprio jogo, via `PATCH /api/v1/games/{jogo}`, `icon`, `capsule`,
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
(mais `level` em item e entidade, e `periodStart` em evento), com `-` na frente para ordem
decrescente. Várias `category` combinam com E.

## Produção

```bash
cp .env.example .env    # editar
docker compose -f docker-compose.prod.yml up -d --build
```

A imagem já traz `ffmpeg`, requisito do subsistema de mídia (Fase 1), roda como
usuário sem privilégio e expõe a porta só no loopback — quem publica na internet
é o reverse proxy com TLS.
