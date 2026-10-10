using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>Leitura tolerante dos campos do repositório, que mudam de forma entre itens.</summary>
    public static class Fields
    {
        public static string String(JsonNode node) =>
            node is JsonValue value && value.TryGetValue(out string text) && !string.IsNullOrWhiteSpace(text) ? text.Trim() : null;

        public static double? Number(JsonNode node)
        {
            if (node is not JsonValue value) return null;
            if (value.GetValueKind() == JsonValueKind.Number) return value.GetValue<double>();
            return null;
        }

        public static int? Int(JsonNode node)
        {
            double? number = Number(node);
            return number.HasValue ? (int)number.Value : null;
        }

        public static bool Bool(JsonNode node) =>
            node is JsonValue value && value.GetValueKind() == JsonValueKind.True;

        /// <summary>Campo que vem como texto ou como lista de textos (craftBench).</summary>
        public static List<string> Strings(JsonNode node)
        {
            var result = new List<string>();
            if (String(node) is string single) result.Add(single);
            else if (node is JsonArray array)
                foreach (JsonNode entry in array)
                    if (String(entry) is string text && !result.Contains(text)) result.Add(text);
            return result;
        }

        /// <summary>Mapa id -> quantidade ({"metal_parts": 4}), na ordem do arquivo. Quantidade não positiva sai.</summary>
        public static List<KeyValuePair<string, double>> Amounts(JsonNode node)
        {
            var result = new List<KeyValuePair<string, double>>();
            if (node is not JsonObject map) return result;
            foreach (KeyValuePair<string, JsonNode> entry in map)
                if (Number(entry.Value) is double amount && amount > 0) result.Add(new KeyValuePair<string, double>(entry.Key, amount));
            return result;
        }

        /// <summary>"Assault Rifle" -> "assault_rifle", "Per-Shot" -> "per_shot". Só a-z, 0-9 e sublinhado.</summary>
        public static string Slug(string text)
        {
            if (string.IsNullOrEmpty(text)) return text;
            string plain = text.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(plain.Length);
            bool gap = false;
            foreach (char c in plain)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
                char lower = char.ToLowerInvariant(c);
                if ((lower >= 'a' && lower <= 'z') || (lower >= '0' && lower <= '9'))
                {
                    if (gap && sb.Length > 0) sb.Append('_');
                    sb.Append(lower);
                    gap = false;
                }
                else gap = true;
            }
            return sb.ToString();
        }

        /// <summary>"damageMitigation" -> "damage_mitigation".</summary>
        public static string CamelToSnake(string text)
        {
            var sb = new StringBuilder(text.Length + 8);
            foreach (char c in text)
            {
                if (char.IsUpper(c) && sb.Length > 0) sb.Append('_');
                sb.Append(char.ToLowerInvariant(c));
            }
            return Slug(sb.ToString());
        }
    }
}
