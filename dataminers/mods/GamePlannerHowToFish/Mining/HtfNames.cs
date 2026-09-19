using System;
using System.Globalization;
using System.Text;
using GamePlanner.Core.Text;
using UnityEngine.Localization;
using Object = UnityEngine.Object;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>Nomes, ids e textos do How to Fish já no formato da API.</summary>
    internal static class HtfNames
    {
        /// <summary>Nome do asset (prefab ou ScriptableObject) sem "(Clone)", já sanitizado para id.</summary>
        public static string Id(Object asset)
        {
            if (asset == null) return null;
            string name = asset.name;
            int clone = name.IndexOf("(Clone)", StringComparison.Ordinal);
            if (clone >= 0) name = name.Substring(0, clone);
            return ExtId.Sanitize(name.Trim());
        }

        /// <summary>Id com prefixo de tipo: "bait_" + "Worm" -> "bait_Worm".</summary>
        public static string Id(string prefix, Object asset)
        {
            string id = Id(asset);
            return id == null ? null : ExtId.Sanitize(prefix + id);
        }

        /// <summary>
        /// Texto no idioma atual do jogo (Unity Localization). Referência vazia, tabela sem a chave ou erro
        /// viram null, para o chamador cair no nome de reserva.
        /// </summary>
        public static string Text(LocalizedString value)
        {
            if (value == null || value.IsEmpty) return null;
            try
            {
                string text = RichText.Strip(value.GetLocalizedString());
                if (text == null || text.StartsWith("No translation found", StringComparison.OrdinalIgnoreCase)) return null;
                return text;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>"LemonSole" / "lemon_sole" -> "Lemon Sole". Último recurso de nome.</summary>
        public static string Humanize(string id)
        {
            if (string.IsNullOrEmpty(id)) return id;
            string[] words = ExtId.SnakeCase(id).Split(new[] { '_' }, StringSplitOptions.RemoveEmptyEntries);
            var sb = new StringBuilder(id.Length + 4);
            foreach (string word in words)
            {
                if (sb.Length > 0) sb.Append(' ');
                sb.Append(char.ToUpper(word[0], CultureInfo.InvariantCulture)).Append(word, 1, word.Length - 1);
            }
            return sb.ToString();
        }

        /// <summary>Primeiro texto não vazio.</summary>
        public static string First(params string[] values)
        {
            foreach (string value in values)
                if (!string.IsNullOrWhiteSpace(value)) return value.Trim();
            return null;
        }
    }
}
