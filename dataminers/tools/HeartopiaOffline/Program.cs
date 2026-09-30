using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using GamePlanner.HeartopiaOffline.Analysis;
using GamePlanner.HeartopiaOffline.Decoding;
using GamePlanner.HeartopiaOffline.Output;
using GamePlanner.HeartopiaOffline.Readers;
using GamePlanner.HeartopiaOffline.Safety;
using GamePlanner.HeartopiaOffline.Sources;

namespace GamePlanner.HeartopiaOffline
{
    /// <summary>
    /// Extração offline do Heartopia: com o jogo fechado, lê o que o jogo deixa no PC e grava um relatório do que
    /// deu e do que não deu para extrair. Veja o README desta pasta.
    /// </summary>
    public static class Program
    {
        private const int ExitOk = 0;
        private const int ExitError = 1;
        private const int ExitGameRunning = 2;

        private const string ResIndexDb = "ResIndex.db";
        private const string DesignDb = "designTable.db";
        private const string DialogueDb = "dialogueTable.db";

        private const double MinValidRatio = 0.999;
        private const int HeaderSampleSize = 64;

        public static int Main(string[] args)
        {
            Dictionary<string, string> options = ParseArgs(args);
            if (options == null || options.ContainsKey("help"))
            {
                PrintUsage();
                return options == null ? ExitError : ExitOk;
            }

            string workDir = null;
            try
            {
                var clock = Stopwatch.StartNew();
                var run = new RunData { Started = DateTime.Now };

                GameProcessGuard.Check("início");

                string install = GameLocator.FindInstall(options.GetValueOrDefault("game"));
                if (install == null)
                    return Fail("Instalação do Heartopia não encontrada. Informe a pasta com --game (a que tem xdt_Data).");
                string cache = GameLocator.FindCache(options.GetValueOrDefault("cache"));
                var sources = new SourceSet(install, cache);
                run.Sources = sources;

                Console.WriteLine($"Instalação: {install} ({sources.InstallVersion?.ToString() ?? "versão ?"})");
                Console.WriteLine($"Hotfix:     {cache ?? "(não encontrado — só a instalação)"}{(sources.CacheVersion != null ? $" ({sources.CacheVersion})" : "")}");

                string outRoot = Path.GetFullPath(options.GetValueOrDefault("out") ?? DefaultOutRoot());
                string outDir = Path.Combine(outRoot, sources.Latest.Label);
                workDir = Path.Combine(outDir, "_work");
                Directory.CreateDirectory(workDir);

                // 1. Cópias dos .db (instalação sempre, para o diff; hotfix quando existe).
                GameProcessGuard.Check("cópia dos .db");
                Console.WriteLine("Copiando os .db para a pasta de trabalho...");
                DbFile resInstall = sources.Copy(ResIndexDb, SourceSet.Install, workDir);
                DbFile designInstall = sources.Copy(DesignDb, SourceSet.Install, workDir);
                DbFile dialogueInstall = sources.Copy(DialogueDb, SourceSet.Install, workDir);
                DbFile resLatest = sources.HasCacheDb(ResIndexDb) ? sources.Copy(ResIndexDb, SourceSet.Hotfix, workDir) : resInstall;
                DbFile designLatest = sources.HasCacheDb(DesignDb) ? sources.Copy(DesignDb, SourceSet.Hotfix, workDir) : designInstall;
                DbFile dialogueLatest = sources.HasCacheDb(DialogueDb) ? sources.Copy(DialogueDb, SourceSet.Hotfix, workDir) : dialogueInstall;

                // 2. Chave deduzida do ResIndex mais novo, validada antes de qualquer coisa ser gravada.
                Console.WriteLine("Deduzindo e validando a chave...");
                List<(long Key, byte[] Path, byte[] Bundle)> rawLatest = ResIndexReader.ReadRaw(resLatest.WorkPath);
                RowCipher cipher = RowCipher.Derive(rawLatest.Select(r => (r.Key, r.Path)));
                run.Cipher = cipher;

                run.Resources = ResIndexReader.Decode(rawLatest, cipher);
                run.ResourcesOrigin = resLatest.Origin;
                ResIndexData resourcesInstall = resLatest == resInstall ? run.Resources : ResIndexReader.Decode(ResIndexReader.ReadRaw(resInstall.WorkPath), cipher);

                run.Design = TextTableReader.Read(designLatest.WorkPath, cipher);
                run.DesignOrigin = designLatest.Origin;
                run.Dialogue = TextTableReader.Read(dialogueLatest.WorkPath, cipher);
                run.DialogueOrigin = dialogueLatest.Origin;
                TextTable designInstallTable = designLatest == designInstall ? run.Design : TextTableReader.Read(designInstall.WorkPath, cipher);
                TextTable dialogueInstallTable = dialogueLatest == dialogueInstall ? run.Dialogue : TextTableReader.Read(dialogueInstall.WorkPath, cipher);

                string invalid = Validate(run.Resources, resourcesInstall, run.Design, designInstallTable, run.Dialogue, dialogueInstallTable);
                if (invalid != null)
                    return Fail("A decodificação não passou na validação (" + invalid + "). O jogo provavelmente mudou o " +
                                "esquema de ofuscação; nada foi gravado além da pasta de trabalho.");

                // 3. Nomes dos AssetBundles e cabeçalho de uma amostra.
                GameProcessGuard.Check("listagem dos bundles");
                Console.WriteLine("Listando os AssetBundles...");
                run.InstallBundles = BundleNames.List(sources.InstallBundleDir, SourceSet.Install);
                run.HotfixBundles = BundleNames.List(sources.CacheBundleDir, SourceSet.Hotfix);
                run.Headers = BundleNames.CheckHeaders(run.InstallBundles.Concat(run.HotfixBundles).ToList(), HeaderSampleSize);

                // 4. Análises.
                Console.WriteLine("Montando catálogo, receitas, conjuntos e diff...");
                run.Items = Catalog.Build(run.InstallBundles.Concat(run.HotfixBundles));
                run.Linked = NameLinker.Link(run.Items, run.Design);
                run.Recipes = RecipeNames.Find(run.Design, run.Items);
                var recipePrefixes = new HashSet<string>(run.Recipes.Select(r => r.Kind), StringComparer.Ordinal);
                run.Collections = Sets.TextCollections(run.Design, recipePrefixes);
                run.NamedSets = Sets.NamedSets(run.Design);
                run.Themes = Sets.Themes(run.Items);

                // O bundle que o jogo usa é o do hotfix quando o nome se repete.
                var hotfixNames = new HashSet<string>(run.HotfixBundles.Select(b => b.Name), StringComparer.Ordinal);
                var latestBundles = run.HotfixBundles.Concat(run.InstallBundles.Where(b => !hotfixNames.Contains(b.Name))).ToList();
                Snapshot current = Snapshot.Build(sources.Latest.Label, latestBundles, run.Design);
                Snapshot previous = Snapshot.FindPrevious(outRoot, sources.Latest.Label);
                run.Diff = PatchDiff.Compute(run.InstallBundles, run.HotfixBundles, designInstallTable, run.Design,
                    dialogueInstallTable, run.Dialogue, resourcesInstall, run.Resources, current, previous);

                // 5. Saída, e a prova de que os originais não mudaram.
                Console.WriteLine($"Gravando em {outDir}...");
                Report.WriteData(outDir, run);
                current.Save(outDir);

                GameProcessGuard.Check("conferência dos originais");
                sources.VerifyOriginals();
                run.Elapsed = clock.Elapsed;
                Report.WriteReport(outDir, run);

                Console.WriteLine();
                Console.WriteLine($"{run.Items.Count} itens, {run.Recipes.Count} receitas (só nomes), {run.Design.Rows.Count} textos, " +
                                  $"{run.Resources.Entries.Count} caminhos de asset.");
                Console.WriteLine($"Originais intactos: {(sources.Copied.All(f => f.Intact) ? "sim" : "NÃO — veja o relatório")}.");
                Console.WriteLine($"Relatório: {Path.Combine(outDir, "report.md")}");
                return ExitOk;
            }
            catch (GameRunningException e)
            {
                Console.Error.WriteLine(e.Message);
                return ExitGameRunning;
            }
            catch (Exception e)
            {
                Console.Error.WriteLine("Erro: " + e);
                return ExitError;
            }
            finally
            {
                if (workDir != null && Directory.Exists(workDir)) Directory.Delete(workDir, recursive: true);
            }
        }

