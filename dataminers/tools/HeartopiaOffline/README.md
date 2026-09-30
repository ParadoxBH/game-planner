# HeartopiaOffline

Extração offline do Heartopia. **Não é mod**: o jogo é online e tem anti-cheat (`themis`, dentro do `xdt.exe`),
então nada roda dentro dele. A ferramenta lê só o que o jogo deixa no PC, com o jogo fechado, e grava um
relatório do que deu e do que não deu para extrair.

```powershell
# jogo e lançador fechados
dotnet run --project tools\HeartopiaOffline
dotnet run --project tools\HeartopiaOffline -- --game "F:\SteamLibrary\steamapps\common\Heartopia" --out D:\heartopia
```

| Opção | Padrão |
| --- | --- |
| `--game` | achada pela Steam (`libraryfolders.vdf` + `appmanifest_4025700.acf`) |
| `--cache` | `%USERPROFILE%\AppData\LocalLow\xd\Heartopia` (hotfix que o lançador baixa) |
| `--out` | `tools\HeartopiaOffline\out` (fora do git); grava em `<out>\<ramo>_<versão de recursos>` |

Código de saída: `0` ok, `1` erro, `2` jogo ou lançador abertos.

## Garantias

- **Jogo fechado.** Recusa rodar com `xdt.exe` ou `XDLauncher.exe` abertos e confere de novo antes de cada
  etapa que lê arquivo do jogo. Só enumera processos pelo nome; não abre handle nem lê memória.
- **Só leitura.** Nenhum arquivo do jogo é aberto para escrita. Os `.db` são copiados para `<saída>\_work`
  (apagada no fim) e só a cópia é aberta. No fim, o MD5 dos originais é recalculado e comparado com o
  `dbList.txt` e o `GameFileInfo.json` — o relatório mostra que continuam iguais.
- **Não toca:** conteúdo dos AssetBundles (lê só o cabeçalho de uma amostra, para registrar se continuam
  criptografados), `DotnetAssemblies`, `GameAssembly.dll`, `global-metadata.dat` e dados de jogador (`Configs`,
  logs, `tapdb_*`, `record`).
- **Sem rede.**
- **Sem segredo no repositório.** Os `.db` têm as células ofuscadas (XOR com chave de 16 bytes que gira por
  linha). A chave não está no código: é deduzida na hora, porque todo caminho do `ResIndex` começa com
  `Assets/`. Se a decodificação não passar na validação (quase 100% UTF-8 e `Assets/`), a ferramenta para.

## O que sai

| Arquivo | Conteúdo |
| --- | --- |
| `report.md` | versões, garantias (MD5), o que deu, o que não deu e por quê |
| `diff.md`, `diff/*.csv` | instalação × hotfix e versão atual × execução anterior |
| `inventory/bundles.csv` | nome, origem e tamanho de cada AssetBundle |
| `inventory/resources.csv` | caminho do asset no projeto → bundle (`ResIndex`) |
| `inventory/catalog.json` | itens pelos ícones de inventário, por categoria, com nome quando deu para ligar |
| `inventory/sets.json` | candidatos a conjunto: coleções por texto, "... Set" e temas de mobília |
| `texts/design.csv`, `texts/dialogue.csv` | todos os textos, 12 idiomas (inclui `pt`) |
| `texts/recipes.csv` | nomes das receitas ("Receita: X", "Manual: X") e do item que ensinam |
| `texts/linked-names.csv` | id interno ↔ nome, quando o id é o próprio nome em inglês |

Os CSV usam `;` e UTF-8 com BOM (abrem direto no Excel em pt-BR).

## O que não sai

Ingredientes e quantidades das receitas, peças e bônus oficiais dos conjuntos, a ligação dos ids numéricos
(`top131`, `bird141`) com os nomes, ícones e modelos: tudo isso está **dentro** dos AssetBundles, que têm
criptografia de verdade (UnityCN). Ficam de fora de propósito.

## Antes de publicar

Tudo que é novo no patch (veja `diff.md`) e os textos de eventos futuros que já vêm no cliente podem ser
conteúdo **ainda não lançado**. Conferir no jogo antes de publicar; publicar fatos (nomes, receitas), não assets.
