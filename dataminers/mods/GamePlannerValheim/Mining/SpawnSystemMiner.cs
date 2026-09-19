using System;
using System.Collections;
using System.Collections.Generic;
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
                    if (!Add(kit, data, "world_" + listId + "_" + i, data?.m_biome ?? Heightmap.Biome.None, null)) unknown++;
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
                    for (int i = 0; i < raid.m_spawn.Count; i++)
                    {
                        SpawnSystem.SpawnData data = raid.m_spawn[i];
                        Heightmap.Biome biomes = data != null && data.m_biome != Heightmap.Biome.None ? data.m_biome : raid.m_biome;
                        if (!Add(kit, data, raidId + "_" + i, biomes, raidId)) unknown++;
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

            SpawnConditions conditions = new SpawnConditions(kit.World)
                .Levels(data.m_minLevel, data.m_maxLevel, data.m_overrideLevelupChance)
                .Time(data.m_spawnAtDay, data.m_spawnAtNight)
                .RequiredKey(data.m_requiredGlobalKey)
                .BiomeArea(data.m_biomeArea)
                .Altitude(data.m_minAltitude, data.m_maxAltitude)
                .Forest(data.m_inForest, data.m_outsideForest)
                .OceanDepth(data.m_minOceanDepth, data.m_maxOceanDepth)
                .Add(data.m_huntPlayer ? "vai atrás do jogador" : null)
                .Add("até " + data.m_maxSpawned + " ao mesmo tempo")
                .Add(data.m_minDistanceFromCenter > 0 ? "a partir de " + Mathf.RoundToInt(data.m_minDistanceFromCenter) + " m do centro do mundo" : null)
                .Add(data.m_maxDistanceFromCenter > 0 ? "até " + Mathf.RoundToInt(data.m_maxDistanceFromCenter) + " m do centro do mundo" : null);
            // Em ataque, o clima exigido não pode virar evento: o ponto apareceria no clima mesmo sem ataque.
            if (raidId != null) conditions.Environments(data.m_requiredEnvironments);

            double chance = Math.Round(Mathf.Clamp01(data.m_spawnChance / 100f), 4);
            int groupMin = Mathf.Max(1, data.m_groupSizeMin);
            int groupMax = Mathf.Max(groupMin, data.m_groupSizeMax);

            foreach (Heightmap.Biome biome in ValheimWorld.Split(biomes))
            {
                var point = new SpawnPointDoc
                {
                    ExtId = ExtId.Sanitize(baseId + "_" + ExtId.SnakeCase(biome.ToString()) + "_" + creatureId),
                    Map = ValheimWorld.MapId,
                    Location = ValheimWorld.BiomeId(biome),
                    RespawnMode = "respawn",
                    RespawnDelayMinutes = Mathf.Max(0, Mathf.RoundToInt(data.m_spawnInterval / 60f)),
                    Summary = conditions.Text,
                };
                point.Occupants.Add(new Occupant(target, chance >= 1 ? (double?)null : chance, groupMin, groupMax > groupMin ? groupMax : (double?)null));

                if (raidId != null)
                {
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

        private static string RaidConditions(MiningKit kit, RandomEvent raid)
        {
            var conditions = new SpawnConditions(kit.World)
                .Add("dura " + Mathf.RoundToInt(raid.m_duration) + " s")
                .Add(raid.m_biome != Heightmap.Biome.None ? "biomas: " + ValheimWorld.BiomeNames(raid.m_biome) : null)
                .Add(raid.m_nearBaseOnly ? "só perto de uma base" : null)
                .Add(string.IsNullOrEmpty(raid.m_forceEnvironment) ? null : "muda o clima para " + ValheimWorld.EnvironmentName(raid.m_forceEnvironment));
            foreach (string key in raid.m_requiredGlobalKeys ?? new List<string>()) conditions.RequiredKey(key);
            foreach (string key in raid.m_notRequiredGlobalKeys ?? new List<string>()) conditions.BlockingKey(key);
            if (raid.m_altRequiredKnownItems != null && raid.m_altRequiredKnownItems.Count > 0)
                conditions.Add("ou quando o jogador conhece: " + string.Join(", ",
                    raid.m_altRequiredKnownItems.Where(item => item != null)
                        .Select(item => ValheimNames.DisplayName(item.m_itemData?.m_shared?.m_name, ValheimNames.PrefabId(item)))));
            return conditions.Text;
        }
    }
}
