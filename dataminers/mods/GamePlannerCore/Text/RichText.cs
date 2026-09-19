using System.Text.RegularExpressions;

namespace GamePlanner.Core.Text
{
    /// <summary>Texto de UI da Unity (TextMeshPro / uGUI) para texto puro.</summary>
    public static class RichText
    {
        private static readonly Regex Tags = new Regex("<[^<>]{1,64}>", RegexOptions.Compiled);
        private static readonly Regex Spaces = new Regex("[ \\t]{2,}", RegexOptions.Compiled);

        /// <summary>Tira &lt;color&gt;, &lt;b&gt;, &lt;size&gt;... e espaços repetidos. Vazio vira null.</summary>
        public static string Strip(string value)
        {
            if (string.IsNullOrEmpty(value)) return null;
            string text = Spaces.Replace(Tags.Replace(value, ""), " ").Trim();
            return text.Length == 0 ? null : text;
        }

        /// <summary>Texto que ainda é uma chave de tradução ("$item_x") é tratado como ausente.</summary>
        public static string StripUntranslated(string value)
        {
            string text = Strip(value);
            return text != null && text.StartsWith("$") && text.IndexOf(' ') < 0 ? null : text;
        }
    }
}
