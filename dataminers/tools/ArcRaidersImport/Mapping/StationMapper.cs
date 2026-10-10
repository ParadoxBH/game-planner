using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Text.Json.Nodes;
using GamePlanner.ArcRaiders.Source;
using GamePlanner.Core.Model;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>
    /// Módulos da oficina (hideout/) como entidades, e o custo de cada nível como receita cujo produto é o próprio
    /// módulo naquele nível — como o Valheim faz com o custo das construções. Mais três "bancadas" que o jogo não
    /// tem como módulo, mas que o site precisa para agrupar as receitas: fabricar em incursão, reciclar e recuperar.
    /// </summary>
    public sealed class StationMapper
    {
        public const string InRaid = "in_raid";
        public const string Recycling = "recycling";
        public const string Salvaging = "salvaging";

        private const string Group = "Oficina";

        /// <summary>
        /// Imagem de images/workshop do clone pelo id do módulo. Os outros módulos (estação de pesquisa, estoque...)
        /// usam a imagem do primeiro nível na API, baixada para o cache como hideout/{id}.
        /// </summary>
        private static readonly Dictionary<string, string> WorkshopImages = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            { "equipment_bench", "gearbench" },
            { "explosives_bench", "explosivesstation" },
            { "med_station", "medicallab" },
            { "refiner", "refiner" },
            { "utility_bench", "utilitystation" },
            { "weapon_bench", "gunsmith" },
        };

        /// <summary>"5000 Coins", o único requisito em texto (níveis do estoque).</summary>
        private static readonly Regex CoinRequirement = new Regex(@"^\s*([\d.,]+)\s*Coins?\s*$", RegexOptions.IgnoreCase);

        private readonly ArcContext _context;
        private readonly ArcCatalog _catalog;
        private readonly Dictionary<string, EntityDoc> _stations = new Dictionary<string, EntityDoc>(StringComparer.Ordinal);

        public StationMapper(ArcContext context, ArcCatalog catalog)
        {
            _context = context;
            _catalog = catalog;
        }

        public void DefineAttributes()
        {
            _context.Dataset.Define(new AttributeDefinitionDoc("max_level", "Nível máximo", Group, 0));
        }

        public void AddStations()
        {
            foreach (JsonObject module in _context.Source.Hideout)
            {
                string id = Fields.String(module["id"]);
                if (id == null) continue;
                EntityDoc station = Add(id, Localized.Text(module["name"]) ?? id, null);
                if (Fields.Int(module["maxLevel"]) is int maxLevel && maxLevel > 0) station.Attributes["max_level"] = maxLevel;
                AddLevelRecipes(id, station.Name, module["levels"] as JsonArray);
            }

            Add(InRaid, _context.Source.UiText("ItemDetailPage", "inRaidCrafting") ?? "Fabricação em incursão",
                "Fabricação durante a incursão, sem bancada da oficina.");
            Add(Recycling, "Reciclagem", "Reciclar um item na oficina devolve parte dos materiais.");
            Add(Salvaging, "Recuperação", "Recuperar um item durante a incursão devolve menos materiais que reciclar.");
        }

        /// <summary>Bancada citada por uma receita; se não é módulo conhecido, é criada com o código como nome.</summary>
        public string Require(string id)
        {
            if (!_stations.ContainsKey(id))
            {
                Add(id, id, null);
                _context.Warn("Bancada citada por receita que não está em hideout/", id);
            }
            return id;
        }

        private EntityDoc Add(string id, string name, string summary)
        {
            var station = new EntityDoc
            {
                ExtId = id,
                Name = name,
                Summary = summary,
                Categories = new List<string> { _catalog.StationCategory() },
            };
            string key = null;
            byte[] png = null;
            if (WorkshopImages.TryGetValue(id, out string file) && (png = _context.Source.Image("workshop", file)) != null)
                key = "workshop/" + file;
            else if ((png = _context.Source.Image("hideout", id)) != null)
                key = "hideout/" + id;
            if (key != null)
            {
                _context.Dataset.Images[key] = png;
                station.IconImage = key;
            }
            _stations[id] = station;
            _context.Dataset.Add(station);
            return station;
        }

        /// <summary>Um nível sem custo nenhum (o primeiro do estoque e da Sucatinha) não vira receita.</summary>
        private void AddLevelRecipes(string id, string name, JsonArray levels)
        {
            if (levels == null) return;
            foreach (JsonObject level in levels.OfType<JsonObject>())
            {
                if (Fields.Int(level["level"]) is not int number) continue;
                var recipe = new RecipeDoc
                {
                    ExtId = "build_" + id + "_" + number,
                    Name = name + " nível " + number,
                    Description = Fields.String(level["description"]),
                };

                if (level["requirementItemIds"] is JsonArray requirements)
                    foreach (JsonObject requirement in requirements.OfType<JsonObject>())
                        if (Fields.String(requirement["itemId"]) is string item && Fields.Number(requirement["quantity"]) is double amount && amount > 0)
                            recipe.Inputs.Add(new Requirement(Reference.Item(item), amount));

                foreach (string other in Fields.Strings(level["otherRequirements"]))
                {
                    Match coins = CoinRequirement.Match(other);
                    if (coins.Success && double.TryParse(coins.Groups[1].Value.Replace(",", "").Replace(".", ""), out double amount) && amount > 0)
                        recipe.Inputs.Add(new Requirement(Reference.Item(ItemMapper.Coins), amount));
                    else
                    {
                        recipe.Unlock.Add(new RecipeUnlock("requirement", null, other));
                        _context.Warn("Requisito de nível da oficina em texto, enviado como desbloqueio", id + " " + number + ": " + other);
                    }
                }

                // requires: [{"outpostRooms": 2}] — salas construídas no posto avançado (2.0).
                if (level["requires"] is JsonArray conditions)
                    foreach (JsonObject condition in conditions.OfType<JsonObject>())
                        foreach (KeyValuePair<string, JsonNode> entry in condition)
                        {
                            if (entry.Key == "outpostRooms" && Fields.Int(entry.Value) is int rooms)
                                recipe.Unlock.Add(new RecipeUnlock("requirement", null, "Salas no posto avançado: " + rooms));
                            else
                            {
                                recipe.Unlock.Add(new RecipeUnlock("requirement", null, entry.Key + ": " + entry.Value?.ToJsonString()));
                                _context.Warn("Requisito de nível da oficina desconhecido, enviado como texto", id + " " + number + ": " + entry.Key);
                            }
                        }

                if (recipe.Inputs.Count == 0 && recipe.Unlock.Count == 0) continue;
                recipe.Outputs.Add(new RecipeOutput(Reference.Entity(id), 1, number));
                _context.Dataset.Add(recipe);
            }
        }
    }
}
