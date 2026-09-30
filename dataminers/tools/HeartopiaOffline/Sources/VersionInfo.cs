using System.IO;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GamePlanner.HeartopiaOffline.Sources
{
    /// <summary>Ramo e versão de recursos lidos do version.xdtconf.</summary>
    public sealed class VersionInfo
    {
        public string Branch;
        public string Version;
        public string ResVersion;

        /// <summary>Nome da pasta de saída: "obt_release5_6077235".</summary>
        public string Label => (Branch ?? "desconhecido") + "_" + (ResVersion ?? "0");

        public override string ToString() =>
            $"{Branch ?? "?"} / recursos {ResVersion ?? "?"}" + (Version != null ? $" (cliente {Version})" : "");

        /// <summary>Na instalação o arquivo é JSON.</summary>
        public static VersionInfo ReadInstall(string streamingAssets)
        {
            string file = Path.Combine(streamingAssets, "version.xdtconf");
            if (!File.Exists(file)) return null;
            using JsonDocument doc = JsonDocument.Parse(File.ReadAllText(file));
            JsonElement root = doc.RootElement;
            return new VersionInfo
            {
                Branch = Get(root, "Branch"),
                Version = Get(root, "Version"),
                ResVersion = Get(root, "ResVersion"),
            };
        }

        /// <summary>
        /// No cache o lançador grava o mesmo objeto com BinaryFormatter. Não desserializa (é inseguro e obsoleto):
        /// ramo e versão saem da URL de download, ".../prod/obt_release5/windows/5847751/6077235".
        /// </summary>
        public static VersionInfo ReadCache(string cacheDir)
        {
            string file = Path.Combine(cacheDir, "version.xdtconf");
            if (!File.Exists(file)) return null;
            string text = Encoding.Latin1.GetString(File.ReadAllBytes(file));
            Match m = Regex.Match(text, @"/prod/([A-Za-z0-9_.-]+)/[a-z]+/(\d+)/(\d+)");
            return m.Success ? new VersionInfo { Branch = m.Groups[1].Value, ResVersion = m.Groups[3].Value } : null;
        }

        private static string Get(JsonElement root, string name) =>
            root.TryGetProperty(name, out JsonElement value) ? value.ToString() : null;
    }
}
