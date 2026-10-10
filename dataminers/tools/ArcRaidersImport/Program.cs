using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using GamePlanner.ArcRaiders.Mapping;
using GamePlanner.ArcRaiders.Source;
using GamePlanner.Core.Mining;
using GamePlanner.Core.UI;
using GamePlanner.Core.Upload;

namespace GamePlanner.ArcRaiders
{
    /// <summary>
    /// Importação do ARC Raiders a partir do RaidTheory/arcraiders-data: sempre monta e exporta o dataset em JSON
    /// para conferir; com --upload, também envia para a API. Veja o README desta pasta.
    ///
    /// Aberto com duplo clique (sem opções e com console próprio), vira interativo: oferece baixar os dados,
    /// pergunta se envia e espera uma tecla antes de fechar a janela.
    /// </summary>
    public static class Program
    {
        private const int ExitOk = 0;
        private const int ExitError = 1;
        private const int ExitUploadFailures = 2;

        /// <summary>Variável de ambiente com a senha, para rodar sem digitar.</summary>
        private const string PasswordVariable = "GP_PASSWORD";

        public static int Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            bool ownConsole = OwnsConsole();
            int code = args.Length == 0 && ownConsole ? RunInteractive() : Run(args);
            if (ownConsole)
            {
                // Janela aberta pelo Explorer: sem isto ela fecha antes de dar para ler o resultado.
                Console.WriteLine();
                Console.Write("Pressione qualquer tecla para fechar...");
                Console.ReadKey(intercept: true);
            }
            return code;
        }

        private static int Run(string[] args)
        {
            Dictionary<string, string> options = ParseArgs(args);
            if (options == null || options.ContainsKey("help"))
            {
                PrintUsage();
                return options == null ? ExitError : ExitOk;
            }
            return Run(options);
        }

        private static int RunInteractive()
        {
            Console.WriteLine("ArcRaidersImport — importa o RaidTheory/arcraiders-data para o Game Planner.");
            Console.WriteLine();
            var options = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            string data = DefaultDataDirectory();
            bool exists = ArcSource.IsRepository(data);
            if (!exists ? Ask("Os dados ainda não foram baixados. Baixar agora (~23 MB)?", true)
                        : Ask("Atualizar os dados com o repositório?", false))
                options["update"] = "";

            if (Ask("Depois de exportar, enviar para a API?", false))
            {
                options["upload"] = "";
                options["api"] = Prompt("Endereço da API", "http://localhost:8080");
                options["user"] = Prompt("Usuário", null);
            }
            Console.WriteLine();
            return Run(options);
        }

        private static int Run(Dictionary<string, string> options)
        {
            try
            {
                string toolDir = ToolDirectory();
                string data = Path.GetFullPath(options.GetValueOrDefault("data") ?? DefaultDataDirectory());
                if (options.ContainsKey("update") && !DataRepository.CloneOrUpdate(data))
                    return Fail("Não foi possível baixar ou atualizar os dados em " + data + ".");

                // Itens, módulos e missões vêm da API do arctracker (em dia); o clone dá traduções e imagens.
                using ArcApi api = options.ContainsKey("offline") ? null : new ArcApi(Path.Combine(Path.GetDirectoryName(data), "arctracker"));
                ArcSource source = ArcSource.Load(data, api);
                if (source == null)
                    return Fail("Repositório não encontrado em " + data + ". Rode com --update para baixar, clone à mão " +
                                "(veja o README) ou informe a pasta com --data.");

                string gameId = options.GetValueOrDefault("game") ?? ArcDatasetBuilder.DefaultGameId;
                Console.WriteLine("Clone: " + data);
                foreach (string origin in source.Origins) Console.WriteLine("  " + origin);
                MinedDataset dataset = ArcDatasetBuilder.Build(source, gameId);

                string outRoot = Path.GetFullPath(options.GetValueOrDefault("out") ?? Path.Combine(toolDir, "out"));
                string exported = DatasetExporter.Export(dataset, outRoot);
                PrintSummary(dataset, exported);

                if (!options.ContainsKey("upload")) return ExitOk;
                return Upload(dataset, options, outRoot);
            }
            catch (Exception e) when (e is IOException || e is InvalidDataException || e is UnauthorizedAccessException)
            {
                return Fail(e.Message);
            }
        }

        private static int Upload(MinedDataset dataset, Dictionary<string, string> options, string outRoot)
        {
            var form = new AccountForm
            {
                ApiUrl = (options.GetValueOrDefault("api") ?? "http://localhost:8080").TrimEnd('/'),
                Username = options.GetValueOrDefault("user") ?? "",
                GameId = dataset.GameId,
                IncludeImages = !options.ContainsKey("no-images"),
            };
            if (string.IsNullOrWhiteSpace(form.Username)) return Fail("Informe o usuário com --user.");
            form.Password = Environment.GetEnvironmentVariable(PasswordVariable) ?? ReadPassword("Senha de " + form.Username + ": ");
            string invalid = form.Validate();
            if (invalid != null) return Fail(invalid);

            var progress = new UploadProgress();
            var uploader = new DatasetUploader(new ConsoleLog(), progress, Path.Combine(outRoot, "media-cache"));
            if (options.TryGetValue("parallel", out string parallel) && int.TryParse(parallel, out int workers))
                uploader.Parallelism = workers;

            using var cancel = new CancellationTokenSource();
            Console.CancelKeyPress += (_, e) =>
            {
                e.Cancel = true;
                Console.WriteLine("Cancelando...");
                cancel.Cancel();
            };
            uploader.Run(dataset, form, cancel.Token);

            UploadProgress.View result = progress.Snapshot();
            Console.WriteLine(result.Status);
            if (result.State != UploadState.Done) return ExitError;
            return uploader.FailureCount > 0 ? ExitUploadFailures : ExitOk;
        }

