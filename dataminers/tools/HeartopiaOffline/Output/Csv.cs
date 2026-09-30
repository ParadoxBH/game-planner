using System.Collections.Generic;
using System.IO;
using System.Text;

namespace GamePlanner.HeartopiaOffline.Output
{
    /// <summary>
    /// CSV com ";" e UTF-8 com BOM: é o que o Excel em pt-BR abre direto, em colunas e com acento e CJK certos.
    /// </summary>
    public static class Csv
    {
        private const char Separator = ';';

        public static void Write(string path, IEnumerable<string> header, IEnumerable<IEnumerable<object>> rows)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            using var writer = new StreamWriter(path, false, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
            WriteLine(writer, header);
            foreach (IEnumerable<object> row in rows) WriteLine(writer, row);
        }

        private static void WriteLine(TextWriter writer, IEnumerable<object> values)
        {
            bool first = true;
            foreach (object value in values)
            {
                if (!first) writer.Write(Separator);
                first = false;
                writer.Write(Escape(value?.ToString()));
            }
            writer.Write("\r\n");
        }

        private static string Escape(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.IndexOfAny(new[] { Separator, '"', '\n', '\r' }) < 0) return value;
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }
    }
}
