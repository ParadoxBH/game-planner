using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace GamePlanner.ArcRaiders.Source
{
    /// <summary>
    /// Os dados de uma página do arctracker no formato RSC (React Server Components) que o Next.js embute no HTML
    /// em self.__next_f.push([1, "..."]). É JSON, então dá para percorrer a página como árvore em vez de recortar
    /// HTML: cada elemento é ["$", tag, chave, props], e "$1a" aponta para a linha 1a.
    ///
    /// Serve para o que a API pública não tem (as ARCs). É leitura de página: se o site mudar o layout, os
    /// atributos data-arc-* em que o mapeador se apoia podem sumir, e aí ele avisa em vez de inventar.
    /// </summary>
    public sealed class RscPage
    {
        private static readonly Regex Push = new Regex(@"self\.__next_f\.push\(\[1,(""(?:[^""\\]|\\.)*"")\]\)", RegexOptions.Compiled);
        private static readonly Regex RowStart = new Regex(@"\G([0-9a-f]+):", RegexOptions.Compiled);
        /// <summary>
        /// "$1a" e "$L1a" (conteúdo que chegou depois, em streaming). "$L" também aponta para componente do cliente,
        /// mas esse vira linha "I[...]", que não é guardada — a referência fica sem resolver, como deve.
        /// </summary>
        private static readonly Regex Reference = new Regex(@"^\$L?([0-9a-f]+)$", RegexOptions.Compiled);

        private readonly Dictionary<string, JsonNode> _rows = new Dictionary<string, JsonNode>(StringComparer.Ordinal);

        private RscPage()
        {
        }

        public bool IsEmpty => _rows.Count == 0;

        public static RscPage Parse(string html)
        {
            var page = new RscPage();
            var text = new StringBuilder();
            foreach (Match match in Push.Matches(html))
                text.Append(JsonSerializer.Deserialize<string>(match.Groups[1].Value));
            page.ReadRows(text.ToString());
            return page;
        }

        /// <summary>
        /// Linhas "id:conteúdo". Conteúdo JSON vai até o fim da linha; "T{tamanho},{texto}" é texto com o tamanho
        /// em bytes UTF-8; o resto (I, HL: módulos e folhas de estilo) não interessa.
        /// </summary>
        private void ReadRows(string text)
        {
            int position = 0;
            while (position < text.Length)
            {
                Match row = RowStart.Match(text, position);
                if (!row.Success)
                {
                    int next = text.IndexOf('\n', position);
                    if (next < 0) break;
                    position = next + 1;
                    continue;
                }
                string id = row.Groups[1].Value;
                int start = row.Index + row.Length;
                if (start < text.Length && text[start] == 'T')
                {
                    int comma = text.IndexOf(',', start);
                    int bytes = Convert.ToInt32(text.Substring(start + 1, comma - start - 1), 16);
                    int end = comma + 1;
                    for (int counted = 0; end < text.Length && counted < bytes;)
                    {
                        int width = char.IsHighSurrogate(text[end]) && end + 1 < text.Length ? 2 : 1;
                        counted += Encoding.UTF8.GetByteCount(text.AsSpan(end, width));
                        end += width;
                    }
                    _rows[id] = JsonValue.Create(text.Substring(comma + 1, end - comma - 1));
                    position = end;
                    continue;
                }
                int lineEnd = text.IndexOf('\n', start);
                if (lineEnd < 0) lineEnd = text.Length;
                string payload = text.Substring(start, lineEnd - start);
                if (payload.Length > 0 && (payload[0] == '[' || payload[0] == '{'))
                {
                    try
                    {
                        _rows[id] = JsonNode.Parse(payload);
                    }
                    catch (JsonException)
                    {
                        // Linha que não é JSON puro (formatos internos do React): não tem dado de ARC.
                    }
                }
                position = lineEnd + 1;
            }
        }

        // ------------------------------------------------------------------ elementos

        public static bool IsElement(JsonNode node, out string tag, out JsonObject props)
        {
            if (node is JsonArray array && array.Count == 4 && array[0] is JsonValue marker
                && marker.TryGetValue(out string dollar) && dollar == "$" && array[3] is JsonObject properties)
            {
                tag = array[1] is JsonValue value && value.TryGetValue(out string name) ? name : "";
                props = properties;
                return true;
            }
            tag = null;
            props = null;
            return false;
        }

        /// <summary>"$1a" e "$L1a" viram a linha 1a; o resto fica como está.</summary>
        private JsonNode Resolve(JsonNode node)
        {
            for (int hops = 0; hops < 8; hops++)
            {
                if (node is not JsonValue value || !value.TryGetValue(out string text)) return node;
                Match reference = Reference.Match(text);
                if (!reference.Success || !_rows.TryGetValue(reference.Groups[1].Value, out JsonNode row)) return node;
                node = row;
            }
            return node;
        }

        /// <summary>Todos os elementos da página, em profundidade, olhando todas as props (não só children).</summary>
        public IEnumerable<JsonArray> Elements() => Elements(new JsonArray(_rows.Values.Select(row => row?.DeepClone()).ToArray()));

        /// <summary>Os elementos dentro de um nó, ele incluído se for elemento.</summary>
        public IEnumerable<JsonArray> Elements(JsonNode root)
        {
            var stack = new Stack<(JsonNode Node, int Depth)>();
            stack.Push((root, 0));
            while (stack.Count > 0)
            {
                (JsonNode current, int depth) = stack.Pop();
                if (depth > 200) continue;
                JsonNode node = Resolve(current);
                var children = new List<JsonNode>();
                if (IsElement(node, out _, out JsonObject props))
                {
                    yield return (JsonArray)node;
                    children.AddRange(props.Select(entry => entry.Value));
                }
                else if (node is JsonArray array) children.AddRange(array);
                else if (node is JsonObject map) children.AddRange(map.Select(entry => entry.Value));
                for (int i = children.Count - 1; i >= 0; i--)
                    if (children[i] != null) stack.Push((children[i], depth + 1));
            }
        }

        /// <summary>Texto visível de um nó: as strings dos children, em ordem. "$undefined" e referências não entram.</summary>
        public string Text(JsonNode node) => string.Concat(TextParts(node));

        public IEnumerable<string> TextParts(JsonNode node)
        {
            node = Resolve(node);
            if (IsElement(node, out _, out JsonObject props))
            {
                foreach (string part in TextParts(props["children"])) yield return part;
            }
            else if (node is JsonArray array)
            {
                foreach (JsonNode child in array)
                    foreach (string part in TextParts(child)) yield return part;
            }
            else if (node is JsonValue value)
            {
                if (value.TryGetValue(out string text))
                {
                    if (!text.StartsWith("$", StringComparison.Ordinal)) yield return text;
                }
                else if (value.GetValueKind() == JsonValueKind.Number) yield return value.ToJsonString();
            }
        }

        /// <summary>O primeiro objeto da página que tem a propriedade (ex.: o dicionário de textos com "attackKinds").</summary>
        public JsonObject ObjectWith(string property)
        {
            var stack = new Stack<JsonNode>(_rows.Values);
            while (stack.Count > 0)
            {
                JsonNode node = stack.Pop();
                if (node is JsonObject map)
                {
                    if (map.ContainsKey(property)) return map;
                    foreach (KeyValuePair<string, JsonNode> entry in map)
                        if (entry.Value != null) stack.Push(entry.Value);
                }
                else if (node is JsonArray array)
                    foreach (JsonNode child in array)
                        if (child != null) stack.Push(child);
            }
            return null;
        }

        public static string Prop(JsonObject props, string name) =>
            props?[name] is JsonValue value && value.TryGetValue(out string text) && !text.StartsWith("$", StringComparison.Ordinal) ? text : null;

        public static bool HasClass(JsonObject props, string className) =>
            Prop(props, "className")?.Split(' ').Contains(className) == true;
    }
}
