using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using GamePlanner.Core.Model;
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

        /// <summary>
        /// Semente do mundo cujo desenho de biomas vai para a API. O traçado depende da semente, e
        /// o mapa é um só para todos: minerar noutro mundo não publica a geometria, só avisa.
        /// O plugin sobrescreve pela configuração.
        /// </summary>
        public static string ReferenceSeed = "GamePlannerRef";

        /// <summary>Ordem de progressão do jogo; None e All ficam de fora.</summary>
        public static readonly Heightmap.Biome[] Biomes =
        {
            Heightmap.Biome.Meadows, Heightmap.Biome.BlackForest, Heightmap.Biome.Swamp, Heightmap.Biome.Mountain,
            Heightmap.Biome.Plains, Heightmap.Biome.Ocean, Heightmap.Biome.Mistlands, Heightmap.Biome.AshLands,
            Heightmap.Biome.DeepNorth,
        };

        /// <summary>A criatura cujo abate liga uma chave global.</summary>
        internal sealed class Boss
        {
            public readonly string Id;
            public readonly string Name;

            public Boss(string id, string name)
            {
                Id = id; Name = name;
            }
        }

        private readonly Dictionary<string, Boss> _bossByGlobalKey = new Dictionary<string, Boss>();

        /// <summary>Lê de ZNetScene quais criaturas ligam cada chave global ao morrer (defeated_eikthyr...).</summary>
        public ValheimWorld()
        {
            if (ZNetScene.instance == null) return;
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                Character character = prefab != null ? prefab.GetComponent<Character>() : null;
                if (character == null || string.IsNullOrEmpty(character.m_defeatSetGlobalKey)) continue;
                string id = ValheimNames.PrefabId(prefab);
                _bossByGlobalKey[character.m_defeatSetGlobalKey] =
                    new Boss(id, ValheimNames.DisplayName(character.m_name, id));
            }
        }

        /// <summary>A criatura que liga a chave, ou null quando a chave não vem de um abate.</summary>
        public Boss BossOf(string key)
        {
            Boss boss;
            return !string.IsNullOrEmpty(key) && _bossByGlobalKey.TryGetValue(key, out boss) ? boss : null;
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
            Boss boss = BossOf(key);
            return boss != null ? "depois de derrotar " + boss.Name : "chave global " + key;
        }

        public static string Percent(float fraction) =>
            Mathf.RoundToInt(Mathf.Clamp01(fraction) * 100).ToString(CultureInfo.InvariantCulture) + "%";
    }

    /// <summary>
    /// Condições de surgimento em duas saídas ao mesmo tempo: a frase do resumo, para ler, e as linhas
    /// estruturadas, para consultar, filtrar e avaliar no cliente. Todo método alimenta as duas.
    ///
    /// O que cada tipo significa está em doc/spawn_and_spatial.md. As sentinelas do jogo (altitude ±1000,
    /// profundidade 0, distância 0) viram "sem limite" aqui, num lugar só.
    /// </summary>
    internal sealed class SpawnRules
    {
        private readonly List<string> _parts = new List<string>();
        private readonly List<SpawnConditionRow> _rows = new List<SpawnConditionRow>();
        private readonly ValheimWorld _world;

        public SpawnRules(ValheimWorld world) => _world = world;

        public List<SpawnConditionRow> Rows => _rows;

        /// <summary>Texto para o resumo, ou null sem condições.</summary>
        public string Text => _parts.Count == 0 ? null : char.ToUpperInvariant(_parts[0][0]) + string.Join(" · ", _parts).Substring(1) + ".";

        /// <summary>Só a frase, sem linha estruturada: o que não tem tipo no vocabulário.</summary>
        public SpawnRules Note(string text)
        {
            if (!string.IsNullOrEmpty(text)) _parts.Add(text);
            return this;
        }

        private SpawnRules Add(SpawnConditionRow row, string text)
        {
            _rows.Add(row);
            return Note(text);
        }

        /// <summary>Nível 1 é a criatura sem estrela.</summary>
        public SpawnRules Levels(int min, int max, float levelUpChancePercent = -1f)
        {
            min = Mathf.Max(1, min);
            max = Mathf.Max(min, max);
            string text = min == max ? "nível " + min : "nível " + min + "–" + max;
            if (max > 1) text += " (" + (min - 1) + "–" + (max - 1) + " estrelas)";
            if (levelUpChancePercent > 0 && max > min) text += ", " + Mathf.RoundToInt(levelUpChancePercent) + "% de chance por nível extra";
            Add(SpawnConditionRow.Range(ConditionTypes.Level, min, max), text);
            if (levelUpChancePercent > 0 && max > min)
                _rows.Add(SpawnConditionRow.Scalar(ConditionTypes.LevelUpChance, Round(levelUpChancePercent)));
            return this;
        }

        /// <summary>Os dois ligados é "sem restrição"; os dois desligados, "nunca nasce" — quem chama avisa.</summary>
        public SpawnRules Time(bool day, bool night)
        {
            if (day && !night) return Add(SpawnConditionRow.Code(ConditionTypes.TimeOfDay, ConditionTypes.Day), "só de dia");
            if (night && !day) return Add(SpawnConditionRow.Code(ConditionTypes.TimeOfDay, ConditionTypes.Night), "só à noite");
            return this;
        }

        /// <summary>Chave global exigida. Vindo de um abate, a linha também aponta para o chefe.</summary>
        public SpawnRules RequiredKey(string key) => Progress(key, false);

        /// <summary>Chave que faz parar de surgir: mesma linha, negada.</summary>
        public SpawnRules BlockingKey(string key) => Progress(key, true);

        private SpawnRules Progress(string key, bool blocking)
        {
            if (string.IsNullOrEmpty(key)) return this;
            ValheimWorld.Boss boss = _world.BossOf(key);
            var row = new SpawnConditionRow(ConditionTypes.Progress) { Value = key };
            if (boss != null) row.Target = Reference.Entity(boss.Id);
            if (blocking) row.Not();
            return Add(row, blocking ? "para de surgir " + _world.GlobalKeyText(key) : _world.GlobalKeyText(key));
        }

        /// <summary>Uma linha por clima: dentro do mesmo tipo, basta um casar.</summary>
        public SpawnRules Environments(IEnumerable<string> environments)
        {
            var names = new List<string>();
            foreach (string environment in environments ?? Enumerable.Empty<string>())
            {
                string id = ValheimWorld.EnvironmentId(environment);
                if (id == null) continue;
                _rows.Add(SpawnConditionRow.Of(ConditionTypes.Weather, new Reference("event", id)));
                names.Add(ValheimWorld.EnvironmentName(environment));
            }
            return names.Count == 0 ? this : Note("clima: " + string.Join(", ", names));
        }

        public SpawnRules BiomeArea(Heightmap.BiomeArea area)
        {
            if (area == Heightmap.BiomeArea.Edge)
                return Add(SpawnConditionRow.Code(ConditionTypes.BiomeArea, ConditionTypes.Edge), "só na borda do bioma");
            if (area == Heightmap.BiomeArea.Median)
                return Add(SpawnConditionRow.Code(ConditionTypes.BiomeArea, ConditionTypes.Interior), "só no interior do bioma");
            return this;
        }

        /// <summary>±1000 é a sentinela de "sem limite" do jogo.</summary>
        public SpawnRules Altitude(float min, float max)
        {
            bool hasMin = min > -1000f;
            bool hasMax = max < 1000f;
            if (!hasMin && !hasMax) return this;
            string text = hasMin && hasMax ? "altitude " + Mathf.RoundToInt(min) + " a " + Mathf.RoundToInt(max)
                : hasMin ? "altitude a partir de " + Mathf.RoundToInt(min)
                : "altitude até " + Mathf.RoundToInt(max);
            return Add(SpawnConditionRow.Range(ConditionTypes.Altitude, hasMin ? Round(min) : (double?)null,
                hasMax ? Round(max) : (double?)null), text);
        }

        public SpawnRules Forest(bool inForest, bool outsideForest)
        {
            if (inForest && !outsideForest)
                return Add(SpawnConditionRow.Code(ConditionTypes.Forest, ConditionTypes.Inside), "só em floresta");
            if (outsideForest && !inForest)
                return Add(SpawnConditionRow.Code(ConditionTypes.Forest, ConditionTypes.Outside), "só fora de floresta");
            return this;
        }

        public SpawnRules OceanDepth(float min, float max)
        {
            if (min <= 0f && max <= 0f) return this;
            return Add(SpawnConditionRow.Range(ConditionTypes.Depth, min > 0f ? Round(min) : (double?)null,
                    max > 0f ? Round(max) : (double?)null),
                "profundidade do mar " + Mathf.RoundToInt(min) + " a " + Mathf.RoundToInt(max));
        }

        /// <summary>Zero é "sem limite" nos dois lados.</summary>
        public SpawnRules DistanceFromCenter(float min, float max)
        {
            if (min <= 0f && max <= 0f) return this;
            var parts = new List<string>();
            if (min > 0f) parts.Add("a partir de " + Mathf.RoundToInt(min) + " m do centro do mundo");
            if (max > 0f) parts.Add("até " + Mathf.RoundToInt(max) + " m do centro do mundo");
            return Add(SpawnConditionRow.Range(ConditionTypes.DistanceFromCenter, min > 0f ? Round(min) : (double?)null,
                max > 0f ? Round(max) : (double?)null), string.Join(" · ", parts));
        }

        public SpawnRules MaxAlive(int max) =>
            max <= 0 ? this : Add(SpawnConditionRow.Range(ConditionTypes.MaxAlive, null, max),
                "até " + max + " ao mesmo tempo");

        public SpawnRules MaxTotal(int max) =>
            max <= 0 ? this : Add(SpawnConditionRow.Range(ConditionTypes.MaxTotal, null, max),
                "até " + max + " no total");

        /// <summary>De quanto em quanto tempo a regra tenta surgir — não é o renascimento do que foi morto.</summary>
        public SpawnRules SpawnInterval(float seconds) =>
            seconds <= 0f ? this : Add(SpawnConditionRow.Scalar(ConditionTypes.SpawnInterval, Round(seconds)),
                "tenta a cada " + Mathf.RoundToInt(seconds) + " s");

        public SpawnRules Duration(float seconds) =>
            seconds <= 0f ? this : Add(SpawnConditionRow.Scalar(ConditionTypes.Duration, Round(seconds)),
                "dura " + Mathf.RoundToInt(seconds) + " s");

        public SpawnRules HuntsPlayer(bool hunts) =>
            hunts ? Add(SpawnConditionRow.Flag(ConditionTypes.HuntsPlayer), "vai atrás do jogador") : this;

        public SpawnRules WaterSurface(bool snapToWater) =>
            snapToWater ? Add(SpawnConditionRow.Flag(ConditionTypes.WaterSurface), "na superfície da água") : this;

        public SpawnRules NearBase(bool nearBaseOnly) =>
            nearBaseOnly ? Add(SpawnConditionRow.Flag(ConditionTypes.NearBase), "só perto de uma base") : this;

        /// <summary>Item que o jogador precisa conhecer; o texto de todos eles vem junto, de fora.</summary>
        public SpawnRules KnownItem(string itemId) =>
            itemId == null ? this : Add(SpawnConditionRow.Of(ConditionTypes.KnownItem, Reference.Item(itemId)), null);

        public SpawnRules DungeonRoom(string text) =>
            Add(SpawnConditionRow.Flag(ConditionTypes.DungeonRoom), text);

        /// <summary>m_min e m_max são tentativas por zona de geração; abaixo de 1 é a chance de haver uma.</summary>
        public SpawnRules PerZone(float min, float max, int zoneSize)
        {
            if (max <= 0f) return this;
            string text = max < 1f
                ? ValheimWorld.Percent(max) + " de chance por zona"
                : (Mathf.RoundToInt(min) == Mathf.RoundToInt(max) ? Mathf.RoundToInt(max).ToString()
                      : Mathf.RoundToInt(min) + " a " + Mathf.RoundToInt(max))
                  + " por zona de " + zoneSize + "×" + zoneSize + " m";
            return Add(SpawnConditionRow.Range(ConditionTypes.PerZone, Round(Mathf.Max(0f, min)), Round(max)), text);
        }

        /// <summary>Quatro casas: mais que isso é ruído de float e vira revisão à toa na API.</summary>
        private static double Round(float value) => Math.Round(value, 4);
    }
}
