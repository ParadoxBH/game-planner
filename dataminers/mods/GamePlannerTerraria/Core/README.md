# Core — porte do GamePlannerCore para o tModLoader

Cópia da parte do `mods/GamePlannerCore` que não depende da Unity: modelo da API, JSON, cliente HTTP, envio
em lote, cache de mídia e progresso. Mesmos namespaces (`GamePlanner.Core.*`), para o código continuar igual
ao dos outros mineradores.

**Por que é cópia e não referência.** O Core é `net48` e é compilado para ir em `BepInEx\plugins`; o
tModLoader compila mod em `net8.0` e empacota `.tmod` a partir de uma pasta em `ModSources`. Os dois
processos de build não se encontram — e as partes do Core que fazem a ponte com o jogo (imagens da Unity,
painel IMGUI, corrotina da Unity) não serviriam aqui de qualquer jeito.

## O que mudou em relação ao Core

| Arquivo | Diferença |
| --- | --- |
| `Api/GamePlannerClient.cs` | transporte em `HttpClient` síncrono. No .NET 8 o `HttpWebRequest` está obsoleto e ignora o limite de conexões por servidor, que é justamente o que o envio paralelo de imagens usa |
| `Model/ShopDoc.cs` | novo: loja, categoria de loja e item de loja. O Valheim e o How to Fish não têm loja de balcão |
| `Model/RarityDoc.cs` | novo: raridade do jogo (nome e cor), que vai por `PUT /games/{jogo}/rarities/{código}` |
| `Model/CategoryDoc.cs` | ganhou `Primary`, a categoria que abre a listagem no site |
| `Mining/MinedDataset.cs` | ganhou `Shops`, `ShopCategories` e `Rarities` |
| `Upload/DatasetUploader.cs` | envia as raridades antes do conteúdo e fecha o cliente no fim |
| `Upload/DatasetExporter.cs` | exporta `rarities.json` junto |

## O que ficou de fora

`Imaging/` (Texture2D e Sprite da Unity), `UI/AccountPanel.cs` (IMGUI), `Mining/SpriteImageCollector.cs` e
`Mining/MeshImageCollector.cs`. O equivalente para o Terraria está em `../Imaging`.

## Mantendo em dia

Mexeu no Core em algo que está na lista acima invertida — JSON, modelo, cache, progresso, lote —, traga para
cá. Se um segundo jogo fora da Unity aparecer, o caminho é promover esta pasta a um projeto próprio
(`GamePlannerCore.Portable`, multi-target `net48;net8.0`) e deixar o Core da Unity referenciá-lo.