        /// <summary>Null quando tudo decodificou; senão, o motivo.</summary>
        private static string Validate(ResIndexData latest, ResIndexData install, params TextTable[] tables)
        {
            foreach (ResIndexData res in new[] { latest, install })
            {
                double ratio = res.Entries.Count == 0 ? 0 : (double)res.PathsWithPrefix / res.Entries.Count;
                if (ratio < MinValidRatio) return $"só {ratio:P2} dos caminhos do ResIndex começam com Assets/";
            }
            foreach (TextTable table in tables)
            {
                double ratio = table.Cells == 0 ? 0 : 1 - (double)table.InvalidCells / table.Cells;
                if (ratio < MinValidRatio) return $"{table.Table}: só {ratio:P2} das células viraram UTF-8";
            }
            return null;
        }

        /// <summary>tools\HeartopiaOffline\out quando roda do repositório; senão .\heartopia-offline.</summary>
        private static string DefaultOutRoot()
        {
            for (DirectoryInfo dir = new DirectoryInfo(AppContext.BaseDirectory); dir != null; dir = dir.Parent)
                if (File.Exists(Path.Combine(dir.FullName, "HeartopiaOffline.csproj"))) return Path.Combine(dir.FullName, "out");
            return Path.Combine(Environment.CurrentDirectory, "heartopia-offline");
        }

        private static Dictionary<string, string> ParseArgs(string[] args)
        {
            var options = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "-h":
                    case "--help":
                        options["help"] = "";
                        break;
                    case "--game":
                    case "--cache":
                    case "--out":
                        if (i + 1 >= args.Length) return null;
                        options[args[i].Substring(2)] = args[++i];
                        break;
                    default:
                        Console.Error.WriteLine("Argumento desconhecido: " + args[i]);
                        return null;
                }
            }
            return options;
        }

        private static void PrintUsage()
        {
            Console.WriteLine("HeartopiaOffline — extração offline, com o jogo fechado e só leitura.");
            Console.WriteLine();
            Console.WriteLine("  --game <pasta>   instalação (padrão: achada pela Steam)");
            Console.WriteLine(@"  --cache <pasta>  cache de hotfix (padrão: %USERPROFILE%\AppData\LocalLow\xd\Heartopia)");
            Console.WriteLine(@"  --out <pasta>    saída (padrão: tools\HeartopiaOffline\out); grava em <out>\<ramo>_<versão>");
        }

        private static int Fail(string message)
        {
            Console.Error.WriteLine(message);
            return ExitError;
        }
    }
}
