using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using GamePlanner.HeartopiaOffline.Readers;

namespace GamePlanner.HeartopiaOffline.Analysis
{
    public sealed class TextChange
    {
        public long Hash;
        /// <summary>Null quando o texto é novo.</summary>
        public string Before;
        public string After;
    }

    /// <summary>
    /// O que cada execução guarda para a próxima comparar: nomes de bundle e o texto (inglês, ou chinês quando
    /// não há inglês) de cada hash do designTable. Fica em &lt;saída&gt;\&lt;versão&gt;\_snapshot.json.
    /// </summary>
    public sealed class Snapshot
    {
        public const string FileName = "_snapshot.json";

        public string Label { get; set; }
        public List<string> Bundles { get; set; } = new List<string>();
        public Dictionary<long, string> Texts { get; set; } = new Dictionary<long, string>();

        public static Snapshot Build(string label, IEnumerable<BundleEntry> bundles, TextTable design) => new Snapshot
        {
            Label = label,
            Bundles = bundles.Select(b => b.Name).Distinct().OrderBy(n => n, StringComparer.Ordinal).ToList(),
            Texts = design.Rows.ToDictionary(r => r.Hash, r => PatchDiff.Display(design, r)),
        };

        public void Save(string dir) =>
            File.WriteAllText(Path.Combine(dir, FileName), JsonSerializer.Serialize(this));

        /// <summary>O snapshot mais recente em <paramref name="outRoot"/> que não seja o da versão atual.</summary>
        public static Snapshot FindPrevious(string outRoot, string currentLabel)
        {
            if (!Directory.Exists(outRoot)) return null;
            FileInfo latest = new DirectoryInfo(outRoot).EnumerateDirectories()
                .Where(d => d.Name != currentLabel)
                .Select(d => new FileInfo(Path.Combine(d.FullName, FileName)))
                .Where(f => f.Exists)
                .OrderByDescending(f => f.LastWriteTimeUtc)
                .FirstOrDefault();
            return latest == null ? null : JsonSerializer.Deserialize<Snapshot>(File.ReadAllText(latest.FullName));
        }
    }

    /// <summary>
    /// O que mudou: instalação (versão da Steam) × hotfix (cache do lançador), e versão atual × última execução.
    /// Tudo que aparece aqui como novo pode ser conteúdo ainda não lançado — conferir no jogo antes de publicar.
    /// </summary>
    public sealed class PatchDiff
    {
        public bool HasHotfix;
        public readonly List<string> NewBundles = new List<string>();
        public readonly List<string> ChangedBundles = new List<string>();
        public readonly List<TextChange> DesignChanges = new List<TextChange>();
        public readonly List<TextChange> DialogueChanges = new List<TextChange>();
        public readonly List<string> NewResources = new List<string>();

        public string PreviousLabel;
        public readonly List<string> NewBundlesSincePrevious = new List<string>();
        public readonly List<string> RemovedBundlesSincePrevious = new List<string>();
        public readonly List<TextChange> TextChangesSincePrevious = new List<TextChange>();

        public static string Display(TextTable table, TextRow row) =>
            table.Get(row, "en") ?? table.Get(row, "zhHans");

        public static PatchDiff Compute(
            IReadOnlyList<BundleEntry> installBundles, IReadOnlyList<BundleEntry> hotfixBundles,
            TextTable installDesign, TextTable latestDesign,
            TextTable installDialogue, TextTable latestDialogue,
            ResIndexData installResources, ResIndexData latestResources,
            Snapshot current, Snapshot previous)
        {
            var diff = new PatchDiff { HasHotfix = hotfixBundles.Count > 0 || latestDesign != installDesign };

            var installNames = new HashSet<string>(installBundles.Select(b => b.Name), StringComparer.Ordinal);
            foreach (string name in hotfixBundles.Select(b => b.Name).Distinct().OrderBy(n => n, StringComparer.Ordinal))
                (installNames.Contains(name) ? diff.ChangedBundles : diff.NewBundles).Add(name);

            if (latestDesign != installDesign) diff.DesignChanges.AddRange(TextChanges(installDesign, latestDesign));
            if (latestDialogue != installDialogue) diff.DialogueChanges.AddRange(TextChanges(installDialogue, latestDialogue));

            if (latestResources != installResources)
            {
                var installPaths = new HashSet<string>(installResources.Entries.Select(e => e.Path).Where(p => p != null), StringComparer.Ordinal);
                diff.NewResources.AddRange(latestResources.Entries
                    .Select(e => e.Path)
                    .Where(p => p != null && !installPaths.Contains(p))
                    .OrderBy(p => p, StringComparer.Ordinal));
            }

            if (previous != null)
            {
                diff.PreviousLabel = previous.Label;
                var before = new HashSet<string>(previous.Bundles, StringComparer.Ordinal);
                var now = new HashSet<string>(current.Bundles, StringComparer.Ordinal);
                diff.NewBundlesSincePrevious.AddRange(current.Bundles.Where(n => !before.Contains(n)));
                diff.RemovedBundlesSincePrevious.AddRange(previous.Bundles.Where(n => !now.Contains(n)));
                foreach ((long hash, string text) in current.Texts.OrderBy(kv => kv.Key))
                {
                    previous.Texts.TryGetValue(hash, out string old);
                    if (old != text) diff.TextChangesSincePrevious.Add(new TextChange { Hash = hash, Before = old, After = text });
                }
            }
            return diff;
        }

        /// <summary>Textos novos ou com o texto trocado (inglês, ou chinês quando não há inglês).</summary>
        private static IEnumerable<TextChange> TextChanges(TextTable before, TextTable after)
        {
            var old = new Dictionary<long, string>();
            foreach (TextRow row in before.Rows) old[row.Hash] = Display(before, row);
            foreach (TextRow row in after.Rows)
            {
                string text = Display(after, row);
                old.TryGetValue(row.Hash, out string previous);
                if (!old.ContainsKey(row.Hash) || previous != text)
                    yield return new TextChange { Hash = row.Hash, Before = previous, After = text };
            }
        }
    }
}