        private static void PrintSummary(MinedDataset dataset, string exported)
        {
            Console.WriteLine();
            Console.WriteLine($"Itens {dataset.Items.Count}, entidades {dataset.Entities.Count}, receitas {dataset.Recipes.Count}, " +
                              $"categorias {dataset.Categories.Count}, lojas {dataset.Shops.Count} ({dataset.ShopCategories.Count} categorias), " +
                              $"raridades {dataset.Rarities.Count}, imagens {dataset.Images.Count}");
            if (dataset.Warnings.Count > 0)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("Avisos (" + dataset.Warnings.Count + "):");
                foreach (string warning in dataset.Warnings) Console.WriteLine("  " + warning);
                Console.ResetColor();
            }
            Console.WriteLine("Exportado em " + exported);
        }

        /// <summary>Lê sem eco no console. Com a entrada redirecionada, lê a linha como veio.</summary>
        private static string ReadPassword(string prompt)
        {
            Console.Write(prompt);
            if (Console.IsInputRedirected) return Console.ReadLine() ?? "";
            var password = new StringBuilder();
            while (true)
            {
                ConsoleKeyInfo key = Console.ReadKey(intercept: true);
                if (key.Key == ConsoleKey.Enter) break;
                if (key.Key == ConsoleKey.Backspace)
                {
                    if (password.Length > 0) password.Length--;
                }
                else if (!char.IsControl(key.KeyChar)) password.Append(key.KeyChar);
            }
            Console.WriteLine();
            return password.ToString();
        }

        private static string DefaultDataDirectory() => Path.Combine(ToolDirectory(), "data", "arcraiders-data");

        /// <summary>Pergunta de sim ou não; Enter vale o padrão.</summary>
        private static bool Ask(string question, bool yes)
        {
            Console.Write(question + (yes ? " [S/n] " : " [s/N] "));
            string answer = (Console.ReadLine() ?? "").Trim().ToLowerInvariant();
            return answer.Length == 0 ? yes : answer.StartsWith("s") || answer.StartsWith("y");
        }

        /// <summary>Texto com padrão opcional; sem padrão, insiste até vir algo.</summary>
        private static string Prompt(string label, string fallback)
        {
            while (true)
            {
                Console.Write(label + (fallback != null ? " [" + fallback + "]" : "") + ": ");
                string answer = (Console.ReadLine() ?? "").Trim();
                if (answer.Length > 0) return answer;
                if (fallback != null) return fallback;
            }
        }

        /// <summary>
        /// Só este processo no console: a janela foi criada para ele (duplo clique no Explorer), e não é um terminal
        /// que continua aberto depois. Fora do Windows, nunca.
        /// </summary>
        private static bool OwnsConsole()
        {
            if (!OperatingSystem.IsWindows() || Console.IsInputRedirected) return false;
            try
            {
                return GetConsoleProcessList(new uint[2], 2) == 1;
            }
            catch (DllNotFoundException)
            {
                return false;
            }
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint GetConsoleProcessList(uint[] processList, uint processCount);

        private static string ToolDirectory()
        {
            for (DirectoryInfo dir = new DirectoryInfo(AppContext.BaseDirectory); dir != null; dir = dir.Parent)
                if (File.Exists(Path.Combine(dir.FullName, "ArcRaidersImport.csproj"))) return dir.FullName;
            return Environment.CurrentDirectory;
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
                    case "--upload":
                    case "--update":
                    case "--offline":
                    case "--no-images":
                        options[args[i].Substring(2)] = "";
                        break;
                    case "--data":
                    case "--out":
                    case "--game":
                    case "--api":
                    case "--user":
                    case "--parallel":
                        if (i + 1 >= args.Length) return null;
                        options[args[i].Substring(2)] = args[++i];
                        break;
                    default:
                        Console.Error.WriteLine("Opção desconhecida: " + args[i]);
                        return null;
                }
            }
            return options;
        }

        private static void PrintUsage()
        {
            Console.WriteLine("ArcRaidersImport — importa o RaidTheory/arcraiders-data para o Game Planner.");
            Console.WriteLine();
            Console.WriteLine(@"  --data <pasta>    clone do repositório (padrão: tools\ArcRaidersImport\data\arcraiders-data)");
            Console.WriteLine(@"  --out <pasta>     saída do JSON exportado (padrão: tools\ArcRaidersImport\out)");
            Console.WriteLine("  --update          baixa os dados com o git (ou atualiza, se já baixados) antes de importar");
            Console.WriteLine("  --offline         não consulta a API do arctracker: usa só o clone (que parou antes da 2.0)");
            Console.WriteLine("  --game <id>       id do jogo na API (padrão: arc_raiders)");
            Console.WriteLine("  --upload          além de exportar, envia para a API");
            Console.WriteLine("  --api <url>       endereço da API (padrão: http://localhost:8080)");
            Console.WriteLine("  --user <usuário>  conta que envia; a senha é pedida ou lida de " + PasswordVariable);
            Console.WriteLine("  --no-images       envia sem as imagens (as já ligadas ficam)");
            Console.WriteLine("  --parallel <n>    imagens enviadas ao mesmo tempo (padrão: 4)");
        }

        private static int Fail(string message)
        {
            Console.Error.WriteLine(message);
            return ExitError;
        }
    }
}
