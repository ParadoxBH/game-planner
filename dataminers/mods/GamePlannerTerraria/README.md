# Game Planner — minerador do Terraria

Mod do tModLoader que lê o conteúdo carregado do jogo e envia para a API do Game Planner (ou exporta em
JSON). Não muda nada no jogo: não adiciona item, não mexe em receita, não altera o mundo.

```
GamePlannerTerraria/
  GamePlannerMod.cs        mod do tModLoader e adaptador do log
  GamePlannerConfig.cs     opções (Configurações de Mods) e de onde vem a senha
  GamePlannerSystem.cs     mineração quadro a quadro + envio em thread de fundo
  GamePlannerCommand.cs    /gp ...
  Core/                    porte do GamePlannerCore sem Unity (veja Core/README.md)
  Imaging/                 Texture2D -> PNG
  Mining/                  um minerador por assunto
  Localization/            textos do mod (pt-BR e en-US)
```

## Instalar

O tModLoader compila o mod ele mesmo, a partir de uma pasta dentro de `ModSources`. Em vez de copiar o
código para lá, ligue a pasta do repositório:

```powershell
.\tools\link-modsources.ps1
```

Depois, no jogo: **Workshop → Desenvolver Mods → GamePlannerTerraria → Compilar e recarregar**. Sem abrir o
jogo dá no mesmo, pelo caminho do ModSources (o tModLoader compila e instala o `.tmod`):

```powershell
Push-Location "$([Environment]::GetFolderPath('MyDocuments'))\My Games\Terraria\tModLoader\ModSources\GamePlannerTerraria"
dotnet build
Pop-Location
```

> **Use o PowerShell, não o Git Bash.** O `cd` do Git Bash troca a junção pelo caminho real do repositório
> antes de chamar o `dotnet`, e aí o `..\tModLoader.targets` não existe: o build sai com centenas de erros de
> "o tipo NPC não pode ser encontrado".

Para só conferir se compila, sem gerar o `.tmod`:

```powershell
$env:tMLSteamPath = 'F:\SteamLibrary\steamapps\common\tModLoader'
dotnet build .\mods\GamePlannerTerraria\GamePlannerTerraria.csproj -p:BuildMod=false
```

O projeto não entra no `GamePlannerDataminers.sln` de propósito: ele só compila com o `tModLoader.targets`
que o instalador do jogo deixa em `ModSources`, e o resto da solução é BepInEx/net48.

## Usar

Em **Configurações de Mods → Game Planner** ficam o endereço da API, o usuário, o id do jogo e as opções de
imagem. A senha não fica lá — config de mod é arquivo em texto puro, legível por qualquer mod. Ela vem, nesta
ordem, de:

1. `/gp senha <senha>` (só na memória, some quando o jogo fecha);
2. a variável de ambiente `GAMEPLANNER_SENHA`;
3. `Documentos\My Games\Terraria\tModLoader\GamePlanner\senha.txt`.

Dentro de uma partida:

| Comando | O que faz |
| --- | --- |
| `/gp minerar` | minera e envia para a API |
| `/gp exportar` | minera e grava em `tModLoader\GamePlanner\export\<jogo>` |
| `/gp status` | conta, opções e andamento |
| `/gp senha <senha>` / `/gp esquecer` | guarda e apaga a senha da sessão |
| `/gp cancelar` | interrompe |

O andamento sai no chat; o histórico completo vai para o `client.log` do tModLoader. A mineração roda um
pedaço por quadro (o jogo continua jogável) e o envio roda fora da thread principal.

## O que vira o quê

