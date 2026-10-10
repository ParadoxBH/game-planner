using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;

namespace GamePlanner.ArcRaiders.Source
{
    /// <summary>
    /// Baixa e atualiza o clone do RaidTheory/arcraiders-data com o git: só as pastas que a ferramenta usa
    /// (~23 MB; o repositório inteiro passa de 230 MB por causa das imagens de mapa).
    /// </summary>
    public static class DataRepository
    {
        public const string Url = "https://github.com/RaidTheory/arcraiders-data.git";

        private static readonly string[] SparsePaths =
        {
            "/*.json", "/items/*", "/hideout/*", "/quests/*", "/arctracker-ui/*",
            "/images/items/*", "/images/traders/*", "/images/workshop/*",
        };

        /// <summary>Clona se a pasta não existe; senão, puxa o que mudou. False se o git falhou ou não está instalado.</summary>
        public static bool CloneOrUpdate(string target)
        {
            if (Directory.Exists(Path.Combine(target, ".git")))
            {
                Console.WriteLine("Atualizando " + target + "...");
                return Git(null, "-C", target, "pull", "--ff-only");
            }

            Directory.CreateDirectory(Path.GetDirectoryName(target));
            Console.WriteLine("Baixando " + Url + " em " + target + "...");
            if (!Git(null, "clone", "--depth", "1", "--filter=blob:none", "--sparse", Url, target)) return false;

            var args = new System.Collections.Generic.List<string> { "-C", target, "sparse-checkout", "set", "--no-cone" };
            args.AddRange(SparsePaths);
            return Git(null, args.ToArray());
        }

        private static bool Git(string workingDirectory, params string[] args)
        {
            var start = new ProcessStartInfo("git") { UseShellExecute = false, WorkingDirectory = workingDirectory ?? "" };
            foreach (string arg in args) start.ArgumentList.Add(arg);
            try
            {
                using Process process = Process.Start(start);
                process.WaitForExit();
                return process.ExitCode == 0;
            }
            catch (Win32Exception)
            {
                Console.Error.WriteLine("git não encontrado. Instale o Git (https://git-scm.com) ou clone o repositório à mão (README).");
                return false;
            }
        }
    }
}
