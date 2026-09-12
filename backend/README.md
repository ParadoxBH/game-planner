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

## Produção

```bash
cp .env.example .env    # editar
docker compose -f docker-compose.prod.yml up -d --build
```

A imagem já traz `ffmpeg`, requisito do subsistema de mídia (Fase 1), roda como
usuário sem privilégio e expõe a porta só no loopback — quem publica na internet
é o reverse proxy com TLS.