| No jogo | Na API |
| --- | --- |
| Item (`ContentSamples.ItemsByType`) | **item**, com dica de item como descrição, preço de venda e atributos de dano, uso, defesa, pesca... |
| NPC (`ContentSamples.NpcsByNetId`) | **entidade**, com vida, dano, defesa, dinheiro e os **drops** da tabela do bestiário, com a chance de cada um |
| Bloco exigido por receita | **entidade** `station_<bloco>`, com nome e ícone do item que o coloca |
| Receita (`Main.recipe`) | **receita** `craft_<produto>`, com ingredientes, bancadas e as condições como desbloqueio |
| Grupo de receita ("qualquer madeira") | **categoria** `group_<grupo>`, usada como ingrediente; cada membro entra na categoria |
| Transmutação no Brilho | **receita** `shimmer_<item>` |
| Loja de morador | **loja** `shop_<npc>` + uma **categoria de loja** por conjunto de condições, com preço e moeda |
| Bioma do bestiário | **local** `biome_<bioma>` e um **ponto de surgimento** por NPC que aparece nele |
| Invasão e evento do bestiário | **evento** `event_<nome>`, ligado ao NPC e ao ponto |
| Raridade de item | **raridade** cadastrada no jogo, com a cor que o Terraria usa |

**Ids** são o nome interno do Terraria (`CopperShortsword`, `BlueSlime`), não o número: número muda de versão
e não diz nada a quem lê o site. Conteúdo de outro mod usa o nome completo dele (`MeuMod/Espada`), com a
barra virando sublinhado. Net id negativo é variante (lesma azul, esqueleto fantasiado) e vira entidade
própria com `variantOf` apontando para o NPC base.

**Preços** são em cobre, e a moeda é o item `CopperCoin`. `baseSellPrice` é `value / 5`, como no jogo;
`baseBuyPrice` só existe em quem está à venda em alguma loja, e é o menor preço entre elas. Oferta em moeda
especial (medalha do defensor, ficha do parque) fica só na loja: o item tem um campo de moeda só, que é a do
preço de venda.

## O que fica de fora, e por quê

- **Mundo**: o Terraria é gerado por semente, então não há mapa nem coordenada. Os pontos de surgimento são
  do tipo "vale para o local inteiro" — o NPC aparece no bioma, sem posição.
- **Conteúdo de outros mods**: por padrão sim, fica de fora (`Minerar só o conteúdo do Terraria`). Para
  minerar um pacote de mods, desligue a opção **e** troque o id do jogo: misturar os dois no mesmo `terraria`
  deixa o acervo sem sentido para quem joga sem mods.
- **Condição de drop** (só no expert, só na Lua de Sangue): o drop entra com a chance, mas o texto da
  condição não tem onde ficar no documento de entidade.
- **Horário de surgimento** vira o atributo `active_time`, não evento: dia e noite não são evento no site, e
  conteúdo com evento some da listagem quando o evento não está ativo.

## Detalhes que valem lembrar

- **Ícones**: o Terraria guarda textura com alfa pré-multiplicado; o PNG é gravado desfazendo isso e cortando
  a moldura transparente, senão o ícone fica com borda escura no site. Item animado usa o primeiro quadro.
- **Id de receita**: `craft_<produto>` e, quando o mesmo item tem mais de uma receita, `_2`, `_3`... na ordem
  do jogo. Essa ordem é estável na mesma versão com os mesmos mods; mudar a lista de mods pode trocar os
  sufixos entre si.
- **O envio substitui cada documento enviado** e não apaga os que ficaram de fora. Minerar de novo depois de
  uma atualização do jogo atualiza o que mudou; o que o Terraria removeu continua no site até alguém apagar.
- **Memória**: minerar com imagens pede ao jogo que carregue a textura de todo item e de todo NPC, o que
  normalmente só acontece aos poucos. Espere o uso de memória subir e ficar alto até fechar o jogo. Com
  `Extrair e enviar os ícones` desligado nada disso acontece.
- Mineração de vanilla dá algo perto de 5 mil itens, 700 entidades e 6 mil imagens. A primeira vez demora
  (cada imagem é um POST e o servidor converte com ffmpeg); da segunda em diante o cache de mídia em
  `tModLoader\GamePlanner` evita reenviar o que não mudou.
