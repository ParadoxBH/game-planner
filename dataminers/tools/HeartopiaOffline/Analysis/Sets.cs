using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using GamePlanner.HeartopiaOffline.Readers;

namespace GamePlanner.HeartopiaOffline.Analysis
{
    public sealed class TextMember
    {
        public long Hash;
        public string En;
        public string Pt;
    }

    /// <summary>Textos no formato "Coleção (Peça)", como "Fantasy Carnival (Gray Bliss)".</summary>
    public sealed class TextCollection
    {
        public string Prefix;
        public readonly List<TextMember> Members = new List<TextMember>();
    }

    /// <summary>Itens de mobília que compartilham o tema no nome interno, como "season_newyear" ou "barbershop".</summary>
    public sealed class ThemeGroup
    {
        public string Theme;
        public readonly SortedDictionary<string, int> Categories = new SortedDictionary<string, int>(StringComparer.Ordinal);
        public readonly List<string> Items = new List<string>();
    }

    /// <summary>
    /// Candidatos a conjunto — só heurística. A definição oficial de cada conjunto (peças e bônus) está nos bundles
    /// criptografados; aqui sai o que os nomes deixam ver, para a comunidade conferir no jogo.
    /// </summary>
    public static class Sets
    {
        private const int MinMembers = 3;

        private static readonly Regex CollectionPattern = new Regex(@"^(?<prefix>[^()\n]{3,40}?) \((?<piece>[^()\n]{1,60})\)$", RegexOptions.Compiled);

        // Plantio, flor, bicho, comida e coleta: o "tema" do nome é a espécie, não um conjunto de mobília.
        private static readonly string[] NotFurniture =
        {
            "crop", "flower", "sand", "pumpkin", "gather", "dynamic", "fish", "bird", "insect", "food", "ingredient",
        };

        /// <summary>Agrupa "Prefixo (Peça)" pelo prefixo; recebe de fora os prefixos que já têm relatório próprio.</summary>
        public static List<TextCollection> TextCollections(TextTable design, ISet<string> skipPrefixes)
        {
            int en = design.Index("en");
            int pt = design.Index("pt");
            var groups = new Dictionary<string, TextCollection>(StringComparer.Ordinal);
            foreach (TextRow row in design.Rows)
            {
                string text = en >= 0 ? row.Values[en] : null;
                if (text == null) continue;
                Match m = CollectionPattern.Match(text);
                if (!m.Success) continue;
                string prefix = m.Groups["prefix"].Value.Trim();
                if (skipPrefixes.Contains(prefix)) continue;

                if (!groups.TryGetValue(prefix, out TextCollection group)) groups[prefix] = group = new TextCollection { Prefix = prefix };
                group.Members.Add(new TextMember { Hash = row.Hash, En = text, Pt = pt >= 0 ? row.Values[pt] : null });
            }
            return groups.Values
                .Where(g => g.Members.Count >= MinMembers)
                .OrderByDescending(g => g.Members.Count).ThenBy(g => g.Prefix, StringComparer.Ordinal)
                .ToList();
        }

        /// <summary>Textos curtos terminados em " Set" ("Wilderness Coffee Set"): nomes de conjunto citados pelo jogo.</summary>
        public static List<TextMember> NamedSets(TextTable design)
        {
            int en = design.Index("en");
            int pt = design.Index("pt");
            return design.Rows
                .Where(r => en >= 0 && r.Values[en] is { Length: <= 40 } t && t.EndsWith(" Set", StringComparison.Ordinal) && !t.Contains('\n'))
                .Select(r => new TextMember { Hash = r.Hash, En = r.Values[en], Pt = pt >= 0 ? r.Values[pt] : null })
                .OrderBy(m => m.En, StringComparer.Ordinal)
                .ToList();
        }

        /// <summary>
        /// Tema = o começo do nome interno até a categoria reaparecer ("mall_afternoon_table_table_1", categoria
        /// table -> "mall_afternoon"), ou o primeiro token. Vale como conjunto quando junta 3+ itens de 2+ categorias.
        /// Preenche <see cref="CatalogItem.Theme"/> dos itens que caíram num grupo.
        /// </summary>
        public static List<ThemeGroup> Themes(IList<CatalogItem> items)
        {
            var groups = new Dictionary<string, ThemeGroup>(StringComparer.Ordinal);
            var themeOf = new Dictionary<CatalogItem, string>();
            foreach (CatalogItem item in items)
            {
                if (NotFurniture.Any(p => item.Category.StartsWith(p, StringComparison.Ordinal))) continue;
                string theme = ThemeOf(item.Category, item.BaseName);
                if (theme == null) continue;

                if (!groups.TryGetValue(theme, out ThemeGroup group)) groups[theme] = group = new ThemeGroup { Theme = theme };
                group.Categories[item.Category] = group.Categories.GetValueOrDefault(item.Category) + 1;
                group.Items.Add(item.Id);
                themeOf[item] = theme;
            }

            List<ThemeGroup> kept = groups.Values
                .Where(g => g.Items.Count >= MinMembers && g.Categories.Count >= 2)
                .OrderByDescending(g => g.Items.Count).ThenBy(g => g.Theme, StringComparer.Ordinal)
                .ToList();
            var keptThemes = new HashSet<string>(kept.Select(g => g.Theme));
            foreach ((CatalogItem item, string theme) in themeOf)
                if (keptThemes.Contains(theme)) item.Theme = theme;
            return kept;
        }

        private static string ThemeOf(string category, string baseName)
        {
            string[] tokens = baseName.Split('_', StringSplitOptions.RemoveEmptyEntries);
            if (tokens.Length == 0) return null;
            string theme = tokens[0];
            for (int k = 1; k < tokens.Length; k++)
            {
                string t = tokens[k];
                if (t.StartsWith(category, StringComparison.Ordinal) || (t.Length >= 4 && category.StartsWith(t, StringComparison.Ordinal)))
                {
                    theme = string.Join("_", tokens.Take(k));
                    break;
                }
            }
            // "top131", "bird141": numeração, não tema.
            if (theme == category || Regex.IsMatch(theme, @"^[a-z]*\d+$")) return null;
            return theme;
        }
    }
}
