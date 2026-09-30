using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using GamePlanner.HeartopiaOffline.Analysis;
using GamePlanner.HeartopiaOffline.Decoding;
using GamePlanner.HeartopiaOffline.Readers;
using GamePlanner.HeartopiaOffline.Safety;
using GamePlanner.HeartopiaOffline.Sources;

namespace GamePlanner.HeartopiaOffline.Output
{
    /// <summary>Tudo que uma execução leu e deduziu, para gravar em disco.</summary>
    public sealed class RunData
    {
        public DateTime Started;
        public TimeSpan Elapsed;
        public SourceSet Sources;
        public List<BundleEntry> InstallBundles;
        public List<BundleEntry> HotfixBundles;
        public HeaderSample Headers;
        public RowCipher Cipher;
        public ResIndexData Resources;
        public string ResourcesOrigin;
        public TextTable Design;
        public string DesignOrigin;
        public TextTable Dialogue;
        public string DialogueOrigin;
        public List<CatalogItem> Items;
        public int Linked;
        public List<RecipeName> Recipes;
        public List<TextCollection> Collections;
        public List<TextMember> NamedSets;
        public List<ThemeGroup> Themes;
        public PatchDiff Diff;
    }

    public static class Report
    {
        private const int DiffListLimit = 200;

        private static readonly JsonSerializerOptions Json = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        };

        public static void WriteData(string dir, RunData run)
        {
            string inventory = Path.Combine(dir, "inventory");
            string texts = Path.Combine(dir, "texts");

            Csv.Write(Path.Combine(inventory, "bundles.csv"), new[] { "nome", "arquivo", "origem", "bytes" },
                run.InstallBundles.Concat(run.HotfixBundles).Select(b => new object[] { b.Name, b.FileName, b.Origin, b.Size }));

            Csv.Write(Path.Combine(inventory, "resources.csv"), new[] { "caminho", "bundle" },
                run.Resources.Entries.Where(e => e.Path != null).OrderBy(e => e.Path, StringComparer.Ordinal)
                    .Select(e => new object[] { e.Path, e.Bundle }));

            WriteJson(Path.Combine(inventory, "catalog.json"), new
            {
                versao = run.Sources.Latest.Label,
                itens = run.Items.Count,
                categorias = run.Items.GroupBy(i => i.Category).OrderByDescending(g => g.Count()).ThenBy(g => g.Key, StringComparer.Ordinal)
                    .Select(g => new
                    {
                        categoria = g.Key,
                        itens = g.Select(i => new
                        {
                            id = i.Id,
                            nomeEn = i.NameEn,
                            nomePt = i.NamePt,
                            hashNome = i.NameHash,
                            tema = i.Theme,
                            origem = i.Origin,
                            icones = i.Icons,
                        }),
                    }),
            });

            WriteJson(Path.Combine(inventory, "sets.json"), new
            {
                aviso = "Heurística: candidatos a conjunto pelos nomes. A definição oficial está nos bundles criptografados.",
                colecoesPorTexto = run.Collections.Select(c => new
                {
                    prefixo = c.Prefix,
                    pecas = c.Members.Select(m => new { hash = m.Hash, en = m.En, pt = m.Pt }),
                }),
                conjuntosCitados = run.NamedSets.Select(m => new { hash = m.Hash, en = m.En, pt = m.Pt }),
                temasDeMobilia = run.Themes.Select(t => new { tema = t.Theme, categorias = t.Categories, itens = t.Items }),
            });

            WriteTextTable(Path.Combine(texts, "design.csv"), run.Design);
            WriteTextTable(Path.Combine(texts, "dialogue.csv"), run.Dialogue);

            Csv.Write(Path.Combine(texts, "recipes.csv"),
                new[] { "tipo", "hash", "receita_en", "receita_pt", "alvo_en", "alvo_hash", "alvo_pt", "item_id" },
                run.Recipes.Select(r => new object[] { r.Kind, r.Hash, r.En, r.Pt, r.TargetEn, r.TargetHash, r.TargetPt, r.ItemId }));

            Csv.Write(Path.Combine(texts, "linked-names.csv"), new[] { "item_id", "categoria", "nome_en", "nome_pt", "hash" },
                run.Items.Where(i => i.NameHash.HasValue).Select(i => new object[] { i.Id, i.Category, i.NameEn, i.NamePt, i.NameHash }));

            string diff = Path.Combine(dir, "diff");
            Csv.Write(Path.Combine(diff, "bundles.csv"), new[] { "comparacao", "situacao", "nome" },
                run.Diff.NewBundles.Select(n => new object[] { "instalacao_x_hotfix", "novo", n })
                    .Concat(run.Diff.ChangedBundles.Select(n => new object[] { "instalacao_x_hotfix", "alterado", n }))
                    .Concat(run.Diff.NewBundlesSincePrevious.Select(n => new object[] { "execucao_anterior", "novo", n }))
                    .Concat(run.Diff.RemovedBundlesSincePrevious.Select(n => new object[] { "execucao_anterior", "removido", n })));
            Csv.Write(Path.Combine(diff, "texts.csv"), new[] { "comparacao", "tabela", "hash", "antes", "depois" },
                run.Diff.DesignChanges.Select(c => new object[] { "instalacao_x_hotfix", "design", c.Hash, c.Before, c.After })
                    .Concat(run.Diff.DialogueChanges.Select(c => new object[] { "instalacao_x_hotfix", "dialogue", c.Hash, c.Before, c.After }))
                    .Concat(run.Diff.TextChangesSincePrevious.Select(c => new object[] { "execucao_anterior", "design", c.Hash, c.Before, c.After })));
            Csv.Write(Path.Combine(diff, "resources.csv"), new[] { "caminho_novo_no_hotfix" },
                run.Diff.NewResources.Select(p => new object[] { p }));

            File.WriteAllText(Path.Combine(dir, "diff.md"), DiffMarkdown(run), new UTF8Encoding(false));
        }

