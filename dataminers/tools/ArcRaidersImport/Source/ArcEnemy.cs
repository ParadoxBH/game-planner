using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace GamePlanner.ArcRaiders.Source
{
    /// <summary>Uma ARC (os robôs inimigos), lida da página do arctracker ou, sem ela, do bots.json do clone.</summary>
    public sealed class ArcEnemy
    {
        /// <summary>Código no site ("firefly", "arc-surveyor").</summary>
        public string Slug;

        /// <summary>Id da entidade: arc_firefly, arc_surveyor — o mesmo formato do bots.json.</summary>
        public string Id;

        public string Name;
        public string Subtitle;
        public string Description;

        /// <summary>Classe que o site mostra no topo ("Voadores", "Terrestres").</summary>
        public string Class;

        public string ImageUrl;

        public string Toughness;
        public int? ToughnessLevel;
        public int? ToughnessLevels;

        public List<string> Plates = new List<string>();
        public List<string> Parts = new List<string>();
        public List<string> LootableParts = new List<string>();

        /// <summary>Ataque: chave estável (gun, flamethrower), rótulo em pt-BR e dano.</summary>
        public List<(string Key, string Label, double Damage)> Attacks = new List<(string, string, double)>();

        public double? DetectRange;
        public double? LoseRange;
        public double? FieldOfView;

        public int? SpawnTotal;

        /// <summary>Mapa e o resumo do site ("55 locais de aparição + 22 como escolta, Patrulha").</summary>
        public List<(string Map, string Detail)> Spawns = new List<(string, string)>();

        /// <summary>Ids dos itens que dropa.</summary>
        public List<string> Drops = new List<string>();

        public double? DestroyXp;
        public double? LootXp;

        public static string IdOf(string slug)
        {
            string id = slug.Replace('-', '_');
            return id.StartsWith("arc_", StringComparison.Ordinal) ? id : "arc_" + id;
        }
    }

    /// <summary>Leitura de /pt-BR/arc/{slug}: cada parte da página é uma section com um atributo data-arc-*.</summary>
    public static class ArcEnemyPage
    {
        private static readonly Regex FirstNumber = new Regex(@"-?\d+(?:[.,]\d+)?", RegexOptions.Compiled);
        private static readonly Regex OfTotal = new Regex(@"(\d+)\D+(\d+)", RegexOptions.Compiled);

        /// <summary>Slugs das ARCs na listagem /pt-BR/arc.</summary>
        public static List<string> Slugs(string html) =>
            Regex.Matches(html, @"/pt-BR/arc/([a-z0-9-]+)").Select(match => match.Groups[1].Value)
                .Distinct(StringComparer.Ordinal).OrderBy(slug => slug, StringComparer.Ordinal).ToList();

        /// <summary>Null se a página não tem a estrutura esperada (sem título ou sem nenhuma seção data-arc-*).</summary>
        public static ArcEnemy Read(string slug, string html, Action<string, string> warn)
        {
            RscPage page = RscPage.Parse(html);
            if (page.IsEmpty) return null;
            List<JsonArray> elements = page.Elements().ToList();

            var arc = new ArcEnemy { Slug = slug, Id = ArcEnemy.IdOf(slug) };
            JsonArray title = elements.FirstOrDefault(element => Has(element, "arc-page-title"));
            if (title == null) return null;
            arc.Name = Clean(page.Text(title));
            arc.Subtitle = Clean(elements.Where(element => Has(element, "arc-page-sub")).Select(page.Text).FirstOrDefault());
            JsonArray actions = elements.FirstOrDefault(element => Has(element, "arc-page-actions"));
            if (actions != null)
                arc.Class = Clean(page.Elements(actions).Where(element => Has(element, "arc-pill")).Select(page.Text).FirstOrDefault());
            arc.ImageUrl = elements.Select(element => Props(element, "src"))
                .FirstOrDefault(src => src != null && src.Contains("/arcs/", StringComparison.Ordinal));

            Dictionary<string, JsonArray> sections = Sections(elements);
            if (sections.Count == 0) return null;
            JsonObject texts = page.ObjectWith("attackKinds");
            Dictionary<string, string> mapNames = MapNames(elements, page);

            if (sections.TryGetValue("about", out JsonArray about))
                arc.Description = Clean(string.Join("\n\n", page.Elements(about).Where(element => Tag(element) == "p")
                    .Select(page.Text).Select(Clean).Where(text => text != null)));

            if (sections.TryGetValue("spawns", out JsonArray spawns)) ReadSpawns(page, spawns, mapNames, arc);
            if (sections.TryGetValue("drops", out JsonArray drops)) ReadDrops(page, drops, arc);
            if (sections.TryGetValue("toughness", out JsonArray toughness)) ReadToughness(page, toughness, arc);
            if (sections.TryGetValue("armor", out JsonArray armor)) ReadArmor(page, armor, texts, arc);
            if (sections.TryGetValue("attacks", out JsonArray attacks)) ReadAttacks(page, attacks, texts, arc, warn);
            if (sections.TryGetValue("perception", out JsonArray perception)) ReadPerception(page, perception, texts, arc);
            return arc;
        }

        private static Dictionary<string, JsonArray> Sections(IEnumerable<JsonArray> elements)
        {
            var sections = new Dictionary<string, JsonArray>(StringComparer.Ordinal);
            foreach (JsonArray element in elements)
            {
                if (!RscPage.IsElement(element, out string tag, out JsonObject props) || tag != "section") continue;
                foreach (KeyValuePair<string, JsonNode> entry in props)
                    if (entry.Key.StartsWith("data-arc-", StringComparison.Ordinal) && entry.Value is JsonValue on && on.TryGetValue(out bool flag) && flag)
                        sections.TryAdd(entry.Key.Substring("data-arc-".Length), element);
            }
            return sections;
        }

        /// <summary>Nome do mapa pelo link (/pt-BR/maps/blue-gate -> "Portão Azul").</summary>
        private static Dictionary<string, string> MapNames(IEnumerable<JsonArray> elements, RscPage page)
        {
            var names = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (JsonArray element in elements)
            {
                string href = Props(element, "href");
                if (href == null || !href.StartsWith("/pt-BR/maps/", StringComparison.Ordinal)) continue;
                string slug = href.Substring("/pt-BR/maps/".Length).Split('?', '#')[0];
                string name = Clean(page.Text(element));
                if (slug.Length > 0 && name != null) names.TryAdd(slug, name);
            }
            return names;
        }

        private static void ReadSpawns(RscPage page, JsonArray section, Dictionary<string, string> mapNames, ArcEnemy arc)
        {
            arc.SpawnTotal = page.TextParts(section).Select(text => FirstNumber.Match(text))
                .Where(match => match.Success).Select(match => (int?)int.Parse(match.Value, CultureInfo.InvariantCulture)).FirstOrDefault();
            foreach (JsonArray item in page.Elements(section).Where(element => Tag(element) == "li"))
            {
                string map = Props(item, "data-map");
                if (map == null) continue;
                string name = mapNames.GetValueOrDefault(map) ?? map;
                // O nome do mapa vem como link dentro do próprio item; ele já é a chave da linha.
                List<string> parts = page.TextParts(item).Select(Clean).Where(text => text != null && text != name).ToList();
                if (parts.Count == 0) continue;
                // "55 locais de aparição" + " + 22 como escolta" formam a contagem; o resto são etiquetas.
                string count = parts[0] + string.Concat(parts.Skip(1).TakeWhile(text => text.StartsWith("+", StringComparison.Ordinal)).Select(text => " " + text));
                IEnumerable<string> tags = parts.Skip(1).SkipWhile(text => text.StartsWith("+", StringComparison.Ordinal));
                arc.Spawns.Add((name, string.Join(", ", new[] { count }.Concat(tags))));
            }
        }

        private static void ReadDrops(RscPage page, JsonArray section, ArcEnemy arc)
        {
            foreach (JsonArray element in page.Elements(section))
            {
                RscPage.IsElement(element, out _, out JsonObject props);
                if (props["item"] is JsonObject item && item["id"] is JsonValue id && id.TryGetValue(out string itemId)
                    && !arc.Drops.Contains(itemId))
                    arc.Drops.Add(itemId);
                else if (props.ContainsKey("data-tone") && Clean(page.Text(element)) is string part && !arc.LootableParts.Contains(part))
                    arc.LootableParts.Add(part);
            }
        }

        private static void ReadToughness(RscPage page, JsonArray section, ArcEnemy arc)
        {
            arc.Toughness = Clean(page.Elements(section).Where(element => Tag(element) == "b").Select(page.Text).FirstOrDefault());
            string scale = page.Elements(section).Select(element => Props(element, "aria-label")).FirstOrDefault(label => label != null);
            Match level = scale == null ? Match.Empty : OfTotal.Match(scale);
            if (level.Success)
            {
                arc.ToughnessLevel = int.Parse(level.Groups[1].Value, CultureInfo.InvariantCulture);
                arc.ToughnessLevels = int.Parse(level.Groups[2].Value, CultureInfo.InvariantCulture);
            }
        }

        /// <summary>Etiquetas abaixo de cada h3: as placas de armadura primeiro, depois as partes destrutíveis.</summary>
        private static void ReadArmor(RscPage page, JsonArray section, JsonObject texts, ArcEnemy arc)
        {
            string platesTitle = Text(texts, "plates");
            List<string> current = null;
            foreach (JsonArray element in page.Elements(section))
            {
                RscPage.IsElement(element, out string tag, out JsonObject props);
                if (tag == "h3")
                {
                    string title = Clean(page.Text(element));
                    current = title == platesTitle || (platesTitle == null && arc.Plates.Count == 0 && current == null) ? arc.Plates : arc.Parts;
                }
                else if (current != null && props.ContainsKey("data-tone") && Clean(page.Text(element)) is string label && !current.Contains(label))
                    current.Add(label);
            }
        }

        /// <summary>Pares dt/dd: o rótulo do ataque e o dano. A chave sai do dicionário attackKinds da página.</summary>
        private static void ReadAttacks(RscPage page, JsonArray section, JsonObject texts, ArcEnemy arc, Action<string, string> warn)
        {
            JsonObject kinds = texts?["attackKinds"] as JsonObject;
            foreach ((string label, string value) in Pairs(page, section))
            {
                Match number = FirstNumber.Match(value);
                if (!number.Success)
                {
                    warn("Ataque de ARC sem dano numérico, ignorado", arc.Slug + ": " + label + " = " + value);
                    continue;
                }
                string kind = kinds?.FirstOrDefault(entry => entry.Value is JsonValue text && text.TryGetValue(out string name) && name == label).Key;
                string key = kind != null ? Mapping.Fields.CamelToSnake(kind) : Mapping.Fields.Slug(label);
                if (arc.Attacks.Any(attack => attack.Key == key)) key += "_" + (arc.Attacks.Count + 1);
                arc.Attacks.Add((key, label, ParseNumber(number.Value)));
            }
        }

        private static void ReadPerception(RscPage page, JsonArray section, JsonObject texts, ArcEnemy arc)
        {
            foreach ((string label, string value) in Pairs(page, section))
            {
                Match number = FirstNumber.Match(value);
                if (!number.Success) continue;
                double parsed = ParseNumber(number.Value);
                if (label == Text(texts, "sightFrom")) arc.DetectRange = parsed;
                else if (label == Text(texts, "sightLoses")) arc.LoseRange = parsed;
                else if (label == Text(texts, "fieldOfView")) arc.FieldOfView = parsed;
            }
            if (arc.FieldOfView == null)
            {
                string picture = page.Elements(section).Select(element => Props(element, "aria-label")).FirstOrDefault(label => label != null);
                Match degrees = picture == null ? Match.Empty : FirstNumber.Match(picture);
                if (degrees.Success) arc.FieldOfView = ParseNumber(degrees.Value);
            }
        }

        private static IEnumerable<(string Label, string Value)> Pairs(RscPage page, JsonArray section)
        {
            string label = null;
            foreach (JsonArray element in page.Elements(section))
            {
                string tag = Tag(element);
                if (tag == "dt") label = Clean(page.Text(element));
                else if (tag == "dd" && label != null)
                {
                    yield return (label, Clean(page.Text(element)) ?? "");
                    label = null;
                }
            }
        }

        // ------------------------------------------------------------------ utilitários

        private static string Tag(JsonArray element) => RscPage.IsElement(element, out string tag, out _) ? tag : null;

        private static bool Has(JsonArray element, string className) =>
            RscPage.IsElement(element, out _, out JsonObject props) && RscPage.HasClass(props, className);

        private static string Props(JsonArray element, string name) =>
            RscPage.IsElement(element, out _, out JsonObject props) ? RscPage.Prop(props, name) : null;

        private static string Text(JsonObject texts, string key) =>
            texts?[key] is JsonValue value && value.TryGetValue(out string text) ? text : null;

        private static double ParseNumber(string text) => double.Parse(text.Replace(',', '.'), CultureInfo.InvariantCulture);

        private static string Clean(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            return Regex.Replace(text.Trim(), @"[ \t]+", " ");
        }
    }
}
