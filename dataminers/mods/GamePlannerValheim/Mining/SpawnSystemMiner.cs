using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Como as criaturas surgem no mundo aberto (SpawnSystemList, a tabela que cada zona carregada usa) e nos ataques
    /// (RandEventSystem). Cada regra vira um ponto de surgimento por bioma, sem posição:
    /// chance por tentativa, tamanho do grupo, intervalo entre tentativas e climas em que vale (events). O resto
    /// das condições (dia/noite, chefe derrotado, nível, altitude, floresta) fica no resumo.
    /// </summary>
    internal static class SpawnSystemMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            int unknown = 0;

            // As listas não ficam em campo estático: estão no prefab de controle de zona e nas zonas carregadas.
            // FindObjectsOfTypeAll acha as duas; o nome do objeto separa as repetidas.
            var seen = new HashSet<string>();
            IEnumerable<SpawnSystemList> lists = Resources.FindObjectsOfTypeAll<SpawnSystemList>()
                .Where(list => list != null && list.m_spawners != null)
                .OrderBy(list => list.name, StringComparer.Ordinal);
            foreach (SpawnSystemList list in lists)
            {
                string listId = ValheimNames.PrefabId(list.gameObject) ?? "spawns";
                if (!seen.Add(listId)) continue;
                for (int i = 0; i < list.m_spawners.Count; i++)
                {
                    SpawnSystem.SpawnData data = list.m_spawners[i];
                    if (!Add(kit, data, "world_" + listId, data?.m_biome ?? Heightmap.Biome.None, null)) unknown++;
                    if (kit.ShouldYield()) yield return null;
                }
            }

            RandEventSystem events = RandEventSystem.instance;
            if (events != null && events.m_events != null)
            {
                foreach (RandomEvent raid in events.m_events)
                {
                    if (raid == null || !raid.m_enabled || raid.m_devDisabled || string.IsNullOrEmpty(raid.m_name)) continue;
                    string raidId = ExtId.Sanitize("raid_" + raid.m_name);
                    kit.Dataset.Add(new EventDoc(raidId, ValheimNames.Localize(raid.m_startMessage) ?? ValheimNames.Humanize(raid.m_name), "raid")
                    {
                        Summary = RaidConditions(kit, raid),
                        Description = ValheimNames.Localize(raid.m_endMessage) is string end ? "Ao terminar: " + end : null,
                    });
                    foreach (SpawnSystem.SpawnData data in raid.m_spawn)
                    {
                        Heightmap.Biome biomes = data != null && data.m_biome != Heightmap.Biome.None ? data.m_biome : raid.m_biome;
                        if (!Add(kit, data, raidId, biomes, raidId)) unknown++;
                    }
                    if (kit.ShouldYield()) yield return null;
                }
            }

            if (unknown > 0) kit.Dataset.Warn(unknown + " regras de surgimento citam prefabs que não são criaturas mineradas (pássaros, efeitos) e ficaram de fora");
        }

        /// <summary>false quando o prefab não é uma entidade minerada.</summary>
        private static bool Add(MiningKit kit, SpawnSystem.SpawnData data, string baseId, Heightmap.Biome biomes, string raidId)
        {
            if (data == null || !data.m_enabled || data.m_devDisabled || data.m_prefab == null) return true;
            string creatureId = ValheimNames.PrefabId(data.m_prefab);
            Reference target = kit.EntityIfKnown(creatureId);
            if (target == null) return false;

            if (!data.m_spawnAtDay && !data.m_spawnAtNight)
                kit.Dataset.Warn("Regra de " + creatureId + " não surge nem de dia nem à noite: o jogo mudou de formato?");

            SpawnRules rules = new SpawnRules(kit.World)
                .Levels(data.m_minLevel, data.m_maxLevel, data.m_overrideLevelupChance)
                .Time(data.m_spawnAtDay, data.m_spawnAtNight)
                .RequiredKey(data.m_requiredGlobalKey)
                .BiomeArea(data.m_biomeArea)
                .Altitude(data.m_minAltitude, data.m_maxAltitude)
                .Forest(data.m_inForest, data.m_outsideForest)
                .OceanDepth(data.m_minOceanDepth, data.m_maxOceanDepth)
                .DistanceFromCenter(data.m_minDistanceFromCenter, data.m_maxDistanceFromCenter)
                .HuntsPlayer(data.m_huntPlayer)
                .MaxAlive(data.m_maxSpawned)
                .SpawnInterval(data.m_spawnInterval)
                // O clima vira condição sempre; em events, só fora de ataque (ver abaixo).
                .Environments(data.m_requiredEnvironments);

            double chance = Math.Round(Mathf.Clamp01(data.m_spawnChance / 100f), 4);
            int groupMin = Mathf.Max(1, data.m_groupSizeMin);
            int groupMax = Mathf.Max(groupMin, data.m_groupSizeMax);
            int levelMin = Mathf.Max(1, data.m_minLevel);
            int levelMax = Mathf.Max(levelMin, data.m_maxLevel);
            // A faixa de nível já é condição; o nível do ocupante só quando é um só.
            int? level = levelMin == levelMax ? levelMin : (int?)null;
            string fingerprint = ExtId.Fingerprint(Signature(data, biomes));

            foreach (Heightmap.Biome biome in ValheimWorld.Split(biomes))
            {
                var point = new SpawnPointDoc
                {
                    ExtId = ExtId.Sanitize(baseId + "_" + creatureId + "_" + ExtId.SnakeCase(biome.ToString()) + "_" + fingerprint),
                    Map = ValheimWorld.MapId,
                    Location = ValheimWorld.BiomeId(biome),
                    // Sem delay: m_spawnInterval é de quanto em quanto tempo a zona tenta, e não
                    // quanto tempo até o que foi morto voltar. A cadência vai na condição.
                    RespawnMode = "respawn",
                    Summary = rules.Text,
                };
                point.Conditions.AddRange(rules.Rows);
                point.Occupants.Add(new Occupant(target, chance >= 1 ? (double?)null : chance, groupMin,
                    groupMax > groupMin ? groupMax : (double?)null, level));

                if (raidId != null)
                {
                    // Em ataque, o clima exigido não pode virar evento: o ponto apareceria no clima
                    // mesmo sem ataque. A condição weather continua dizendo a verdade.
                    point.Events.Add(raidId);
                }
                else if (data.m_requiredEnvironments != null)
                {
                    foreach (string environment in data.m_requiredEnvironments)
                    {
                        string environmentId = ValheimWorld.EnvironmentId(environment);
                        if (environmentId != null && !point.Events.Contains(environmentId)) point.Events.Add(environmentId);
                    }
                }
                kit.Dataset.Add(point);
            }
            return true;
        }

        /// <summary>
        /// O que distingue uma regra de outra, para o id não depender da posição na lista do jogo:
        /// uma entrada nova no meio deixaria de deslocar todos os ids seguintes. Tudo em
        /// InvariantCulture, senão a vírgula decimal de um idioma muda o hash.
        /// </summary>
        private static string Signature(SpawnSystem.SpawnData data, Heightmap.Biome biomes)
        {
            var parts = new List<string>
            {
                ((int)biomes).ToString(CultureInfo.InvariantCulture),
                ((int)data.m_biomeArea).ToString(CultureInfo.InvariantCulture),
                data.m_spawnAtDay + "/" + data.m_spawnAtNight,
                data.m_inForest + "/" + data.m_outsideForest,
                data.m_requiredGlobalKey ?? "",
                Number(data.m_minAltitude), Number(data.m_maxAltitude),
                Number(data.m_minOceanDepth), Number(data.m_maxOceanDepth),
                Number(data.m_minDistanceFromCenter), Number(data.m_maxDistanceFromCenter),
                data.m_minLevel.ToString(CultureInfo.InvariantCulture),
                data.m_maxLevel.ToString(CultureInfo.InvariantCulture),
                data.m_huntPlayer.ToString(),
                data.m_maxSpawned.ToString(CultureInfo.InvariantCulture),
                Number(data.m_spawnInterval),
                Number(data.m_spawnChance),
                Number(data.m_groupSizeMin), Number(data.m_groupSizeMax),
            };
            if (data.m_requiredEnvironments != null)
                parts.AddRange(data.m_requiredEnvironments.Where(env => env != null).OrderBy(env => env, StringComparer.Ordinal));
            return string.Join("|", parts);
        }

        private static string Number(float value) =>
            Math.Round(value, 4).ToString(CultureInfo.InvariantCulture);

        private static string Number(int value) => value.ToString(CultureInfo.InvariantCulture);

        private static string RaidConditions(MiningKit kit, RandomEvent raid)
        {
            var rules = new SpawnRules(kit.World)
                .Duration(raid.m_duration)
                .Note(raid.m_biome != Heightmap.Biome.None ? "biomas: " + ValheimWorld.BiomeNames(raid.m_biome) : null)
                .NearBase(raid.m_nearBaseOnly)
                .Note(string.IsNullOrEmpty(raid.m_forceEnvironment) ? null : "muda o clima para " + ValheimWorld.EnvironmentName(raid.m_forceEnvironment));
            foreach (string key in raid.m_requiredGlobalKeys ?? new List<string>()) rules.RequiredKey(key);
            foreach (string key in raid.m_notRequiredGlobalKeys ?? new List<string>()) rules.BlockingKey(key);
            if (raid.m_altRequiredKnownItems != null && raid.m_altRequiredKnownItems.Count > 0)
            {
                var names = new List<string>();
                foreach (ItemDrop item in raid.m_altRequiredKnownItems)
                {
                    string itemId = ValheimNames.PrefabId(item);
                    if (itemId == null) continue;
                    rules.KnownItem(itemId);
                    names.Add(ValheimNames.DisplayName(item.m_itemData?.m_shared?.m_name, itemId));
                }
                rules.Note("ou quando o jogador conhece: " + string.Join(", ", names));
            }
            // As condições do ataque ficam no evento, que é o dono delas; os pontos citam o evento.
            return rules.Text;
        }
    }
}
