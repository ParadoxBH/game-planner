using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace GamePlanner.Core.Json
{
    /// <summary>
    /// Leitor de JSON mínimo: objeto vira Dictionary&lt;string, object&gt;, array vira List&lt;object&gt;,
    /// número vira double. Basta para as respostas da API (tokens, erros, mídia, contagens).
    /// </summary>
    public static class JsonReader
    {
        public static object Parse(string json)
        {
            if (string.IsNullOrEmpty(json)) return null;
            int index = 0;
            object value = ReadValue(json, ref index);
            SkipWhitespace(json, ref index);
            if (index != json.Length) throw new FormatException("JSON com conteúdo depois do fim, posição " + index);
            return value;
        }

        public static Dictionary<string, object> ParseObject(string json) => Parse(json) as Dictionary<string, object>;

        // Acesso tolerante: caminho ausente ou de outro tipo devolve o padrão.
        public static string GetString(this Dictionary<string, object> obj, string key) =>
            obj != null && obj.TryGetValue(key, out object value) ? value as string : null;

        public static bool GetBool(this Dictionary<string, object> obj, string key) =>
            obj != null && obj.TryGetValue(key, out object value) && value is bool b && b;

        public static int? GetInt(this Dictionary<string, object> obj, string key) =>
            obj != null && obj.TryGetValue(key, out object value) && value is double d ? (int?)(int)d : null;

        public static Dictionary<string, object> GetObject(this Dictionary<string, object> obj, string key) =>
            obj != null && obj.TryGetValue(key, out object value) ? value as Dictionary<string, object> : null;

        public static List<object> GetArray(this Dictionary<string, object> obj, string key) =>
            obj != null && obj.TryGetValue(key, out object value) ? value as List<object> : null;

        private static object ReadValue(string s, ref int i)
        {
            SkipWhitespace(s, ref i);
            if (i >= s.Length) throw new FormatException("JSON terminou antes da hora");
            char c = s[i];
            if (c == '{') return ReadObject(s, ref i);
            if (c == '[') return ReadArray(s, ref i);
            if (c == '"') return ReadString(s, ref i);
            if (Literal(s, ref i, "true")) return true;
            if (Literal(s, ref i, "false")) return false;
            if (Literal(s, ref i, "null")) return null;
            return ReadNumber(s, ref i);
        }

        private static Dictionary<string, object> ReadObject(string s, ref int i)
        {
            var result = new Dictionary<string, object>();
            i++;
            SkipWhitespace(s, ref i);
            if (i < s.Length && s[i] == '}') { i++; return result; }
            while (true)
            {
                SkipWhitespace(s, ref i);
                string key = ReadString(s, ref i);
                SkipWhitespace(s, ref i);
                Expect(s, ref i, ':');
                result[key] = ReadValue(s, ref i);
                SkipWhitespace(s, ref i);
                if (i < s.Length && s[i] == ',') { i++; continue; }
                Expect(s, ref i, '}');
                return result;
            }
        }

        private static List<object> ReadArray(string s, ref int i)
        {
            var result = new List<object>();
            i++;
            SkipWhitespace(s, ref i);
            if (i < s.Length && s[i] == ']') { i++; return result; }
            while (true)
            {
                result.Add(ReadValue(s, ref i));
                SkipWhitespace(s, ref i);
                if (i < s.Length && s[i] == ',') { i++; continue; }
                Expect(s, ref i, ']');
                return result;
            }
        }

        private static string ReadString(string s, ref int i)
        {
            Expect(s, ref i, '"');
            var sb = new StringBuilder();
            while (i < s.Length)
            {
                char c = s[i++];
                if (c == '"') return sb.ToString();
                if (c != '\\') { sb.Append(c); continue; }
                if (i >= s.Length) break;
                char e = s[i++];
                switch (e)
                {
                    case 'n': sb.Append('\n'); break;
                    case 'r': sb.Append('\r'); break;
                    case 't': sb.Append('\t'); break;
                    case 'b': sb.Append('\b'); break;
                    case 'f': sb.Append('\f'); break;
                    case 'u':
                        sb.Append((char)int.Parse(s.Substring(i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                        i += 4;
                        break;
                    default: sb.Append(e); break;
                }
            }
            throw new FormatException("Texto JSON sem aspas de fechamento");
        }

        private static double ReadNumber(string s, ref int i)
        {
            int start = i;
            while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
            if (start == i) throw new FormatException("Valor JSON inesperado na posição " + start);
            return double.Parse(s.Substring(start, i - start), NumberStyles.Float, CultureInfo.InvariantCulture);
        }

        private static bool Literal(string s, ref int i, string word)
        {
            if (string.CompareOrdinal(s, i, word, 0, word.Length) != 0) return false;
            i += word.Length;
            return true;
        }

        private static void Expect(string s, ref int i, char c)
        {
            if (i >= s.Length || s[i] != c) throw new FormatException("Esperava '" + c + "' na posição " + i);
            i++;
        }

        private static void SkipWhitespace(string s, ref int i)
        {
            while (i < s.Length && char.IsWhiteSpace(s[i])) i++;
        }
    }
}