        public static void WriteReport(string dir, RunData run) =>
            File.WriteAllText(Path.Combine(dir, "report.md"), ReportMarkdown(run), new UTF8Encoding(false));

        private static void WriteTextTable(string path, TextTable table)
        {
            Csv.Write(path, new[] { "hash" }.Concat(table.Languages),
                table.Rows.Select(r => new object[] { r.Hash }.Concat(r.Values)));
        }

        private static void WriteJson(string path, object value)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, JsonSerializer.Serialize(value, Json), new UTF8Encoding(false));
        }

        private static string ReportMarkdown(RunData run)
        {
            SourceSet src = run.Sources;
            var md = new StringBuilder();
            md.AppendLine("# Heartopia — relatório da extração offline");
            md.AppendLine();
            md.AppendLine($"Gerado em {run.Started:yyyy-MM-dd HH:mm} em {run.Elapsed.TotalSeconds:0} s.");
            md.AppendLine();
            md.AppendLine("> **Novo no patch = pode não ter sido lançado.** Tudo que aparece em `diff.md` (e os textos de eventos");
            md.AppendLine("> futuros que já vêm no cliente) tem que ser conferido no jogo antes de publicar.");
            md.AppendLine();

            md.AppendLine("## Versões");
            md.AppendLine();
            md.AppendLine("| Fonte | Pasta | Versão |");
            md.AppendLine("|---|---|---|");
            md.AppendLine($"| instalação | `{src.InstallDir}` | {src.InstallVersion?.ToString() ?? "?"} |");
            md.AppendLine($"| hotfix | `{src.CacheDir ?? "(não encontrado)"}` | {src.CacheVersion?.ToString() ?? "-"} |");
            md.AppendLine();

            md.AppendLine("## Garantias desta execução");
            md.AppendLine();
            md.AppendLine($"- Jogo e lançador fechados: conferido {GameProcessGuard.Checks} vezes, do início ao fim.");
            md.AppendLine("- Nenhum arquivo do jogo aberto para escrita; os .db foram copiados e só a cópia foi lida. Sem rede.");
            md.AppendLine("- Conteúdo dos AssetBundles, `DotnetAssemblies`, `GameAssembly.dll`, `global-metadata.dat`, dados de jogador");
            md.AppendLine("  (`Configs`, logs, `tapdb_*`, `record`) não foram lidos.");
            md.AppendLine();
            md.AppendLine("| Arquivo original | Origem | MD5 agora | dbList.txt | GameFileInfo.json | Intacto |");
            md.AppendLine("|---|---|---|---|---|---|");
            foreach (DbFile f in src.Copied)
                md.AppendLine($"| `{f.Name}` | {f.Origin} | `{f.ActualMd5}` | {Md5Cell(f.ListedMd5, f.ActualMd5)} | {Md5Cell(f.ManifestMd5, f.ActualMd5)} | {(f.Intact ? "sim" : "**NÃO**")} |");
            md.AppendLine();

            md.AppendLine("## O que deu para ler");
            md.AppendLine();
            md.AppendLine("| Fonte | Nível | Resultado |");
            md.AppendLine("|---|---|---|");
            md.AppendLine($"| Nomes dos AssetBundles | 🟢 | {N(run.InstallBundles.Count)} na instalação, {N(run.HotfixBundles.Count)} no hotfix |");
            md.AppendLine($"| Ícones de item (`ui_item_normal_p_*`) | 🟢 | {N(run.Items.Count)} itens em {N(run.Items.Select(i => i.Category).Distinct().Count())} categorias |");
            md.AppendLine($"| ResIndex ({run.ResourcesOrigin}) | 🟡 | {N(run.Resources.Entries.Count)} caminhos de asset → bundle |");
            md.AppendLine($"| designTable ({run.DesignOrigin}) | 🟡 | {N(run.Design.Rows.Count)} textos × {run.Design.Languages.Length} idiomas ({string.Join(", ", run.Design.Languages)}) |");
            md.AppendLine($"| dialogueTable ({run.DialogueOrigin}) | 🟡 | {N(run.Dialogue.Rows.Count)} falas × {run.Dialogue.Languages.Length} idiomas |");
            md.AppendLine();

            md.AppendLine("### Decodificação dos .db");
            md.AppendLine();
            md.AppendLine($"- Chave deduzida de {N(run.Cipher.SampleRows)} linhas do ResIndex (texto conhecido `Assets/`): 16/16 posições,");
            md.AppendLine($"  concordância de {Pct(run.Cipher.Agreement)}.");
            md.AppendLine($"- Validação: {Pct(Ratio(run.Resources.PathsWithPrefix, run.Resources.Entries.Count))} dos caminhos começam com `Assets/`;");
            md.AppendLine($"  {Pct(Ratio(run.Resources.BundlesEndingAb, run.Resources.Entries.Count))} dos bundles terminam em `.ab`;");
            md.AppendLine($"  células inválidas: ResIndex {N(run.Resources.InvalidCells)}, designTable {N(run.Design.InvalidCells)} de {N(run.Design.Cells)},");
            md.AppendLine($"  dialogueTable {N(run.Dialogue.InvalidCells)} de {N(run.Dialogue.Cells)}.");
            md.AppendLine();

            md.AppendLine("### AssetBundles (cabeçalho de uma amostra)");
            md.AppendLine();
            md.AppendLine($"{run.Headers.Checked} lidos (só o cabeçalho): {run.Headers.Encrypted} criptografados, {run.Headers.Plain} abertos,");
            md.AppendLine($"{run.Headers.Unreadable} ilegíveis. Motor: `{run.Headers.EngineRevision ?? "?"}`.");
            md.AppendLine(run.Headers.Plain == 0
                ? "Continuam todos criptografados (UnityCN): ícones, prefabs e as tabelas de dados ficam fora."
                : "**Há bundles sem a flag de criptografia na amostra** — vale investigar se o jogo mudou o empacotamento.");
            md.AppendLine();

            md.AppendLine("## Catálogo de itens");
            md.AppendLine();
            md.AppendLine($"{N(run.Items.Count)} itens pelos ícones de inventário. Nome ligado ao id interno: {N(run.Linked)}");
            md.AppendLine($"({Pct(Ratio(run.Linked, run.Items.Count))}) — só quando o id é o próprio nome em inglês (comida, plantio, flores).");
            md.AppendLine("Ids numéricos (`top131`, `bird141`) precisam da tabela de itens, que está nos bundles criptografados.");
            md.AppendLine();
            md.AppendLine("| Categoria | Itens | Com nome |");
            md.AppendLine("|---|---:|---:|");
            foreach (IGrouping<string, CatalogItem> g in run.Items.GroupBy(i => i.Category).OrderByDescending(x => x.Count()).Take(30))
                md.AppendLine($"| {g.Key} | {g.Count()} | {g.Count(i => i.NameHash.HasValue)} |");
            md.AppendLine();

            md.AppendLine("## Receitas (só os nomes)");
            md.AppendLine();
            foreach (IGrouping<string, RecipeName> g in run.Recipes.GroupBy(r => r.Kind))
            {
                RecipeName sample = g.First();
                md.AppendLine($"- **{g.Key}**: {g.Count()} receitas; {g.Count(r => r.TargetHash.HasValue)} com o texto do item-alvo;");
                md.AppendLine($"  {g.Count(r => r.ItemId != null)} ligadas a um id do catálogo. Ex.: \"{sample.En}\" = \"{sample.Pt}\".");
            }
            md.AppendLine();
            md.AppendLine("Ingredientes, quantidades, estação de trabalho e tempo **não estão em nenhuma fonte legível**: ficam na");
            md.AppendLine("tabela de receitas dentro dos bundles criptografados.");
            md.AppendLine();

            md.AppendLine("## Conjuntos (candidatos)");
            md.AppendLine();
            md.AppendLine($"- {run.Collections.Count} coleções por texto \"Coleção (Peça)\" com 3+ peças; maiores: " +
                          string.Join(", ", run.Collections.Take(8).Select(c => $"{c.Prefix} ({c.Members.Count})")) + ".");
            md.AppendLine($"- {run.NamedSets.Count} nomes de conjunto citados em texto (\"... Set\").");
            md.AppendLine($"- {run.Themes.Count} temas de mobília pelos nomes internos; maiores: " +
                          string.Join(", ", run.Themes.Take(10).Select(t => $"{t.Theme} ({t.Items.Count})")) + ".");
            md.AppendLine();

            md.AppendLine("## O que não deu (e por quê)");
            md.AppendLine();
            md.AppendLine("| Informação | Onde está | Situação |");
            md.AppendLine("|---|---|---|");
            md.AppendLine("| Ingredientes e quantidades das receitas | tabelas de dados nos AssetBundles | 🔴 criptografia UnityCN |");
            md.AppendLine("| Peças e bônus oficiais de cada conjunto | idem | 🔴 |");
            md.AppendLine("| Ligação id numérico ↔ nome (roupas, pássaros, peixes...) | idem | 🔴 |");
            md.AppendLine("| Ícones e modelos | AssetBundles | 🔴 |");
            md.AppendLine("| Lógica do jogo | `DotnetAssemblies` (`XDENCODE0001`) | 🔴 |");
            md.AppendLine();
            md.AppendLine("Próximo passo sem zona vermelha: coletar as receitas no próprio jogo (prints do Steam, F12), processar os");
            md.AppendLine("prints offline com OCR e cruzar com `texts/design.csv` para ter o nome exato em pt-BR.");
            md.AppendLine();

            md.AppendLine("## Arquivos gerados");
            md.AppendLine();
            md.AppendLine("- `inventory/bundles.csv`, `inventory/resources.csv`, `inventory/catalog.json`, `inventory/sets.json`");
            md.AppendLine("- `texts/design.csv`, `texts/dialogue.csv`, `texts/recipes.csv`, `texts/linked-names.csv`");
            md.AppendLine("- `diff.md` e `diff/*.csv`");
            return md.ToString();
        }

        private static string DiffMarkdown(RunData run)
        {
            PatchDiff d = run.Diff;
            var md = new StringBuilder();
            md.AppendLine("# Heartopia — o que mudou");
            md.AppendLine();
            md.AppendLine("> Novo no patch pode ser conteúdo **ainda não lançado**. Conferir no jogo antes de publicar.");
            md.AppendLine($"> Listas completas em `diff/*.csv`; aqui vão até {DiffListLimit} linhas por seção.");
            md.AppendLine();

            md.AppendLine($"## Instalação ({run.Sources.InstallVersion?.ToString() ?? "?"}) × hotfix ({run.Sources.CacheVersion?.ToString() ?? "-"})");
            md.AppendLine();
            if (!d.HasHotfix)
            {
                md.AppendLine("Sem cache de hotfix: nada a comparar.");
            }
            else
            {
                md.AppendLine($"- Bundles novos: {N(d.NewBundles.Count)}; trocados: {N(d.ChangedBundles.Count)}.");
                md.AppendLine($"- Textos novos ou alterados: designTable {N(d.DesignChanges.Count)}, dialogueTable {N(d.DialogueChanges.Count)}.");
                md.AppendLine($"- Caminhos de asset novos no ResIndex: {N(d.NewResources.Count)}.");
                md.AppendLine();
                AppendList(md, "Bundles novos", d.NewBundles);
                AppendList(md, "Textos novos ou alterados (designTable)", d.DesignChanges.Select(ChangeLine));
            }
            md.AppendLine();

            md.AppendLine("## Desde a execução anterior");
            md.AppendLine();
            if (d.PreviousLabel == null)
            {
                md.AppendLine("Primeira execução nesta pasta de saída (ou a anterior foi da mesma versão).");
            }
            else
            {
                md.AppendLine($"Comparado com `{d.PreviousLabel}`: bundles novos {N(d.NewBundlesSincePrevious.Count)}, removidos " +
                              $"{N(d.RemovedBundlesSincePrevious.Count)}; textos novos ou alterados {N(d.TextChangesSincePrevious.Count)}.");
                md.AppendLine();
                AppendList(md, "Bundles novos", d.NewBundlesSincePrevious);
                AppendList(md, "Textos novos ou alterados", d.TextChangesSincePrevious.Select(ChangeLine));
            }
            return md.ToString();
        }

        private static void AppendList(StringBuilder md, string title, IEnumerable<string> lines)
        {
            List<string> list = lines.ToList();
            if (list.Count == 0) return;
            md.AppendLine($"### {title}");
            md.AppendLine();
            foreach (string line in list.Take(DiffListLimit)) md.AppendLine("- " + line);
            if (list.Count > DiffListLimit) md.AppendLine($"- … mais {N(list.Count - DiffListLimit)}");
            md.AppendLine();
        }

        private static string ChangeLine(TextChange c)
        {
            string after = OneLine(c.After);
            return c.Before == null ? $"`{c.Hash}` {after}" : $"`{c.Hash}` {OneLine(c.Before)} → {after}";
        }

        private static string OneLine(string text)
        {
            if (text == null) return "(vazio)";
            string line = text.Replace("\r", " ").Replace("\n", " ");
            return line.Length > 120 ? line.Substring(0, 120) + "…" : line;
        }

        private static string Md5Cell(string expected, string actual) =>
            expected == null ? "-" : expected == actual ? "igual" : $"**diferente** (`{expected}`)";

        private static double Ratio(int part, int total) => total == 0 ? 0 : (double)part / total;

        private static string Pct(double value) => value.ToString("0.##%", CultureInfo.GetCultureInfo("pt-BR"));

        private static string N(int value) => value.ToString("N0", CultureInfo.GetCultureInfo("pt-BR"));
    }
}
