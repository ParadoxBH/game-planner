using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace GamePlanner.HeartopiaOffline.Sources
{
    /// <summary>Acha a instalação (pela Steam) e o cache de hotfix (LocalLow) do Heartopia.</summary>
    public static class GameLocator
    {
        public const string SteamAppId = "4025700";

        /// <summary>Pasta da instalação: a informada, ou a da Steam. Null se não achar.</summary>
        public static string FindInstall(string explicitPath)
        {
            if (!string.IsNullOrEmpty(explicitPath)) return IsInstall(explicitPath) ? Path.GetFullPath(explicitPath) : null;

            foreach (string library in SteamLibraries())
            {
                string manifest = Path.Combine(library, "steamapps", "appmanifest_" + SteamAppId + ".acf");
                if (!File.Exists(manifest)) continue;
                Match m = Regex.Match(File.ReadAllText(manifest), "\"installdir\"\\s+\"([^\"]+)\"");
                if (!m.Success) continue;
                string dir = Path.Combine(library, "steamapps", "common", m.Groups[1].Value);
                if (IsInstall(dir)) return dir;
            }
            return null;
        }

        /// <summary>Pasta do cache de hotfix (%USERPROFILE%\AppData\LocalLow\xd\Heartopia). Null se não existir.</summary>
        public static string FindCache(string explicitPath)
        {
            string dir = !string.IsNullOrEmpty(explicitPath)
                ? explicitPath
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "AppData", "LocalLow", "xd", "Heartopia");
            return Directory.Exists(Path.Combine(dir, "Others", "db")) ? Path.GetFullPath(dir) : null;
        }

        private static bool IsInstall(string dir) =>
            Directory.Exists(Path.Combine(dir, "xdt_Data", "StreamingAssets"));

        private static IEnumerable<string> SteamLibraries()
        {
            if (!OperatingSystem.IsWindows()) yield break;
            string steam = Registry.GetValue(@"HKEY_CURRENT_USER\Software\Valve\Steam", "SteamPath", null) as string;
            if (string.IsNullOrEmpty(steam)) yield break;

            yield return steam;
            string folders = Path.Combine(steam, "steamapps", "libraryfolders.vdf");
            if (!File.Exists(folders)) yield break;
            foreach (Match m in Regex.Matches(File.ReadAllText(folders), "\"path\"\\s+\"([^\"]+)\""))
                yield return m.Groups[1].Value.Replace(@"\\", @"\");
        }
    }
}
