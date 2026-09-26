# Mineradores de dados (dataminers)

Mods que leem os dados de dentro do jogo e enviam para a API do Game Planner (ou exportam em JSON).
Mesma arquitetura dos mods do Valheim: um núcleo genérico e um mod fino por jogo. Quase todos são mods
BepInEx de jogo Unity; o do Terraria é mod do tModLoader e tem regras próprias (veja abaixo).

```
dataminers/
  GamePlannerDataminers.sln
  Directory.Build.props / .targets   regras de build de todos os projetos (sem copiar DLL de jogo, sem .pdb)
  libs/
    copy-libs.ps1                    copia as DLLs abaixo (não vão para o git)
    Common/                          BepInEx, Harmony e módulos da Unity usados pelo Core
    Valheim/                         assemblies do Valheim
    HowToFish/                       assemblies do How to Fish (Unity 6)
  mods/
    GamePlannerCore/                 genérico: modelo da API, JSON, envio, imagens, painel de conta (IMGUI)
    GamePlannerValheim/              minerador do Valheim
    GamePlannerHowToFish/            minerador do How to Fish
    GamePlannerTerraria/             minerador do Terraria (tModLoader, fora da solução)
  tools/
    link-modsources.ps1              liga o mod do Terraria à pasta ModSources do tModLoader
  bin/                               saída: ParadoxBH.GamePlanner.*.dll
```

## Build

```powershell
.\libs\copy-libs.ps1
dotnet build GamePlannerDataminers.sln -c Release
```

As DLLs saem em `bin\`. Para instalar num jogo, copie `ParadoxBH.GamePlanner.Core.dll` e a DLL do jogo para
`BepInEx\plugins`.

## Como um jogo se liga ao Core

O mod do jogo tem sempre as mesmas peças (veja `GamePlannerValheim` e `GamePlannerHowToFish`):

| Arquivo | Papel |
| --- | --- |
| `GamePlanner<Jogo>.cs` | Plugin BepInEx: configuração, tecla F7, painel, corrotina minerar → enviar/exportar |
| `BepInExLog.cs` | Adaptador do log do BepInEx para `IGpLog` |
| `InputBlockPatches.cs` | Patches Harmony que seguram o input do jogo enquanto o painel está aberto |
| `Mining/<Jogo>DataMiner.cs` | Implementa `IDataMiner` e o `MiningKit` que os mineradores compartilham |
| `Mining/*Miner.cs` | Um minerador por assunto; cada um é uma corrotina que dá yield pelo orçamento do frame |
| `Mining/<Jogo>Categories.cs` | Categorias registradas sob demanda (só vai para a API o que tem conteúdo) |
| `Mining/<Jogo>Names.cs` | Ids, nomes e textos traduzidos no formato da API |

Ícones: jogo com sprites usa `SpriteImageCollector`; jogo que desenha o modelo 3D no inventário (How to Fish)
usa `MeshImageCollector`, que fotografa a malha fora da cena com `MeshSnapshot`.

## Valheim

Precisa do BepInEx 5 instalado na pasta do jogo. Numa partida, F7 abre o painel. Id padrão do jogo na API:
`valheim`. Ids são os nomes de prefab, os mesmos do jogo e da wiki.

As cinco fontes de regra de surgimento (`SpawnSystemList`, ataques do `RandEventSystem`, vegetação e locais do
`ZoneSystem`, e os ninhos `SpawnArea`) viram pontos de surgimento com **condições estruturadas** — altitude,
horário, clima, chave global, floresta, distância do centro. O vocabulário está em `doc/spawn_and_spatial.md`.
Cada regra também guarda a frase de sempre no resumo; o que mudou é que agora dá para consultar e filtrar.

**Semente de referência.** O desenho dos biomas (`MULTIPOLYGON` na área de cada local) depende da semente, e o
mapa da API é um só para todos. Por isso o minerador só exporta a geometria quando a semente do mundo bate com
`Mineração/ReferenceSeed` na configuração do mod (padrão `GamePlannerRef`). Minerando em qualquer outro mundo,
os biomas vão sem área e fica um aviso no log — o resto da mineração corre normal.

## Terraria

Não é BepInEx: mod do tModLoader, em `net8.0`, compilado pelo próprio jogo e empacotado em `.tmod`. Por isso
fica fora do `GamePlannerDataminers.sln` e não usa o projeto do Core — leva uma cópia da parte do Core que não
depende da Unity, em `mods/GamePlannerTerraria/Core` (o porquê está no `Core/README.md` de lá).

```powershell
.\tools\link-modsources.ps1     # junção ModSources\GamePlannerTerraria -> este repositório
```

Depois, no jogo: Workshop → Desenvolver Mods → Compilar e recarregar. Numa partida, `/gp minerar` envia e
`/gp exportar` grava em disco; a conta fica em Configurações de Mods e a senha em `/gp senha`. Id padrão do
jogo na API: `terraria`. O que vira o quê está em `mods/GamePlannerTerraria/README.md`.

## How to Fish

Precisa do BepInEx 5 (x64, a versão mais recente da série 5.4) instalado na pasta do jogo. Numa
partida, F7 abre o painel. Id padrão do jogo na API: `how-to-fish`.

Tudo vira **item**; as ligações entre eles vão como **receitas**:

| O quê | Itens | Receitas |
| --- | --- | --- |
| Moeda | `money` | é a moeda de todos os preços (`currency`) |
| Peixes, criaturas, chefes | nome do prefab (`Resources/Items`) — HP, peso, valor, chefe, espécie ameaçada | — |
| Drip | `<peixe>_drip`, variante do peixe | — |
| Armas, varas, ferramentas, explosivos | nome do prefab — dano, cadência, pente, linha, explosão | — |
| Iscas | `bait_<asset>` — preço, chance de perder, tempo de fisgada | `fishing_bait_<asset>`: a isca pesca cada peixe com a chance da tabela de pesos |
| Acessórios de arma | `attachment_<asset>` — mira, cano, laser, pente estendido | `attachment_<asset>_<arma>`: preço em cada arma |
| Munição / afiação | — (o nível é da própria arma) | `upgrade_ammo_<arma>_<n>`, `upgrade_sharpness_<arma>_<n>`: consomem a arma no nível anterior e o dinheiro, e devolvem a arma no nível `n`; na bancada `anvil` (afiação) ou `box_bullets` (munição) |
| Bolsos extras | `upgrade_pocket_<n>` | pedem dinheiro e o bolso anterior |
| Barco | `boat`, `upgrade_boat_motor_<n>`, `upgrade_boat_radar` | pedem dinheiro, o barco e o motor anterior |
| Skins | `skin_<item>_<skin>` com raridade (`common`, `rare`, `legendary`), variante do item | — |
| Roupas | `outfit_<asset>` — conquista que libera | — |
| Ilhas e recursos | `island_<n>`, `feature_grill`, `feature_final_boss` | `quest_<asset>`: missão do NPC, itens entregues → recompensa |

Motores (nome e preço), radar e missões só existem na cena da ilha carregada. O envio substitui cada documento
enviado e não apaga os que ficaram de fora, então motor e radar sem balcão na ilha atual nem são enviados:
minerar de novo na ilha da loja completa o que faltou.

Raridades de skin (`common`, `rare`, `legendary`) precisam estar cadastradas no jogo, na API, para aparecerem
com cor no site.
