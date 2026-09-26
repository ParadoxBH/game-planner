using System;
using System.Collections;
using System.Globalization;
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
        /// <summary>Lado da zona de geração do mundo, em metros.</summary>
        private const int ZoneSize = 64;

        public static IEnumerator Mine(MiningKit kit)
        {
            var vegetation = ZoneSystem.instance.m_vegetation;
            for (int index = 0; index < vegetation.Count; index++)
            {
                ZoneSystem.ZoneVegetation veg = vegetation[index];
                if (veg == null || !veg.m_enable || veg.m_prefab == null) continue;

                string entityId = WorldResourceMiner.EnsureEntity(kit, veg.m_prefab);
                if (entityId == null) continue;

                SpawnRules rules = new SpawnRules(kit.World)
                    .PerZone(veg.m_min, veg.m_max, ZoneSize)
                    .Note(veg.m_groupSizeMax > 1 ? "em grupos de " + Mathf.Max(1, veg.m_groupSizeMin) + " a " + veg.m_groupSizeMax : null)
                    .BiomeArea(veg.m_biomeArea)
                    .Altitude(veg.m_minAltitude, veg.m_maxAltitude)
                    // A vegetação só tem "dentro da floresta"; não existe o "fora" do surgimento.
                    .Forest(veg.m_inForest, false)
                    .OceanDepth(veg.m_minOceanDepth, veg.m_maxOceanDepth)
                    .WaterSurface(veg.m_snapToWater)
                    .DistanceFromCenter(veg.m_minDistanceFromCenter, veg.m_maxDistanceFromCenter);

                int groupMin = Mathf.Max(1, veg.m_groupSizeMin);
                int groupMax = Mathf.Max(groupMin, veg.m_groupSizeMax);
                string fingerprint = ExtId.Fingerprint(Signature(veg));
                foreach (Heightmap.Biome biome in ValheimWorld.Split(veg.m_biome))
                {
                    var point = new SpawnPointDoc
                    {
                        ExtId = ExtId.Sanitize("veg_" + ExtId.SnakeCase(biome.ToString()) + "_" + entityId + "_" + fingerprint),
                        Map = ValheimWorld.MapId,
                        Location = ValheimWorld.BiomeId(biome),
                        Summary = rules.Text,
                    };
                    point.Conditions.AddRange(rules.Rows);
                    point.Occupants.Add(new Occupant(Reference.Entity(entityId), null, groupMin, groupMax > groupMin ? groupMax : (double?)null));
                    kit.Dataset.Add(point);
                }

                if (kit.ShouldYield()) yield return null;
            }
        }

        /// <summary>O que distingue uma entrada da outra, para o id não vir do índice na lista. Ver ExtId.Fingerprint.</summary>
        private static string Signature(ZoneSystem.ZoneVegetation veg)
        {
            return string.Join("|", new[]
            {
                ((int)veg.m_biome).ToString(CultureInfo.InvariantCulture),
                ((int)veg.m_biomeArea).ToString(CultureInfo.InvariantCulture),
                Number(veg.m_min), Number(veg.m_max),
                veg.m_groupSizeMin.ToString(CultureInfo.InvariantCulture),
                veg.m_groupSizeMax.ToString(CultureInfo.InvariantCulture),
                Number(veg.m_minAltitude), Number(veg.m_maxAltitude),
                Number(veg.m_minOceanDepth), Number(veg.m_maxOceanDepth),
                Number(veg.m_minDistanceFromCenter), Number(veg.m_maxDistanceFromCenter),
                veg.m_inForest.ToString(), veg.m_snapToWater.ToString(),
            });
        }

        private static string Number(float value) => Math.Round(value, 4).ToString(CultureInfo.InvariantCulture);
    }
}
