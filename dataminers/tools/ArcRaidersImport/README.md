# ArcRaidersImport

Importa o ARC Raiders a partir dos dados do [arctracker.io](https://arctracker.io). **Não é mod e não lê o jogo.**
Duas fontes:

- a [API pública do arctracker](https://arctracker.io/developers/docs) (sem autenticação, um GET por recurso) para
  **itens, módulos da oficina e missões** — é a versão em dia do jogo;
- o clone do [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data), o repositório comunitário
  (MIT) por trás do arctracker, para **traduções** (`arctracker-ui/pt-BR.json`), **árvore de habilidades** e **imagens**.

O repositório parou antes da atualização 2.0: tem 581 itens, contra 985 na API (tábuas, posto avançado, pesquisa,
variantes de armas). Por isso os itens vêm da API, e o repositório fica com o que não mudou. As imagens que ele não
tem são baixadas uma vez do CDN do arctracker (o `imageFilename` de cada item).

O README do repositório pede atribuição. Ponha na descrição do jogo no site:

> Dados: [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data) e [arctracker.io](https://arctracker.io)

## Uso

**Duplo clique** no `ArcRaidersImport.exe` (em `bin\...\net9.0`): o modo interativo oferece baixar ou atualizar o
clone, pergunta se envia para a API (endereço, usuário e senha) e espera uma tecla antes de fechar a janela.

Pela linha de comando:

```powershell
# baixa o clone na primeira vez (ou atualiza) e exporta, para conferir (tools\ArcRaidersImport\out\arc_raiders)
dotnet run --project tools\ArcRaidersImport -- --update

# só exportar, com o clone já baixado
dotnet run --project tools\ArcRaidersImport

# exportar e enviar; a senha é pedida sem eco, ou lida de GP_PASSWORD
dotnet run --project tools\ArcRaidersImport -- --upload --user <usuário>
dotnet run --project tools\ArcRaidersImport -- --upload --user <usuário> --api http://192.168.2.38:8080
```

| Opção | Padrão |
| --- | --- |
| `--data <pasta>` | `tools\ArcRaidersImport\data\arcraiders-data` |
| `--update` | desligado; baixa o clone com o git, ou dá `pull` se já baixado |
| `--offline` | desligado; não consulta o arctracker e usa só o clone (versão antiga, sem a 2.0) |
| `--out <pasta>` | `tools\ArcRaidersImport\out` (fora do git); grava em `<out>\<jogo>` |
| `--game <id>` | `arc_raiders` |
| `--upload` | desligado: só exporta |
| `--api <url>` | `http://localhost:8080` (a API do Game Planner) |
| `--user <usuário>` | obrigatório com `--upload`; precisa ser owner/membro do jogo |
| `--no-images` | envia sem imagens; as já ligadas no servidor ficam |
| `--parallel <n>` | 4 imagens ao mesmo tempo |

Código de saída: `0` ok, `1` erro (fonte não encontrada, login, servidor fora), `2` envio concluído com documentos ou
imagens recusados (detalhes no console).

O console mostra de onde veio cada parte. Cada resposta da API fica em `data\arctracker\api`, e as imagens baixadas em
`data\arctracker\images`: sem rede, a ferramenta usa a última cópia; sem cópia, cai para o clone, com aviso.

O `--update` baixa só as pastas do clone que a ferramenta usa (~23 MB; o repositório inteiro passa de 230 MB por
causa das imagens de mapa). Ele precisa do git no PATH; o equivalente à mão é:

```powershell
git clone --depth 1 --filter=blob:none --sparse https://github.com/RaidTheory/arcraiders-data.git tools\ArcRaidersImport\data\arcraiders-data
git -C tools\ArcRaidersImport\data\arcraiders-data sparse-checkout set --no-cone "/*.json" "/items/*" "/hideout/*" "/quests/*" "/arctracker-ui/*" "/images/items/*" "/images/traders/*" "/images/workshop/*"
```

Reenviar é seguro: o PUT em lote substitui cada documento inteiro e não cria revisão quando nada mudou, e o cache de
mídia (`out\media-cache`) evita reenviar imagem que o servidor já tem.

## O que vira o quê

| Dado | Game Planner |
| --- | --- |
| itens | nome e descrição em pt-BR (inglês quando falta), raridade, valor de venda em moedas |
| `type` | sub-categoria do tipo, dentro de um grupo principal: Armas, Equipamentos, Materiais, Bugigangas, Esquemas, Chaves, Posto avançado, Pesquisas, Outros |
| `rarity` | raridades do jogo (Comum → Lendário), com cor; a cor pode ser ajustada no site |
| `weightKg`, `stackSize`, atributos de arma e escudo | atributos com rótulo e unidade |
| `effects` | atributos `effect_*`, rotulados pelo próprio efeito; o valor vem como os dados escrevem ("10s", "Heavy Ammo") |
| `foundIn`, `compatibleWith`, `questItem` | atributos "Pode ser encontrado em", "Compatível com", "Item de missão" |
| `recipe` + `craftBench` + `stationLevelRequired` | receita `craft_*` por bancada, com o nível do módulo; `craftQuantity` é a quantidade produzida |
| `blueprintLocked` | desbloqueio "Esquema" apontando para o item `{id}_blueprint` (ou `{base}_blueprint` nas armas com nível) |
| `craftSkills` | desbloqueio "Habilidade", com o nome da habilidade em `skillNodes.json` |
| `recyclesInto` / `salvagesInto` | receitas `recycle_*` e `salvage_*`, nas bancadas Reciclagem e Recuperação |
| `upgrades` (2.0) | receita `upgrade_*`: item + materiais → destino; com mais de um destino, uma por destino (`upgrade_{origem}_{destino}`), com o requisito de pesquisa ("Pesquisa") ou de nível de bancada |
| `upgradeCost` (no destino) + `upgradesTo` (na origem) | o mesmo, no formato antigo, para o que `upgrades` não cobre |
| `research` (2.0) | receita `research_*` na Estação de Pesquisa: custo + pontos de pesquisa → o item, com a missão exigida |
| `researchPoints` (2.0) | receita `research_points_*`: entregar o item na estação rende pontos de pesquisa |
| módulos da oficina | entidades (categoria Oficina), com nível máximo |
| níveis dos módulos | receita `build_{módulo}_{nível}` cujo produto é o módulo naquele nível; salas exigidas no posto avançado viram desbloqueio |
| `vendors` dos itens | comerciantes como entidades, uma loja cada, com categorias pelo nível exigido |
| `coins`, `creds`, pontos de pesquisa | itens de moeda criados pela ferramenta (os dados citam, mas não têm) |
| imagens | do clone (`images/items`, `images/traders`, `images/workshop`) ou baixadas do arctracker |

Tipos, locais e raridades vêm em inglês nos itens; os nomes em português saem de `arctracker-ui/pt-BR.json`. Os tipos
que nem o arctracker traduz (Outpost Furniture, Outpost Room, Research) têm nome definido em `ArcCatalog.TypeNames`.

### Fica de fora

- **Missões, mapas e projetos como conteúdo**: próxima etapa. Hoje as missões só dão o nome da missão exigida por uma
  pesquisa, e a árvore de habilidades, o nome da habilidade exigida por uma receita.
- **Reparo** (`repairCost`, `repairDurability`), **encaixes de modificação** (`modSlots`) e **mecânicas** (`mechanics`).
- **`trades.json`** do clone: parou antes da 2.0; as lojas saem do `vendors` de cada item.

## Código

| Pasta | Papel |
| --- | --- |
| `Source/ArcApi.cs` | API do arctracker: GET com cópia local e download das imagens que faltam |
| `Source/ArcSource.cs` | junta API e clone; `Localized` escolhe o idioma; `DataRepository` baixa o clone |
| `Mapping/ArcCatalog.cs` | raridades e categorias |
| `Mapping/ItemMapper.cs` | itens, atributos, moedas e imagens |
| `Mapping/StationMapper.cs` | módulos da oficina e custo de cada nível |
| `Mapping/RecipeMapper.cs` | fabricação, reciclagem, recuperação, melhoria e pesquisa |
| `Mapping/TraderMapper.cs` | comerciantes e lojas |
| `Mapping/ArcDatasetBuilder.cs` | ordem dos mapeadores e conferência das referências |

Modelo, JSON, exportação, cache de mídia e envio vêm do `mods/GamePlannerCore`, ligados no `.csproj` (sem cópia). O
cliente HTTP do Game Planner vem do porte do Terraria (`mods/GamePlannerTerraria/Core/Api`), que usa `HttpClient`.
