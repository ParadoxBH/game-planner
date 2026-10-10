using System.Text.Json.Nodes;

namespace GamePlanner.ArcRaiders.Source
{
    /// <summary>
    /// Os textos do repositório vêm em 20 idiomas, num objeto pelo código do idioma. O site é em português:
    /// vale o pt-BR, depois o pt de Portugal e, por último, o inglês.
    /// </summary>
    public static class Localized
    {
        private static readonly string[] Languages = { "pt-BR", "pt", "en" };

        /// <summary>Texto de um campo que pode ser objeto por idioma ou texto simples. Vazio vira null.</summary>
        public static string Text(JsonNode node)
        {
            if (node is JsonValue value && value.TryGetValue(out string plain)) return Clean(plain);
            if (node is JsonObject byLanguage)
            {
                foreach (string language in Languages)
                {
                    if (byLanguage[language] is JsonValue translated && translated.TryGetValue(out string text))
                    {
                        string cleaned = Clean(text);
                        if (cleaned != null) return cleaned;
                    }
                }
            }
            return null;
        }

        /// <summary>O texto em inglês, que é o que os campos de tipo e local usam como chave.</summary>
        public static string English(JsonNode node)
        {
            if (node is JsonValue value && value.TryGetValue(out string plain)) return Clean(plain);
            return node is JsonObject byLanguage && byLanguage["en"] is JsonValue en && en.TryGetValue(out string text)
                ? Clean(text)
                : null;
        }

        private static string Clean(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            return text.Replace("\r\n", "\n").Trim();
        }
    }
}
