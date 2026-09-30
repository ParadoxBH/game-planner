using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using GamePlanner.HeartopiaOffline.Readers;

namespace GamePlanner.HeartopiaOffline.Analysis
{
    /// <summary>
    /// Liga o id interno de um item ao nome em inglês por normalização: "cheesepumpkinnoodles" ↔ "Cheese Pumpkin
    /// Noodles". Só vale para os itens cujo nome interno é o próprio nome em inglês (comida, plantio, flores);
    /// ids numéricos (top131, bird141) não têm como ligar sem a tabela de itens, que está nos bundles criptografados.
    /// </summary>
    public static class NameLinker
    {
        private const int MaxNameLength = 40;
        private const int MinKeyLength = 5;

        private static readonly Regex TrailingVariant = new Regex(@"(_(\d+|[a-z]))+$", RegexOptions.Compiled);

        /// <summary>Preenche NameHash/NameEn/NamePt dos itens ligados e devolve quantos ligou.</summary>
        public static int Link(IList<CatalogItem> items, TextTable design)
        {
            int en = design.Index("en");
            int pt = design.Index("pt");
            if (en < 0) return 0;

            var byName = new Dictionary<string, TextRow>();
            foreach (TextRow row in design.Rows)
            {
                string text = row.Values[en];
                if (text == null || text.Length > MaxNameLength || text.Contains('\n')) continue;
                byName.TryAdd(Normalize(text), row);
            }

            int linked = 0;
            foreach (CatalogItem item in items)
            {
                foreach (string candidate in Candidates(item))
                {
                    string key = Normalize(candidate);
                    if (key.Length < MinKeyLength || key.Any(char.IsDigit) || key == item.Category) continue;
                    if (!byName.TryGetValue(key, out TextRow row)) continue;

                    item.NameHash = row.Hash;
                    item.NameEn = row.Values[en];
                    item.NamePt = pt >= 0 ? row.Values[pt] : null;
                    linked++;
                    break;
                }
            }
            return linked;
        }

        public static string Normalize(string value)
        {
            var sb = new StringBuilder(value.Length);
            foreach (char c in value.ToLowerInvariant())
                if (c is >= 'a' and <= 'z' or >= '0' and <= '9') sb.Append(c);
            return sb.ToString();
        }

        private static IEnumerable<string> Candidates(CatalogItem item)
        {
            // "wheat_5" e "persimmon_1" são variedades do mesmo nome: tenta também sem o número/letra do fim.
            string trimmed = TrailingVariant.Replace(item.BaseName, "");
            foreach (string name in trimmed.Length > 0 && trimmed != item.BaseName ? new[] { item.BaseName, trimmed } : new[] { item.BaseName })
            {
                yield return name;
                yield return item.Category + name;
                yield return name + item.Category;
            }
        }
    }
}
