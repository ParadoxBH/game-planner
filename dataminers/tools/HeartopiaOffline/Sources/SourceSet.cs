using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;

namespace GamePlanner.HeartopiaOffline.Sources
{
    /// <summary>Um .db do jogo copiado para a pasta de trabalho, com o MD5 que os manifestos esperam.</summary>
    public sealed class DbFile
    {
        public string Name;
        public string Origin;
        public string OriginalPath;
        public string WorkPath;
        /// <summary>MD5 do dbList.txt da mesma pasta.</summary>
        public string ListedMd5;
        /// <summary>MD5 do GameFileInfo.json (só arquivos da instalação).</summary>
        public string ManifestMd5;
        /// <summary>MD5 do original, recalculado no fim da execução.</summary>
        public string ActualMd5;

        public bool Intact =>
            ActualMd5 != null && (ListedMd5 == null || ListedMd5 == ActualMd5) && (ManifestMd5 == null || ManifestMd5 == ActualMd5);
    }

    /// <summary>
    /// As duas fontes do jogo: a instalação (StreamingAssets, versão do download da Steam) e o cache de hotfix
    /// (LocalLow), que o lançador atualiza a cada patch e o jogo prefere quando existe. Nada aqui abre arquivo do
    /// jogo para escrita: os .db são copiados para a pasta de trabalho e só a cópia é aberta.
    /// </summary>
    public sealed class SourceSet
    {
        public const string Install = "instalação";
        public const string Hotfix = "hotfix";

        public readonly string InstallDir;
        public readonly string StreamingAssets;
        public readonly string CacheDir;
        public readonly VersionInfo InstallVersion;
        public readonly VersionInfo CacheVersion;
        public readonly List<DbFile> Copied = new List<DbFile>();

        private Dictionary<string, string> _manifest;

        public SourceSet(string installDir, string cacheDir)
        {
            InstallDir = installDir;
            StreamingAssets = Path.Combine(installDir, "xdt_Data", "StreamingAssets");
            CacheDir = cacheDir;
            InstallVersion = VersionInfo.ReadInstall(StreamingAssets);
            CacheVersion = cacheDir != null ? VersionInfo.ReadCache(cacheDir) : null;
        }

        /// <summary>A versão que o jogo usa de fato: a do cache, se houver.</summary>
        public VersionInfo Latest => CacheVersion ?? InstallVersion ?? new VersionInfo();

        public string InstallBundleDir => Path.Combine(StreamingAssets, "AssetBundle");
        public string CacheBundleDir => CacheDir != null ? Path.Combine(CacheDir, "AssetBundle") : null;

        public bool HasCacheDb(string name) => CacheDir != null && File.Exists(Path.Combine(CacheDir, "Others", "db", name));

        /// <summary>Copia o .db (da instalação ou do cache) para <paramref name="workDir"/> e devolve a cópia.</summary>
        public DbFile Copy(string name, string origin, string workDir)
        {
            string dbDir = origin == Hotfix ? Path.Combine(CacheDir, "Others", "db") : Path.Combine(StreamingAssets, "Others", "db");
            string original = Path.Combine(dbDir, name);
            if (!File.Exists(original)) throw new FileNotFoundException("Arquivo do jogo não encontrado.", original);

            string target = Path.Combine(workDir, (origin == Hotfix ? "hotfix_" : "install_") + name);
            File.Copy(original, target, overwrite: true);

            var file = new DbFile
            {
                Name = name,
                Origin = origin,
                OriginalPath = original,
                WorkPath = target,
                ListedMd5 = ReadDbList(dbDir).GetValueOrDefault(name),
                ManifestMd5 = origin == Install ? Manifest().GetValueOrDefault("xdt_Data/StreamingAssets/Others/db/" + name) : null,
            };
            Copied.Add(file);
            return file;
        }

        /// <summary>Recalcula o MD5 dos originais para provar que a execução não alterou nada.</summary>
        public void VerifyOriginals()
        {
            foreach (DbFile file in Copied)
            {
                using var stream = new FileStream(file.OriginalPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                file.ActualMd5 = Convert.ToHexStringLower(MD5.HashData(stream));
            }
        }

        /// <summary>dbList.txt: "nome|md5|tamanho" por linha.</summary>
        private static Dictionary<string, string> ReadDbList(string dbDir)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string file = Path.Combine(dbDir, "dbList.txt");
            if (!File.Exists(file)) return result;
            foreach (string line in File.ReadAllLines(file))
            {
                string[] parts = line.Trim().TrimStart('﻿').Split('|');
                if (parts.Length >= 2) result[parts[0]] = parts[1].ToLowerInvariant();
            }
            return result;
        }

        /// <summary>GameFileInfo.json da raiz da instalação: MD5 de cada arquivo que a Steam instalou.</summary>
        private Dictionary<string, string> Manifest()
        {
            if (_manifest != null) return _manifest;
            _manifest = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string file = Path.Combine(InstallDir, "GameFileInfo.json");
            if (!File.Exists(file)) return _manifest;

            using FileStream stream = File.OpenRead(file);
            using JsonDocument doc = JsonDocument.Parse(stream);
            if (!doc.RootElement.TryGetProperty("FileInfos", out JsonElement infos)) return _manifest;
            foreach (JsonElement info in infos.EnumerateArray())
            {
                if (info.TryGetProperty("FileName", out JsonElement name) && info.TryGetProperty("Md5Hash", out JsonElement md5))
                    _manifest[name.GetString()] = md5.GetString()?.ToLowerInvariant();
            }
            return _manifest;
        }
    }
}
