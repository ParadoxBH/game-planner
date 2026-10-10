using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using GamePlanner.ArcRaiders.Source;
using GamePlanner.Core.Model;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>
    /// Receitas tiradas dos itens:
    /// <list type="bullet">
    /// <item>fabricação (recipe + craftBench): uma por bancada quando o item sai de mais de uma, porque o nível e as
    /// habilidades exigidas valem para cada bancada;</item>
    /// <item>reciclagem e recuperação (recyclesInto, salvagesInto): o item entra, os materiais saem;</item>
    /// <item>melhoria: o item e os materiais entram, o próximo nível sai. Na 2.0 vem em upgrades, uma lista por
    /// item que pode ramificar (anvil_amplified vira duas variantes), com requisito de pesquisa ou de nível de
    /// bancada. Sem ela, o formato antigo: custo (upgradeCost) no destino, origem em upgradesTo ou, sem isso, o
    /// nível anterior no id (rascal_ii vem de rascal_i);</item>
    /// <item>pesquisa (research): o custo e os pontos de pesquisa entram na Estação de Pesquisa, o item sai; e
    /// researchPoints, o item que se entrega na estação para ganhar pontos.</item>
    /// </list>
    /// Receita de reciclar, recuperar e melhorar leva nome, senão o site a mostraria pelo nome do primeiro produto.
    /// </summary>
    public sealed class RecipeMapper
    {
        private readonly ArcContext _context;
        private readonly StationMapper _stations;
        public const string ResearchStation = "research_station";

        /// <summary>Uma melhoria, já resolvida de qualquer um dos dois formatos.</summary>
        private sealed class Upgrade
        {
            public string From;
            public string To;
            public List<KeyValuePair<string, double>> Cost = new List<KeyValuePair<string, double>>();
            public List<RecipeUnlock> Unlock = new List<RecipeUnlock>();
            public string Station;
            public int? Level;
        }

        private List<Upgrade> _upgrades = new List<Upgrade>();
        private HashSet<string> _upgradeTargets = new HashSet<string>();

        public RecipeMapper(ArcContext context, StationMapper stations)
        {
            _context = context;
            _stations = stations;
        }

        public void AddRecipes()
        {
            _upgrades = Upgrades();
            _upgradeTargets = new HashSet<string>(_upgrades.Select(upgrade => upgrade.To));

            foreach (JsonObject item in _context.Source.Items)
            {
                string id = Fields.String(item["id"]);
                if (id == null) continue;
                string name = Localized.Text(item["name"]) ?? id;

                AddCrafting(id, item);
                AddBreakdown("recycle_" + id, "Reciclar " + name, StationMapper.Recycling, id, item["recyclesInto"]);
                AddBreakdown("salvage_" + id, "Recuperar " + name, StationMapper.Salvaging, id, item["salvagesInto"]);
                AddResearch(id, item);
                AddResearchPoints(id, name, item);
            }

            foreach (IGrouping<string, Upgrade> source in _upgrades.GroupBy(upgrade => upgrade.From))
                foreach (Upgrade upgrade in source)
                    AddUpgrade(upgrade, source.Count() == 1);
        }

        private void AddCrafting(string id, JsonObject item)
        {
            List<KeyValuePair<string, double>> ingredients = Fields.Amounts(item["recipe"]);
            List<string> benches = Fields.Strings(item["craftBench"]);
            if (ingredients.Count == 0)
            {
                // Os níveis II a IV das armas têm bancada e não têm receita: saem da melhoria do nível anterior.
                if (benches.Count > 0 && !_upgradeTargets.Contains(id))
                    _context.Warn("Item com bancada e sem receita, sem fabricação", id);
                return;
            }
            if (benches.Count == 0)
            {
                benches.Add(StationMapper.InRaid);
                _context.Warn("Receita sem bancada, enviada como fabricação em incursão", id);
            }

            int? level = Fields.Int(item["stationLevelRequired"]);
            double amount = Fields.Number(item["craftQuantity"]) is double quantity && quantity > 0 ? quantity : 1;
            List<RecipeUnlock> blueprint = BlueprintUnlock(id, item);

            foreach (string bench in benches)
            {
                var recipe = new RecipeDoc { ExtId = benches.Count == 1 ? "craft_" + id : "craft_" + id + "_" + bench };
                recipe.Stations.Add(_stations.Require(bench));
                // Nível 1 é o módulo recém-construído, que serve em qualquer nível: só vai nível acima dele.
                if (level > 1 && bench != StationMapper.InRaid) recipe.StationLevels[bench] = level.Value;

                foreach (KeyValuePair<string, double> ingredient in ingredients)
                    recipe.Inputs.Add(new Requirement(Reference.Item(ingredient.Key), ingredient.Value));
                recipe.Outputs.Add(new RecipeOutput(Reference.Item(id), amount));
                recipe.Unlock.AddRange(blueprint);
                recipe.Unlock.AddRange(SkillUnlocks(item, bench));
                _context.Dataset.Add(recipe);
            }
        }

        /// <summary>Nível romano no fim do id das armas: o esquema de anvil_i é anvil_blueprint.</summary>
        private static readonly Regex Tier = new Regex("_(i|ii|iii|iv|v)$");

        /// <summary>O esquema de um item é o item "{id}_blueprint" ou, para arma com nível, "{base}_blueprint".</summary>
        private List<RecipeUnlock> BlueprintUnlock(string id, JsonObject item)
        {
            var unlock = new List<RecipeUnlock>();
            if (!Fields.Bool(item["blueprintLocked"])) return unlock;
            string blueprint = new[] { id + "_blueprint", Tier.Replace(id, "") + "_blueprint" }
                .FirstOrDefault(_context.Source.ItemsById.ContainsKey);
            if (blueprint != null)
                unlock.Add(new RecipeUnlock("blueprint", Reference.Item(blueprint)));
            else
            {
                unlock.Add(new RecipeUnlock("blueprint", null, "Esquema"));
                _context.Warn("Item que exige esquema sem o item do esquema", id);
            }
            return unlock;
        }

        /// <summary>craftSkills: {"in_raid": ["surv_3r"]} — a habilidade da árvore que libera fabricar naquela bancada.</summary>
        private IEnumerable<RecipeUnlock> SkillUnlocks(JsonObject item, string bench)
        {
            if (item["craftSkills"] is not JsonObject skills) yield break;
            foreach (string skill in Fields.Strings(skills[bench]))
            {
                string name = _context.Source.SkillNodes.TryGetValue(skill, out JsonObject node) ? Localized.Text(node["name"]) : null;
                if (name == null) _context.Warn("Habilidade citada por receita que não está em skillNodes.json", skill);
                yield return new RecipeUnlock("skill", null, name ?? skill);
            }
        }

        private void AddBreakdown(string recipeId, string name, string station, string id, JsonNode products)
        {
            List<KeyValuePair<string, double>> outputs = Fields.Amounts(products);
            if (outputs.Count == 0) return;
            var recipe = new RecipeDoc { ExtId = recipeId, Name = name };
            recipe.Stations.Add(_stations.Require(station));
            recipe.Inputs.Add(new Requirement(Reference.Item(id), 1));
            foreach (KeyValuePair<string, double> output in outputs)
                recipe.Outputs.Add(new RecipeOutput(Reference.Item(output.Key), output.Value));
            _context.Dataset.Add(recipe);
        }

        // ------------------------------------------------------------------ melhoria

        private List<Upgrade> Upgrades()
        {
            var result = new List<Upgrade>();
            var covered = new HashSet<string>(System.StringComparer.Ordinal);

            // Formato da 2.0: upgrades: [{to, cost, requires: [{itemId} | {station, level}]}].
            foreach (JsonObject item in _context.Source.Items)
            {
                string id = Fields.String(item["id"]);
                if (id == null || item["upgrades"] is not JsonArray entries) continue;
                foreach (JsonObject entry in entries.OfType<JsonObject>())
                {
                    string to = Fields.String(entry["to"]);
                    if (to == null || !_context.Source.ItemsById.ContainsKey(to))
                    {
                        _context.Warn("Melhoria para item que não existe, ignorada", id + " -> " + to);
                        continue;
                    }
                    var upgrade = new Upgrade { From = id, To = to, Cost = Fields.Amounts(entry["cost"]) };
                    if (entry["requires"] is JsonArray requires)
                        foreach (JsonObject requirement in requires.OfType<JsonObject>())
                        {
                            if (Fields.String(requirement["itemId"]) is string needed)
                                upgrade.Unlock.Add(ItemUnlock(needed));
                            if (Fields.String(requirement["station"]) is string station)
                            {
                                upgrade.Station = station;
                                upgrade.Level = Fields.Int(requirement["level"]);
                            }
                        }
                    result.Add(upgrade);
                    covered.Add(id + ">" + to);
                }
            }

            // Formato antigo, para o que a lista nova não cobre (e para o clone, no modo offline).
            var legacy = new Dictionary<string, string>(System.StringComparer.Ordinal);
            foreach (JsonObject item in _context.Source.Items)
            {
                string id = Fields.String(item["id"]);
                string next = Fields.String(item["upgradesTo"]);
                if (id == null || next == null || covered.Contains(id + ">" + next)) continue;
                if (_context.Source.ItemsById.ContainsKey(next)) legacy[next] = id;
                else _context.Warn("Melhoria para item que não existe, ignorada", id + " -> " + next);
            }
            foreach (JsonObject item in _context.Source.Items)
            {
                string id = Fields.String(item["id"]);
                if (id == null || legacy.ContainsKey(id) || result.Any(upgrade => upgrade.To == id)
                    || Fields.Amounts(item["upgradeCost"]).Count == 0) continue;
                string previous = PreviousTier(id);
                if (previous != null && _context.Source.ItemsById.ContainsKey(previous)) legacy[id] = previous;
                else _context.Warn("Custo de melhoria sem o item de origem, ignorado", id);
            }
            foreach (KeyValuePair<string, string> entry in legacy)
                result.Add(new Upgrade
                {
                    From = entry.Value,
                    To = entry.Key,
                    Cost = Fields.Amounts(_context.Source.ItemsById[entry.Key]["upgradeCost"]),
                });
            return result;
        }

        /// <summary>Requisito que é um item: a pesquisa que libera (a maioria) ou outro item qualquer.</summary>
        private RecipeUnlock ItemUnlock(string itemId)
        {
            bool known = _context.Source.ItemsById.TryGetValue(itemId, out JsonObject needed);
            if (!known) _context.Warn("Requisito de melhoria que não está entre os itens", itemId);
            bool research = known && Fields.String(needed["type"]) == "Research";
            return new RecipeUnlock(research ? "research" : "requirement", Reference.Item(itemId));
        }

        private static readonly string[] Tiers = { "i", "ii", "iii", "iv", "v" };

        /// <summary>"rascal_iii" -> "rascal_ii"; null se o id não termina num nível acima do primeiro.</summary>
        private static string PreviousTier(string id)
        {
            Match tier = Tier.Match(id);
            if (!tier.Success) return null;
            int index = System.Array.IndexOf(Tiers, tier.Groups[1].Value);
            return index > 0 ? id.Substring(0, tier.Index) + "_" + Tiers[index - 1] : null;
        }

        /// <summary>
        /// Sem bancada no requisito, a melhoria acontece na mesma bancada que fabrica o item (o Armeiro, para as
        /// armas). O id fica upgrade_{origem} quando a origem só tem um destino, como antes da 2.0.
        /// </summary>
        private void AddUpgrade(Upgrade upgrade, bool single)
        {
            JsonObject source = _context.Source.ItemsById[upgrade.From];
            JsonObject target = _context.Source.ItemsById[upgrade.To];
            var recipe = new RecipeDoc
            {
                ExtId = single ? "upgrade_" + upgrade.From : "upgrade_" + upgrade.From + "_" + upgrade.To,
                Name = "Melhorar " + (Localized.Text(source["name"]) ?? upgrade.From) +
                       (single ? "" : " para " + (Localized.Text(target["name"]) ?? upgrade.To)),
            };
            string bench = upgrade.Station ?? Fields.Strings(target["craftBench"]).Concat(Fields.Strings(source["craftBench"]))
                .FirstOrDefault(candidate => candidate != StationMapper.InRaid);
            if (bench != null)
            {
                recipe.Stations.Add(_stations.Require(bench));
                if (upgrade.Level > 1) recipe.StationLevels[bench] = upgrade.Level.Value;
            }
            recipe.Inputs.Add(new Requirement(Reference.Item(upgrade.From), 1));
            foreach (KeyValuePair<string, double> material in upgrade.Cost)
                recipe.Inputs.Add(new Requirement(Reference.Item(material.Key), material.Value));
            recipe.Outputs.Add(new RecipeOutput(Reference.Item(upgrade.To), 1));
            recipe.Unlock.AddRange(upgrade.Unlock);
            _context.Dataset.Add(recipe);
        }

        // ------------------------------------------------------------------ pesquisa

        /// <summary>
        /// research: [{station, level, points, cost, requires: [{questId}]}]. Os pontos são a moeda da estação
        /// (item research_points), ganhos entregando itens (researchPoints).
        /// </summary>
        private void AddResearch(string id, JsonObject item)
        {
            if (item["research"] is not JsonArray entries) return;
            List<JsonObject> list = entries.OfType<JsonObject>().ToList();
            for (int i = 0; i < list.Count; i++)
            {
                JsonObject entry = list[i];
                var recipe = new RecipeDoc { ExtId = list.Count == 1 ? "research_" + id : "research_" + id + "_" + (i + 1) };
                AddResearchStation(recipe, entry);
                foreach (KeyValuePair<string, double> material in Fields.Amounts(entry["cost"]))
                    recipe.Inputs.Add(new Requirement(Reference.Item(material.Key), material.Value));
                if (Fields.Number(entry["points"]) is double points && points > 0)
                    recipe.Inputs.Add(new Requirement(Reference.Item(ItemMapper.ResearchPoints), points));
                recipe.Outputs.Add(new RecipeOutput(Reference.Item(id), 1));

                if (entry["requires"] is JsonArray requires)
                    foreach (JsonObject requirement in requires.OfType<JsonObject>())
                        if (Fields.String(requirement["questId"]) is string quest)
                        {
                            string name = _context.Source.Quests.TryGetValue(quest, out JsonObject node) ? Localized.Text(node["name"]) : null;
                            if (name == null) _context.Warn("Missão exigida por pesquisa que não está entre as missões", quest);
                            recipe.Unlock.Add(new RecipeUnlock("quest", null, name ?? quest));
                        }
                _context.Dataset.Add(recipe);
            }
        }

        private void AddResearchPoints(string id, string name, JsonObject item)
        {
            if (item["researchPoints"] is not JsonArray entries) return;
            JsonObject entry = entries.OfType<JsonObject>().FirstOrDefault();
            if (entry == null || Fields.Number(entry["points"]) is not double points || points <= 0) return;
            var recipe = new RecipeDoc { ExtId = "research_points_" + id, Name = "Entregar " + name + " para pesquisa" };
            AddResearchStation(recipe, entry);
            recipe.Inputs.Add(new Requirement(Reference.Item(id), 1));
            recipe.Outputs.Add(new RecipeOutput(Reference.Item(ItemMapper.ResearchPoints), points));
            _context.Dataset.Add(recipe);
        }

        private void AddResearchStation(RecipeDoc recipe, JsonObject entry)
        {
            string station = Fields.String(entry["station"]) ?? ResearchStation;
            recipe.Stations.Add(_stations.Require(station));
            if (Fields.Int(entry["level"]) is int level && level > 1) recipe.StationLevels[station] = level;
        }
    }
}
