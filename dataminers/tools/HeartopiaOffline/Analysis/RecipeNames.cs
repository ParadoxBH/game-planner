using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using GamePlanner.HeartopiaOffline.Readers;

namespace GamePlanner.HeartopiaOffline.Analysis
{
    /// <summary>Um item "receita" do jogo, visto pelos textos: o nome dela e o nome do que ela ensina a fazer.</summary>
    public sealed class RecipeName
    {
        /// <summary>"Food Recipe" (pt "Receita: X") ou "Recipe" (pt "Manual: X", mobília).</summary>
        public string Kind;
        public long Hash;
        public string En;
        public string Pt;
        public string TargetEn;
        public long? TargetHash;
        public string TargetPt;
        /// <summary>Id do catálogo cujo nome é o alvo, quando o <see cref="NameLinker"/> ligou.</summary>
        public string ItemId;
    }

    /// <summary>
    /// Nomes das receitas pelos textos "Food Recipe (X)" / "Recipe (X)". Os ingredientes e quantidades NÃO estão
    /// nos textos — ficam na tabela de receitas, dentro dos bundles criptografados.
    /// </summary>
    public static class RecipeNames
    {
        public static readonly Regex Pattern = new Regex(@"^(?<kind>(?:[A-Z][A-Za-z]* )?Recipe) \((?<target>[^()\n]+)\)$", RegexOptions.Compiled);

        public static List<RecipeName> Find(TextTable design, IList<CatalogItem> items)
        {
            int en = design.Index("en");
            int pt = design.Index("pt");
            if (en < 0) return new List<RecipeName>();

            var byEn = new Dictionary<string, TextRow>();
            foreach (TextRow row in design.Rows)
                if (row.Values[en] != null) byEn.TryAdd(row.Values[en], row);

            var itemByHash = new Dictionary<long, string>();
            foreach (CatalogItem item in items)
                if (item.NameHash.HasValue) itemByHash.TryAdd(item.NameHash.Value, item.Id);

            var result = new List<RecipeName>();
            foreach (TextRow row in design.Rows)
            {
                string text = row.Values[en];
                if (text == null) continue;
                Match m = Pattern.Match(text);
                if (!m.Success) continue;

                string target = m.Groups["target"].Value;
                byEn.TryGetValue(target, out TextRow targetRow);
                result.Add(new RecipeName
                {
                    Kind = m.Groups["kind"].Value,
                    Hash = row.Hash,
                    En = text,
                    Pt = pt >= 0 ? row.Values[pt] : null,
                    TargetEn = target,
                    TargetHash = targetRow?.Hash,
                    TargetPt = targetRow != null && pt >= 0 ? targetRow.Values[pt] : null,
                    ItemId = targetRow != null ? itemByHash.GetValueOrDefault(targetRow.Hash) : null,
                });
            }
            return result.OrderBy(r => r.Kind, System.StringComparer.Ordinal).ThenBy(r => r.TargetEn, System.StringComparer.Ordinal).ToList();
        }
    }
}
