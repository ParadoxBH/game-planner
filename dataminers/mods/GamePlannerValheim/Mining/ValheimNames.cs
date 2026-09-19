using System.Text.RegularExpressions;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>Nomes, ids e textos do Valheim já no formato da API.</summary>
    internal static class ValheimNames
    {
        /// <summary>Nome do prefab sem "(Clone)", como o jogo usa em ObjectDB e ZNetScene. Já sanitizado para id.</summary>
        public static string PrefabId(GameObject prefab)
        {
            if (prefab == null) return null;
            return PrefabId(prefab.name);
        }

        public static string PrefabId(Component component) => component == null ? null : PrefabId(component.gameObject);

        /// <summary>Instância dentro de prefab (local, sala) vem como "Spawner_Draugr (3)": o sufixo sai.</summary>
        private static readonly Regex InstanceSuffix = new Regex(@"\s*\(\d+\)$", RegexOptions.Compiled);

        public static string PrefabId(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;
            int clone = name.IndexOf("(Clone)", System.StringComparison.Ordinal);
            if (clone >= 0) name = name.Substring(0, clone);
            return ExtId.Sanitize(InstanceSuffix.Replace(name.Trim(), ""));
        }

        /// <summary>"Spawner_GreydwarfNest" -> "Spawner GreydwarfNest". Último recurso de nome.</summary>
        public static string Humanize(string id) => id?.Replace('_', ' ');

        /// <summary>Traduz "$item_x" pelo idioma atual do jogo. Chave sem tradução vira null.</summary>
        public static string Localize(string token)
        {
            if (string.IsNullOrEmpty(token)) return null;
            string text = Localization.instance != null ? Localization.instance.Localize(token) : token;
            return RichText.StripUntranslated(text);
        }

        /// <summary>Nome traduzido ou, sem tradução, o nome do prefab mais legível ("Pickable_Carrot" -> "Pickable Carrot").</summary>
        public static string DisplayName(string token, string prefabId)
        {
            return Localize(token) ?? (prefabId == null ? null : prefabId.Replace('_', ' '));
        }
    }
}
