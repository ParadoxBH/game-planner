using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using GamePlanner.HeartopiaOffline.Readers;
using GamePlanner.HeartopiaOffline.Sources;

namespace GamePlanner.HeartopiaOffline.Analysis
{
    public sealed class CatalogItem
    {
        /// <summary>"food", "decoration", "fish"... — o token depois de "ui_item_normal_p_".</summary>
        public string Category;
        /// <summary>"food_cheesepumpkinnoodles": categoria + nome base, sem sufixo de variante.</summary>
        public string Id;
        public string BaseName;
        /// <summary>Nomes (sem prefixo) dos bundles de ícone que caíram neste item: estágios, prêmio etc.</summary>
        public readonly List<string> Icons = new List<string>();
        /// <summary>instalação, hotfix ou "instalação+hotfix" (o patch trocou o ícone).</summary>
        public string Origin;
        /// <summary>Tema de mobília deduzido do nome (heurística, ver <see cref="Sets"/>).</summary>
        public string Theme;

        public long? NameHash;
        public string NameEn;
        public string NamePt;
    }

    /// <summary>
    /// Catálogo de itens a partir dos ícones de inventário: todo item que aparece na mochila tem um bundle
    /// "ui_item_normal_p_&lt;categoria&gt;_&lt;nome&gt;". É o que dá para saber sem abrir bundle nenhum.
    /// </summary>
    public static class Catalog
    {
        private static readonly Regex IconPattern = new Regex(@"^ui_item_normal_p_([a-z]+)_(.+)$", RegexOptions.Compiled);
        // Estágio de plantio, variante "sub" e ícone de prêmio são o mesmo item.
        private static readonly Regex VariantSuffix = new Regex(@"(_(award|sub|step\d+))+_*$|_+$", RegexOptions.Compiled);

        public static List<CatalogItem> Build(IEnumerable<BundleEntry> bundles)
        {
            // O mesmo ícone pode estar na instalação e no cache (o patch trocou o arquivo).
            var origins = new Dictionary<string, SortedSet<string>>();
            foreach (BundleEntry bundle in bundles)
            {
                if (!IconPattern.IsMatch(bundle.Name)) continue;
                if (!origins.TryGetValue(bundle.Name, out SortedSet<string> set)) origins[bundle.Name] = set = new SortedSet<string>();
                set.Add(bundle.Origin);
            }

            var items = new Dictionary<string, CatalogItem>();
            foreach ((string icon, SortedSet<string> iconOrigins) in origins.OrderBy(kv => kv.Key, System.StringComparer.Ordinal))
            {
                Match m = IconPattern.Match(icon);
                string category = m.Groups[1].Value;
                string rest = m.Groups[2].Value;
                string baseName = VariantSuffix.Replace(rest, "");
                if (baseName.Length == 0) baseName = rest;
                string id = category + "_" + baseName;

                if (!items.TryGetValue(id, out CatalogItem item))
                    items[id] = item = new CatalogItem { Category = category, Id = id, BaseName = baseName };
                item.Icons.Add(icon);
                item.Origin = MergeOrigin(item.Origin, iconOrigins);
            }
            return items.Values.OrderBy(i => i.Category, System.StringComparer.Ordinal).ThenBy(i => i.Id, System.StringComparer.Ordinal).ToList();
        }

        private static string MergeOrigin(string current, SortedSet<string> iconOrigins)
        {
            var all = new SortedSet<string>(iconOrigins);
            if (current != null) foreach (string o in current.Split('+')) all.Add(o);
            // "instalação" antes de "hotfix", para ler como linha do tempo.
            return string.Join("+", all.OrderBy(o => o == SourceSet.Install ? 0 : 1));
        }
    }
}
