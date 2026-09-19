using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// O mundo do Valheim no modelo da API: um mapa procedural ("world"), cada bioma um local "biome_*" e
    /// cada ambiente (EnvSetup) um evento de clima "env_*". Também traduz chaves globais para texto.
    /// </summary>
    internal sealed class ValheimWorld
    {
        public const string MapId = "world";

        /// <summary>Ordem de progressão do jogo; None e All ficam de fora.</summary>
        public static readonly Heightmap.Biome[] Biomes =
        {
            Heightmap.Biome.Meadows, Heightmap.Biome.BlackForest, Heightmap.Biome.Swamp, Heightmap.Biome.Mountain,
            Heightmap.Biome.Plains, Heightmap.Biome.Ocean, Heightmap.Biome.Mistlands, Heightmap.Biome.AshLands,
            Heightmap.Biome.DeepNorth,
        };

        private readonly Dictionary<string, string> _bossByGlobalKey = new Dictionary<string, string>();

        /// <summary>Lê de ZNetScene quais criaturas ligam cada chave global ao morrer (defeated_eikthyr...).</summary>
        public ValheimWorld()
        {
            if (ZNetScene.instance == null) return;
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                Character character = prefab != null ? prefab.GetComponent<Character>() : null;
                if (character == null || string.IsNullOrEmpty(character.m_defeatSetGlobalKey)) continue;
                string id = ValheimNames.PrefabId(prefab);
                _bossByGlobalKey[character.m_defeatSetGlobalKey] = ValheimNames.DisplayName(character.m_name, id);
            }
        }

        public static IEnumerable<Heightmap.Biome> Split(Heightmap.Biome flags) => Biomes.Where(biome => (flags & biome) != 0);

        public static string BiomeId(Heightmap.Biome biome) => "biome_" + ExtId.SnakeCase(biome.ToString());

        public static string BiomeName(Heightmap.Biome biome) =>
            ValheimNames.Localize("$biome_" + biome.ToString().ToLowerInvariant()) ?? biome.ToString();

        public static string BiomeNames(Heightmap.Biome flags) => string.Join(", ", Split(flags).Select(BiomeName));

        /// <summary>Id do único bioma das flags, ou null quando são vários (ou nenhum).</summary>
        public static string SingleBiomeId(Heightmap.Biome flags)
        {
            List<Heightmap.Biome> biomes = Split(flags).ToList();
            return biomes.Count == 1 ? BiomeId(biomes[0]) : null;
        }

        public static string EnvironmentId(string environment) =>
            string.IsNullOrEmpty(environment) ? null : ExtId.Sanitize("env_" + ExtId.SnakeCase(environment));

        public static string EnvironmentName(string environment) => environment?.Replace('_', ' ');

        /// <summary>"defeated_eikthyr" -> "depois de derrotar Eikthyr".</summary>
        public string GlobalKeyText(string key)
        {
            if (string.IsNullOrEmpty(key)) return null;
            return _bossByGlobalKey.TryGetValue(key, out string boss) ? "depois de derrotar " + boss : "chave global " + key;
        }

        public static string Percent(float fraction) =>
            Mathf.RoundToInt(Mathf.Clamp01(fraction) * 100).ToString(CultureInfo.InvariantCulture) + "%";
    }

    /// <summary>
    /// Condições de surgimento em texto. Na API, events é "basta um ativo"; condições que precisam valer juntas
    /// (dia/noite, chave global, nível, altitude) não cabem ali e vão no resumo do ponto.
    /// </summary>
    internal sealed class SpawnConditions
    {
        private readonly List<string> _parts = new List<string>();
        private readonly ValheimWorld _world;

        public SpawnConditions(ValheimWorld world) => _world = world;

        public SpawnConditions Add(string text)
        {
            if (!string.IsNullOrEmpty(text)) _parts.Add(text);
            return this;
        }

        /// <summary>Nível 1 é a criatura sem estrela.</summary>
        public SpawnConditions Levels(int min, int max, float levelUpChancePercent = -1f)
        {
            min = Mathf.Max(1, min);
            max = Mathf.Max(min, max);
            string text = min == max ? "nível " + min : "nível " + min + "–" + max;
            if (max > 1) text += " (" + (min - 1) + "–" + (max - 1) + " estrelas)";
            if (levelUpChancePercent > 0 && max > min) text += ", " + Mathf.RoundToInt(levelUpChancePercent) + "% de chance por nível extra";
            return Add(text);
        }

        public SpawnConditions Time(bool day, bool night)
        {
            if (day && !night) return Add("só de dia");
            if (night && !day) return Add("só à noite");
            return this;
        }

        public SpawnConditions RequiredKey(string key) => Add(_world.GlobalKeyText(key));

        public SpawnConditions BlockingKey(string key) =>
            string.IsNullOrEmpty(key) ? this : Add("para de surgir " + _world.GlobalKeyText(key));

        public SpawnConditions Environments(IEnumerable<string> environments)
        {
            List<string> names = (environments ?? Enumerable.Empty<string>()).Where(env => !string.IsNullOrEmpty(env))
                .Select(ValheimWorld.EnvironmentName).ToList();
            return names.Count == 0 ? this : Add("clima: " + string.Join(", ", names));
        }

        public SpawnConditions BiomeArea(Heightmap.BiomeArea area)
        {
            if (area == Heightmap.BiomeArea.Edge) return Add("só na borda do bioma");
            if (area == Heightmap.BiomeArea.Median) return Add("só no interior do bioma");
            return this;
        }

        public SpawnConditions Altitude(float min, float max)
        {
            bool hasMin = min > -1000f;
            bool hasMax = max < 1000f;
            if (hasMin && hasMax) return Add("altitude " + Mathf.RoundToInt(min) + " a " + Mathf.RoundToInt(max));
            if (hasMin) return Add("altitude a partir de " + Mathf.RoundToInt(min));
            if (hasMax) return Add("altitude até " + Mathf.RoundToInt(max));
            return this;
        }

        public SpawnConditions Forest(bool inForest, bool outsideForest)
        {
            if (inForest && !outsideForest) return Add("só em floresta");
            if (outsideForest && !inForest) return Add("só fora de floresta");
            return this;
        }

        public SpawnConditions OceanDepth(float min, float max)
        {
            if (min <= 0f && max <= 0f) return this;
            return Add("profundidade do mar " + Mathf.RoundToInt(min) + " a " + Mathf.RoundToInt(max));
        }

        /// <summary>Texto para o resumo, ou null sem condições.</summary>
        public string Text => _parts.Count == 0 ? null : char.ToUpperInvariant(_parts[0][0]) + string.Join(" · ", _parts).Substring(1) + ".";
    }
}
