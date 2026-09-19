using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace GamePlanner.Core.Json
{
    /// <summary>Documento que sabe se escrever em JSON.</summary>
    public interface IJsonWritable
    {
        void WriteJson(JsonWriter writer);
    }

    /// <summary>
    /// Escritor de JSON sem dependências. O JsonUtility da Unity não serve para a API: não escreve
    /// dicionário, null nem lista de objetos diferentes, e o Newtonsoft nem sempre vem com o jogo.
    /// </summary>
    public sealed class JsonWriter
    {
        private readonly StringBuilder _out = new StringBuilder();
        private readonly Stack<bool> _hasItems = new Stack<bool>();
        private bool _afterName;

        public JsonWriter BeginObject() { Separate(); _out.Append('{'); _hasItems.Push(false); return this; }
        public JsonWriter EndObject() { _hasItems.Pop(); _out.Append('}'); return this; }
        public JsonWriter BeginArray() { Separate(); _out.Append('['); _hasItems.Push(false); return this; }
        public JsonWriter EndArray() { _hasItems.Pop(); _out.Append(']'); return this; }

        public JsonWriter Name(string name)
        {
            Separate();
            WriteString(name);
            _out.Append(':');
            _afterName = true;
            return this;
        }

        public JsonWriter Null() { Separate(); _out.Append("null"); return this; }
        public JsonWriter Value(string value) { Separate(); if (value == null) _out.Append("null"); else WriteString(value); return this; }
        public JsonWriter Value(bool value) { Separate(); _out.Append(value ? "true" : "false"); return this; }
        public JsonWriter Value(int value) { Separate(); _out.Append(value.ToString(CultureInfo.InvariantCulture)); return this; }
        public JsonWriter Value(long value) { Separate(); _out.Append(value.ToString(CultureInfo.InvariantCulture)); return this; }
        public JsonWriter Value(double value) { Separate(); _out.Append(FormatNumber(value)); return this; }

        /// <summary>float passa por aqui com arredondamento: 0.1f não vira 0.100000001.</summary>
        public JsonWriter Value(float value) { Separate(); _out.Append(FormatNumber(Math.Round((double)value, 4))); return this; }

        public JsonWriter Value(IJsonWritable value)
        {
            if (value == null) return Null();
            value.WriteJson(this);
            return this;
        }

        /// <summary>string, bool, números, IJsonWritable, IDictionary com chave string e IEnumerable.</summary>
        public JsonWriter Any(object value)
        {
            switch (value)
            {
                case null: return Null();
                case string s: return Value(s);
                case bool b: return Value(b);
                case int i: return Value(i);
                case long l: return Value(l);
                case float f: return Value(f);
                case double d: return Value(d);
                case decimal m: Separate(); _out.Append(m.ToString(CultureInfo.InvariantCulture)); return this;
                case IJsonWritable w: return Value(w);
                case IDictionary dictionary:
                    BeginObject();
                    foreach (DictionaryEntry entry in dictionary)
                        Name(Convert.ToString(entry.Key, CultureInfo.InvariantCulture)).Any(entry.Value);
                    return EndObject();
                case IEnumerable list:
                    BeginArray();
                    foreach (object item in list) Any(item);
                    return EndArray();
                default:
                    throw new ArgumentException("Tipo sem conversão para JSON: " + value.GetType().FullName);
            }
        }

        // Atalhos para campo opcional: nulo ou vazio não é escrito.
        public JsonWriter Field(string name, string value) => value == null ? this : Name(name).Value(value);
        public JsonWriter Field(string name, int? value) => value.HasValue ? Name(name).Value(value.Value) : this;
        public JsonWriter Field(string name, double? value) => value.HasValue ? Name(name).Value(value.Value) : this;
        public JsonWriter Field(string name, bool? value) => value.HasValue ? Name(name).Value(value.Value) : this;
        public JsonWriter Field(string name, IJsonWritable value) => value == null ? this : Name(name).Value(value);

        public JsonWriter Field<T>(string name, ICollection<T> values)
        {
            if (values == null || values.Count == 0) return this;
            Name(name).BeginArray();
            foreach (T value in values) Any(value);
            return EndArray();
        }

        public JsonWriter Field(string name, IDictionary<string, object> values)
        {
            if (values == null || values.Count == 0) return this;
            Name(name).BeginObject();
            foreach (KeyValuePair<string, object> entry in values) Name(entry.Key).Any(entry.Value);
            return EndObject();
        }

        public override string ToString() => _out.ToString();

        public static string Serialize(object value) => new JsonWriter().Any(value).ToString();

        public static string FormatNumber(double value)
        {
            if (double.IsNaN(value) || double.IsInfinity(value))
                throw new ArgumentException("JSON não aceita NaN nem infinito");
            if (value == Math.Floor(value) && Math.Abs(value) < 1e15)
                return ((long)value).ToString(CultureInfo.InvariantCulture);
            return value.ToString("R", CultureInfo.InvariantCulture);
        }

        private void Separate()
        {
            if (_afterName) { _afterName = false; return; }
            if (_hasItems.Count == 0) return;
            if (_hasItems.Peek()) _out.Append(',');
            else { _hasItems.Pop(); _hasItems.Push(true); }
        }

        private void WriteString(string value)
        {
            _out.Append('"');
            foreach (char c in value)
            {
                switch (c)
                {
                    case '"': _out.Append("\\\""); break;
                    case '\\': _out.Append("\\\\"); break;
                    case '\n': _out.Append("\\n"); break;
                    case '\r': _out.Append("\\r"); break;
                    case '\t': _out.Append("\\t"); break;
                    default:
                        if (c < 0x20) _out.Append("\\u").Append(((int)c).ToString("x4"));
                        else _out.Append(c);
                        break;
                }
            }
            _out.Append('"');
        }
    }
}
