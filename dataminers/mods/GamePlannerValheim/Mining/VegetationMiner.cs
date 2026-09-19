using System.Collections;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Onde coletáveis, árvores, rochas, minérios e ninhos nascem: ZoneSystem.m_vegetation, a tabela que a geração do
    /// mundo usa em cada zona de 64×64 m. Vegetação decorativa (que não gera nada) fica de fora.
    /// </summary>
    internal static class VegetationMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            var vegetation = ZoneSystem.instance.m_vegetation;
            for (int index = 0; index < vegetation.Count; index++)
            {
                ZoneSystem.ZoneVegetation veg = vegetation[index];
                if (veg == null || !veg.m_enable || veg.m_prefab == null) continue;

                string entityId = WorldResourceMiner.EnsureEntity(kit, veg.m_prefab);
                if (entityId == null) continue;

                string summary = new SpawnConditions(kit.World)
                    .Add(PerZone(veg.m_min, veg.m_max))
                    .Add(veg.m_groupSizeMax > 1 ? "em grupos de " + Mathf.Max(1, veg.m_groupSizeMin) + " a " + veg.m_groupSizeMax : null)
                    .BiomeArea(veg.m_biomeArea)
                    .Altitude(veg.m_minAltitude, veg.m_maxAltitude)
                    .Add(veg.m_inForest ? "só em floresta" : null)
                    .OceanDepth(veg.m_minOceanDepth, veg.m_maxOceanDepth)
                    .Add(veg.m_snapToWater ? "na superfície da água" : null)
                    .Add(veg.m_minDistanceFromCenter > 0 ? "a partir de " + Mathf.RoundToInt(veg.m_minDistanceFromCenter) + " m do centro do mundo" : null)
                    .Add(veg.m_maxDistanceFromCenter > 0 ? "até " + Mathf.RoundToInt(veg.m_maxDistanceFromCenter) + " m do centro do mundo" : null)
                    .Text;

                int groupMin = Mathf.Max(1, veg.m_groupSizeMin);
                int groupMax = Mathf.Max(groupMin, veg.m_groupSizeMax);
                foreach (Heightmap.Biome biome in ValheimWorld.Split(veg.m_biome))
                {
                    var point = new SpawnPointDoc
                    {
                        ExtId = ExtId.Sanitize("veg_" + ExtId.SnakeCase(biome.ToString()) + "_" + entityId + "_" + index),
                        Map = ValheimWorld.MapId,
                        Location = ValheimWorld.BiomeId(biome),
                        Summary = summary,
                    };
                    point.Occupants.Add(new Occupant(Reference.Entity(entityId), null, groupMin, groupMax > groupMin ? groupMax : (double?)null));
                    kit.Dataset.Add(point);
                }

                if (kit.ShouldYield()) yield return null;
            }
        }

        /// <summary>m_min e m_max são tentativas por zona; abaixo de 1 é a chance de haver uma.</summary>
        private static string PerZone(float min, float max)
        {
            if (max <= 0f) return null;
            if (max < 1f) return ValheimWorld.Percent(max) + " de chance por zona";
            int low = Mathf.RoundToInt(min);
            int high = Mathf.RoundToInt(max);
            return (low == high ? high.ToString() : low + " a " + high) + " por zona de 64×64 m";
        }
    }
}
