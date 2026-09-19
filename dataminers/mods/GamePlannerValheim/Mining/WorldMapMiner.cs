using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Mapa procedural "world", um local por bioma (com os climas possíveis e o peso de cada um) e um evento de
    /// clima por ambiente do EnvMan. O site usa os eventos de clima no filtro do mapa.
    /// </summary>
    internal static class WorldMapMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            EnvMan env = EnvMan.instance;
            if (env != null && env.m_environments != null)
            {
                foreach (EnvSetup setup in env.m_environments)
                {
                    string id = ValheimWorld.EnvironmentId(setup?.m_name);
                    if (id == null) continue;
                    kit.Dataset.Add(new EventDoc(id, ValheimWorld.EnvironmentName(setup.m_name), EventDoc.Weather)
                    {
                        Summary = Traits(setup),
                    });
                }
            }

            var weathers = new List<string>();
            foreach (Heightmap.Biome biome in ValheimWorld.Biomes)
            {
                var doc = new LocationDoc
                {
                    ExtId = ValheimWorld.BiomeId(biome),
                    Name = ValheimWorld.BiomeName(biome),
                    LocationType = "biome",
                    Map = ValheimWorld.MapId,
                    Summary = BiomeWeathers(env, biome, weathers),
                };
                kit.Dataset.Add(doc);
            }

            var map = new MapDoc
            {
                ExtId = ValheimWorld.MapId,
                Name = "Mundo",
                Summary = "Mundo gerado pela semente: o conteúdo é agrupado por bioma e por local.",
                DefaultView = "dashboard",
            };
            map.AvailableViews.Add("dashboard");
            map.Weathers.AddRange(weathers);
            kit.Dataset.Add(map);
            yield break;
        }

        /// <summary>"Climas: Clear 40%, Rain 20%...". Acrescenta os ids em weathers para o filtro do mapa.</summary>
        private static string BiomeWeathers(EnvMan env, Heightmap.Biome biome, List<string> weathers)
        {
            if (env == null || env.m_biomes == null) return null;
            var entries = new List<EnvEntry>();
            foreach (BiomeEnvSetup setup in env.m_biomes)
                if (setup != null && setup.m_biome == biome && setup.m_environments != null) entries.AddRange(setup.m_environments);

            float total = 0f;
            foreach (EnvEntry entry in entries) total += entry.m_weight > 0 ? entry.m_weight : 0f;
            var parts = new List<string>();
            foreach (EnvEntry entry in entries)
            {
                string id = ValheimWorld.EnvironmentId(entry?.m_environment);
                if (id == null) continue;
                if (!weathers.Contains(id)) weathers.Add(id);
                parts.Add(ValheimWorld.EnvironmentName(entry.m_environment) +
                          (total > 0 ? " " + ValheimWorld.Percent(entry.m_weight / total) : ""));
            }
            return parts.Count == 0 ? null : "Climas: " + string.Join(", ", parts) + ".";
        }

        private static string Traits(EnvSetup setup)
        {
            var traits = new List<string>();
            if (setup.m_isWet) traits.Add("molhado");
            if (setup.m_isFreezing) traits.Add("congelante");
            else if (setup.m_isFreezingAtNight) traits.Add("congelante à noite");
            if (setup.m_isCold) traits.Add("frio");
            else if (setup.m_isColdAtNight) traits.Add("frio à noite");
            if (setup.m_alwaysDark) traits.Add("sempre escuro");
            if (traits.Count == 0) return null;
            string text = string.Join(", ", traits);
            return char.ToUpperInvariant(text[0]) + text.Substring(1) + ".";
        }
    }
}
