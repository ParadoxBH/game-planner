using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using GamePlanner.ArcRaiders.Source;
using GamePlanner.Core.Model;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>
    /// Itens: nome, descrição, raridade, valor de venda (em moedas), categorias, atributos e ícone. Receita,
    /// reciclagem, melhoria e venda ficam com os outros mapeadores, que leem os mesmos arquivos.
    /// </summary>
    public sealed class ItemMapper
    {
        public const string Coins = "coins";
        public const string Creds = "creds";
        public const string ResearchPoints = "research_points";

        private const string General = "Geral";
        private const string Weapon = "Arma";
        private const string Protection = "Proteção";
        private const string Effects = "Efeitos";
        private const string Other = "Outros";

        /// <summary>Campos numéricos do item que viram atributo, com rótulo e unidade.</summary>
        private static readonly (string Field, string Key, string Label, string Group, string Unit)[] NumberFields =
        {
            ("weightKg", "weight_kg", "Peso", General, "kg"),
            ("stackSize", "stack_size", "Pilha", General, null),
            ("damage", "damage", "Dano", Weapon, null),
            ("fireRate", "fire_rate", "Cadência", Weapon, null),
            ("range", "range", "Alcance", Weapon, null),
            ("stability", "stability", "Estabilidade", Weapon, null),
            ("agility", "agility", "Agilidade", Weapon, null),
            ("stealth", "stealth", "Furtividade", Weapon, null),
            ("increasedFireRate", "increased_fire_rate", "Cadência aumentada", Weapon, null),
            ("reducedReloadTime", "reduced_reload_time", "Recarga mais rápida", Weapon, null),
            ("reducedDurabilityBurnRate", "reduced_durability_burn_rate", "Desgaste reduzido", Weapon, null),
            ("durability", "durability", "Durabilidade", Protection, null),
            ("damageMitigation", "damage_mitigation", "Mitigação de dano", Protection, "%"),
            ("shieldCharge", "shield_charge", "Carga do escudo", Protection, null),
            ("movementSpeedModifier", "movement_speed_modifier", "Velocidade de movimento", Protection, "%"),
        };

        /// <summary>
        /// Campos lidos em outro lugar ou deixados de fora de propósito (modSlots, reparo, dica em inglês). Campo
        /// fora desta lista e de NumberFields é novidade do repositório: número vira atributo, o resto vira aviso.
        /// </summary>
        private static readonly HashSet<string> KnownFields = new HashSet<string>(StringComparer.Ordinal)
        {
            "id", "name", "description", "type", "rarity", "value", "updatedAt", "addedIn", "imageFilename", "effects",
            "foundIn", "compatibleWith", "questItem", "isWeapon", "recipe", "craftBench", "stationLevelRequired",
            "craftQuantity", "craftSkills", "blueprintLocked", "recyclesInto", "salvagesInto", "upgradeCost", "upgradesTo",
            "vendors", "repairCost", "repairDurability", "repairMaterials", "modSlots", "tip", "_note",
            "upgrades", "research", "researchPoints", "mechanics", "phasedOut", "_community",
        };

        private readonly ArcContext _context;
        private readonly ArcCatalog _catalog;
        private int _otherOrdinal;

        public ItemMapper(ArcContext context, ArcCatalog catalog)
        {
            _context = context;
            _catalog = catalog;
        }

        public void DefineAttributes()
        {
            for (int i = 0; i < NumberFields.Length; i++)
            {
                var (_, key, label, group, unit) = NumberFields[i];
                _context.Dataset.Define(new AttributeDefinitionDoc(key, label, group, i, unit));
            }
            Define("found_in", _context.Source.UiText("ItemDetailPage", "foundIn") ?? "Pode ser encontrado em", General,
                AttributeDefinitionDoc.Text);
            Define("compatible_with", "Compatível com", General, AttributeDefinitionDoc.Text);
            Define("quest_item", "Item de missão", General, AttributeDefinitionDoc.Boolean);
        }

        private void Define(string key, string label, string group, string dataType)
        {
            int ordinal = _context.Dataset.AttributeDefinitions.Count(definition => definition.Group == group);
            _context.Dataset.Define(new AttributeDefinitionDoc(key, label, group, ordinal) { DataType = dataType });
        }

        public void AddItems()
        {
            foreach (JsonObject item in _context.Source.Items)
            {
                ItemDoc doc = Map(item);
                if (doc != null) _context.Dataset.Add(doc);
            }
        }

        /// <summary>
        /// Moedas dos preços, das lojas e da Estação de Pesquisa: os dados citam coins, creds e pontos de pesquisa,
        /// mas não têm item para eles.
        /// </summary>
        public void AddCurrencies()
        {
            List<string> categories = _catalog.CurrencyCategories();
            foreach ((string id, string name) in new[]
                     {
                         (Coins, _context.Source.UiText("TraderPage", "coins") ?? "Moedas"),
                         (Creds, _context.Source.UiText("StashPage.currencies", "cred") ?? "Cred"),
                         (ResearchPoints, "Pontos de pesquisa"),
                     })
            {
                if (_context.Source.ItemsById.ContainsKey(id)) continue;
                _context.Dataset.Add(new ItemDoc
                {
                    ExtId = id,
                    Name = name,
                    Summary = "Moeda do jogo",
                    Categories = new List<string>(categories),
                });
            }
        }

        private ItemDoc Map(JsonObject item)
        {
            string id = Fields.String(item["id"]);
            if (id == null)
            {
                _context.Warn("Item sem id ignorado");
                return null;
            }

            string type = Fields.String(item["type"]);
            var doc = new ItemDoc
            {
                ExtId = id,
                Name = Localized.Text(item["name"]) ?? id,
                Description = Localized.Text(item["description"]),
                RarityCode = _catalog.Rarity(Fields.String(item["rarity"])),
                Categories = _catalog.ItemCategories(type, Fields.Bool(item["isWeapon"])),
            };

            if (Fields.Number(item["value"]) is double value)
            {
                doc.BaseSellPrice = value;
                doc.Currency = Reference.Item(Coins);
            }

            AddAttributes(item, doc);
            AddImage(id, ImageName(item), doc);
            return doc;
        }

        private void AddAttributes(JsonObject item, ItemDoc doc)
        {
            foreach (var (field, key, _, _, _) in NumberFields)
                if (Fields.Number(item[field]) is double number) doc.Attributes[key] = number;

            string foundIn = FoundIn(Fields.String(item["foundIn"]));
            if (foundIn != null) doc.Attributes["found_in"] = foundIn;

            List<string> compatible = Fields.Strings(item["compatibleWith"]);
            if (compatible.Count > 0) doc.Attributes["compatible_with"] = string.Join(", ", compatible);

            if (Fields.Bool(item["questItem"])) doc.Attributes["quest_item"] = true;

            if (item["effects"] is JsonObject effects) AddEffects(effects, doc);

            foreach (KeyValuePair<string, JsonNode> field in item)
            {
                if (KnownFields.Contains(field.Key) || NumberFields.Any(known => known.Field == field.Key)) continue;
                if (Fields.Number(field.Value) is double extra)
                {
                    string key = Fields.CamelToSnake(field.Key);
                    _context.Dataset.Define(new AttributeDefinitionDoc(key, Humanize(field.Key), Other, _otherOrdinal++));
                    doc.Attributes[key] = extra;
                    _context.Warn("Campo numérico sem rótulo em português, enviado com o nome do campo", field.Key);
                }
                else if (field.Value != null)
                {
                    _context.Warn("Campo do repositório não mapeado, ignorado", field.Key);
                }
            }
        }

        /// <summary>
        /// Efeitos ("Duration": {value: "10s", pt-BR: "Duração", ...}) viram atributos effect_*, com o rótulo do
        /// próprio efeito. O tipo de cada chave é acertado no fim, em <see cref="NormalizeEffectTypes"/>.
        /// </summary>
        private void AddEffects(JsonObject effects, ItemDoc doc)
        {
            foreach (KeyValuePair<string, JsonNode> effect in effects)
            {
                if (effect.Value is not JsonObject entry) continue;
                string key = "effect_" + Fields.Slug(Localized.English(entry["en"]) ?? effect.Key);
                object value = Fields.Number(entry["value"]) is double number ? number : Fields.String(entry["value"]);
                if (value == null) continue;

                if (_context.Dataset.AttributeDefinitions.All(definition => definition.Key != key))
                {
                    int ordinal = _context.Dataset.AttributeDefinitions.Count(definition => definition.Group == Effects);
                    _context.Dataset.Define(new AttributeDefinitionDoc(key, Localized.Text(entry) ?? effect.Key, Effects, ordinal));
                }
                doc.Attributes[key] = value;
            }
        }

        /// <summary>
        /// O mesmo efeito vem como número num item e como texto ("10s") em outro. Com definição, o servidor confere
        /// o tipo de cada valor; então a chave que tem algum texto passa a ser texto em todos os itens.
        /// </summary>
        public void NormalizeEffectTypes()
        {
            var textual = new HashSet<string>(_context.Dataset.Items
                .SelectMany(item => item.Attributes)
                .Where(attribute => attribute.Key.StartsWith("effect_", StringComparison.Ordinal) && attribute.Value is string)
                .Select(attribute => attribute.Key));

            foreach (ItemDoc item in _context.Dataset.Items)
                foreach (string key in item.Attributes.Keys.Where(textual.Contains).ToList())
                    if (item.Attributes[key] is double number)
                        item.Attributes[key] = number.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        /// <summary>"Residential, Commercial" -> "Residencial, Comercial".</summary>
        private string FoundIn(string english)
        {
            if (english == null) return null;
            IEnumerable<string> names = english.Split(',')
                .Select(part => part.Trim())
                .Where(part => part.Length > 0)
                .Select(part =>
                {
                    string name = _context.Source.UiText("Locations", part);
                    if (name == null) _context.Warn("Local sem tradução, ficou em inglês", part);
                    return name ?? part;
                });
            return string.Join(", ", names);
        }

        /// <summary>
        /// Nome do arquivo que o imageFilename aponta (".../items/v2/extended_barrel.png" -> "extended_barrel"): as
        /// variantes de um item costumam usar a imagem do item base.
        /// </summary>
        private static string ImageName(JsonObject item)
        {
            string url = Fields.String(item["imageFilename"]);
            if (url == null) return null;
            string file = url.Substring(url.LastIndexOf('/') + 1);
            return file.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? file.Substring(0, file.Length - 4) : null;
        }

        /// <summary>
        /// Só imagem que está no repositório. As que faltam lá existem apenas no CDN do arctracker, e a ferramenta
        /// não baixa de lá: fica o aviso, e a imagem pode ser enviada à mão no site.
        /// </summary>
        private void AddImage(string id, string imageName, ContentDoc doc)
        {
            string name = id;
            byte[] png = _context.Source.Image("items", id);
            if (png == null && imageName != null && imageName != id)
            {
                name = imageName;
                png = _context.Source.Image("items", imageName);
            }
            if (png == null)
            {
                _context.Warn("Item sem imagem em images/items", id);
                return;
            }
            string key = "items/" + name;
            _context.Dataset.Images[key] = png;
            doc.IconImage = key;
        }

        /// <summary>"reducedReloadTime" -> "Reduced reload time".</summary>
        private static string Humanize(string field)
        {
            string spaced = Fields.CamelToSnake(field).Replace('_', ' ');
            return spaced.Length == 0 ? field : char.ToUpperInvariant(spaced[0]) + spaced.Substring(1);
        }
    }
}
