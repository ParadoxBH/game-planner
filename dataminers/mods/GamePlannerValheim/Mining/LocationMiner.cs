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
    /// Locais do ZoneSystem (masmorras, ruínas, altares de chefe, acampamentos...). Carrega cada prefab e lê o que
    /// está dentro: geradores de criatura (CreatureSpawner e SpawnArea), baús, itens no chão, coletáveis, pontos
    /// de saque, destrutíveis e altares. Masmorra também recebe o conteúdo das salas do seu tema, que a geração
    /// sorteia: essas entram sem chance nem quantidade. Cada coisa encontrada vira um ponto de surgimento no local,
    /// e cada altar uma receita "summon_&lt;chefe&gt;".
    /// </summary>
    internal static class LocationMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            // O mesmo prefab aparece em várias entradas (biomas ou quantidades diferentes): junta antes de carregar.
            var groups = new Dictionary<string, List<ZoneSystem.ZoneLocation>>();
            var order = new List<string>();
            foreach (ZoneSystem.ZoneLocation location in ZoneSystem.instance.m_locations)
            {
                if (location == null || !location.m_enable || !location.m_prefab.IsValid) continue;
                string name = string.IsNullOrEmpty(location.m_prefabName) ? location.m_prefab.Name : location.m_prefabName;
                if (!groups.TryGetValue(name, out List<ZoneSystem.ZoneLocation> list))
                {
                    groups[name] = list = new List<ZoneSystem.ZoneLocation>();
                    order.Add(name);
                }
                list.Add(location);
            }

            List<DungeonDB.RoomData> rooms = DungeonDB.instance != null ? DungeonDB.GetRooms() : null;
            var roomContents = new Dictionary<int, Contents>();

            foreach (string name in order)
            {
                List<ZoneSystem.ZoneLocation> entries = groups[name];
                ZoneSystem.ZoneLocation first = entries[0];
                first.m_prefab.Load();
                try
                {
                    GameObject asset = first.m_prefab.Asset;
                    if (asset != null) MineLocation(kit, name, entries, asset, rooms, roomContents);
                }
                catch (Exception e)
                {
                    kit.Dataset.Warn("Local '" + name + "' não minerado: " + e.Message);
                }
                finally
                {
                    first.m_prefab.Release();
                }
                yield return null;
            }
        }

        private static void MineLocation(MiningKit kit, string name, List<ZoneSystem.ZoneLocation> entries, GameObject asset,
                                         List<DungeonDB.RoomData> rooms, Dictionary<int, Contents> roomContents)
        {
            string prefabId = ValheimNames.PrefabId(name);
            string locationId = ExtId.Sanitize("loc_" + prefabId);
            Heightmap.Biome biomes = Heightmap.Biome.None;
            int quantity = 0;
            bool unique = false;
            foreach (ZoneSystem.ZoneLocation entry in entries)
            {
                biomes |= entry.m_biome;
                quantity += entry.m_quantity;
                unique |= entry.m_unique;
            }

            Location location = asset.GetComponent<Location>();
            DungeonGenerator generator = EnabledInChildren<DungeonGenerator>(asset).FirstOrDefault();
            var doc = new LocationDoc
            {
                ExtId = locationId,
                Name = ValheimNames.Localize(location != null ? location.m_discoverLabel : null) ?? ValheimNames.Humanize(prefabId),
                LocationType = generator != null ? "dungeon" : "poi",
                Map = ValheimWorld.MapId,
                Parent = ValheimWorld.SingleBiomeId(biomes),
                Summary = new SpawnRules(kit.World)
                    .Note(biomes != Heightmap.Biome.None ? "biomas: " + ValheimWorld.BiomeNames(biomes) : null)
                    .Note(unique ? "só um por mundo" : quantity > 0 ? "até " + quantity + " por mundo" : null)
                    .Note(location != null && location.m_hasInterior ? "tem interior" : null)
                    .Text,
            };
            if (!kit.Dataset.Add(doc)) return;

            var contents = new Contents();
            contents.Collect(kit, asset);
            if (generator != null && rooms != null)
            {
                for (int i = 0; i < rooms.Count; i++)
                {
                    DungeonDB.RoomData room = rooms[i];
                    if (room == null || !room.m_enabled || (room.m_theme & generator.m_themes) == 0) continue;
                    contents.MergeRoom(RoomContents(kit, room, i, roomContents));
                }
            }
            contents.Emit(kit, doc, location);
        }

        /// <summary>
        /// Componentes ativos dentro de um prefab: o componente habilitado e todos os objetos até a raiz com activeSelf.
        /// Em prefab carregado (fora da cena) activeInHierarchy não serve, por isso o caminho é conferido à mão.
        /// </summary>
        private static T[] EnabledInChildren<T>(GameObject root) where T : Component
        {
            return root.GetComponentsInChildren<T>(true).Where(component =>
            {
                if (component is Behaviour behaviour && !behaviour.enabled) return false;
                for (Transform current = component.transform; current != null; current = current.parent)
                {
                    if (!current.gameObject.activeSelf) return false;
                    if (current == root.transform) break;
                }
                return true;
            }).ToArray();
        }

        private static Contents RoomContents(MiningKit kit, DungeonDB.RoomData room, int index, Dictionary<int, Contents> cache)
        {
            if (cache.TryGetValue(index, out Contents cached)) return cached;
            var contents = new Contents();
            room.m_prefab.Load();
            try
            {
                if (room.m_prefab.Asset != null) contents.Collect(kit, room.m_prefab.Asset);
            }
            finally
            {
                room.m_prefab.Release();
            }
            cache[index] = contents;
            return contents;
        }

        /// <summary>O que foi achado de uma mesma entidade dentro de um local.</summary>
        private sealed class Found
        {
            public string TargetId;
            public bool Creature;
            public int Count;
            public int Guaranteed;
            public double NoneChance = 1;
            public int RoomCount;
            public int MinLevel = int.MaxValue;
            public int MaxLevel;
            public float LevelUpChance = -1f;
            public float RespawnMinutes = -1f;
            public bool Day;
            public bool Night;
            public string RequiredKey;
            public string BlockingKey;
        }

        private sealed class Contents
        {
            private readonly Dictionary<string, Found> _found = new Dictionary<string, Found>();
            private readonly List<OfferingBowl> _altars = new List<OfferingBowl>();

            public void Collect(MiningKit kit, GameObject root)
            {
                foreach (CreatureSpawner spawner in EnabledInChildren<CreatureSpawner>(root))
                {
                    string creatureId = ValheimNames.PrefabId(spawner.m_creaturePrefab);
                    if (creatureId == null || kit.EntityIfKnown(creatureId) == null) continue;
                    Found found = Get(creatureId, creature: true);
                    AddInstance(found, SpawnChance(spawner.transform, root.transform));
                    found.MinLevel = Math.Min(found.MinLevel, spawner.m_minLevel);
                    found.MaxLevel = Math.Max(found.MaxLevel, spawner.m_maxLevel);
                    found.LevelUpChance = Math.Max(found.LevelUpChance, spawner.m_levelupChance);
                    if (spawner.m_respawnTimeMinuts > 0)
                        found.RespawnMinutes = found.RespawnMinutes < 0 ? spawner.m_respawnTimeMinuts : Math.Min(found.RespawnMinutes, spawner.m_respawnTimeMinuts);
                    found.Day |= spawner.m_spawnAtDay;
                    found.Night |= spawner.m_spawnAtNight;
                    if (!string.IsNullOrEmpty(spawner.m_requiredGlobalKey)) found.RequiredKey = spawner.m_requiredGlobalKey;
                    if (!string.IsNullOrEmpty(spawner.m_blockingGlobalKey)) found.BlockingKey = spawner.m_blockingGlobalKey;
                }

                // Um objeto pode ter mais de um desses componentes (baú destrutível): conta uma vez só.
                var objects = new HashSet<GameObject>();
                foreach (SpawnArea c in EnabledInChildren<SpawnArea>(root)) objects.Add(c.gameObject);
                foreach (Container c in EnabledInChildren<Container>(root)) objects.Add(c.gameObject);
                foreach (PickableItem c in EnabledInChildren<PickableItem>(root)) objects.Add(c.gameObject);
                foreach (Pickable c in EnabledInChildren<Pickable>(root)) objects.Add(c.gameObject);
                foreach (LootSpawner c in EnabledInChildren<LootSpawner>(root)) objects.Add(c.gameObject);
                foreach (DropOnDestroyed c in EnabledInChildren<DropOnDestroyed>(root)) objects.Add(c.gameObject);
                foreach (MineRock5 c in EnabledInChildren<MineRock5>(root)) objects.Add(c.gameObject);

                foreach (GameObject obj in objects)
                {
                    if (obj.GetComponent<Piece>() != null) continue;
                    string entityId = WorldResourceMiner.EnsureEntity(kit, obj);
                    if (entityId == null) continue;
                    AddInstance(Get(entityId, creature: false), SpawnChance(obj.transform, root.transform));
                }

                _altars.AddRange(EnabledInChildren<OfferingBowl>(root).Where(altar => altar.m_bossPrefab != null));
            }

            /// <summary>Sala sorteada pela masmorra: conta à parte, sem entrar na chance.</summary>
            public void MergeRoom(Contents room)
            {
                foreach (Found source in room._found.Values)
                {
                    Found found = Get(source.TargetId, source.Creature);
                    found.RoomCount += source.Count;
                    found.MinLevel = Math.Min(found.MinLevel, source.MinLevel);
                    found.MaxLevel = Math.Max(found.MaxLevel, source.MaxLevel);
                    found.LevelUpChance = Math.Max(found.LevelUpChance, source.LevelUpChance);
                    if (source.RespawnMinutes > 0)
                        found.RespawnMinutes = found.RespawnMinutes < 0 ? source.RespawnMinutes : Math.Min(found.RespawnMinutes, source.RespawnMinutes);
                    found.Day |= source.Day;
                    found.Night |= source.Night;
                    found.RequiredKey = found.RequiredKey ?? source.RequiredKey;
                    found.BlockingKey = found.BlockingKey ?? source.BlockingKey;
                }
            }

            public void Emit(MiningKit kit, LocationDoc location, Location component)
            {
                foreach (Found found in _found.Values)
                {
                    var point = new SpawnPointDoc
                    {
                        ExtId = ExtId.Sanitize(location.ExtId + "_" + found.TargetId),
                        Map = ValheimWorld.MapId,
                        Location = location.ExtId,
                    };

                    var rules = new SpawnRules(kit.World);
                    int? level = null;
                    if (found.Creature)
                    {
                        int min = found.MinLevel == int.MaxValue ? 1 : found.MinLevel;
                        int max = found.MaxLevel;
                        if (component != null && component.m_enemyMinLevelOverride >= 0) min = component.m_enemyMinLevelOverride;
                        if (component != null && component.m_enemyMaxLevelOverride >= 0) max = component.m_enemyMaxLevelOverride;
                        min = Mathf.Max(1, min);
                        max = Mathf.Max(min, max);
                        rules.Levels(min, max, found.LevelUpChance).Time(found.Day, found.Night)
                            .RequiredKey(found.RequiredKey).BlockingKey(found.BlockingKey);
                        // A faixa já é condição; o nível do ocupante só quando é um só.
                        if (min == max) level = min;
                        if (found.RespawnMinutes > 0)
                        {
                            // Aqui o tempo é de renascimento mesmo: CreatureSpawner.m_respawnTimeMinuts.
                            point.RespawnMode = "respawn";
                            point.RespawnDelayMinutes = Mathf.RoundToInt(found.RespawnMinutes);
                        }
                    }
                    if (found.RoomCount > 0)
                        rules.DungeonRoom(found.Count > 0 ? "também em salas da masmorra" : "em salas da masmorra, conforme a geração");
                    point.Summary = rules.Text;
                    point.Conditions.AddRange(rules.Rows);

                    Reference target = Reference.Entity(found.TargetId);
                    if (found.Count == 0)
                    {
                        point.Occupants.Add(new Occupant(target, null, null, null, level));
                    }
                    else
                    {
                        double chance = Math.Round(1 - found.NoneChance, 4);
                        double? amount = found.Guaranteed > 0 ? found.Guaranteed : (double?)null;
                        double? maxAmount = found.Count > found.Guaranteed ? found.Count : (double?)null;
                        point.Occupants.Add(new Occupant(target, chance >= 1 ? (double?)null : chance, amount, maxAmount, level));
                    }
                    kit.Dataset.Add(point);
                }

                foreach (OfferingBowl altar in _altars) EmitAltar(kit, location, altar);
            }

            private static void EmitAltar(MiningKit kit, LocationDoc location, OfferingBowl altar)
            {
                string bossId = ValheimNames.PrefabId(altar.m_bossPrefab);
                if (kit.EntityIfKnown(bossId) == null) return;
                Character boss = altar.m_bossPrefab.GetComponent<Character>();
                string bossName = ValheimNames.DisplayName(boss != null ? boss.m_name : null, bossId);
                string itemId = ValheimNames.PrefabId(altar.m_bossItem);
                int itemCount = Math.Max(1, altar.m_bossItems);
                string itemName = itemId == null ? null : ValheimNames.DisplayName(altar.m_bossItem.m_itemData?.m_shared?.m_name, itemId);

                string how = altar.m_useItemStands
                    ? "Invocado colocando os itens nos suportes do altar"
                    : itemId != null ? "Invocado oferecendo " + itemCount + "× " + itemName + " no altar" : "Invocado no altar";
                var point = new SpawnPointDoc
                {
                    ExtId = ExtId.Sanitize(location.ExtId + "_boss_" + bossId),
                    Map = ValheimWorld.MapId,
                    Location = location.ExtId,
                    Summary = how + (string.IsNullOrEmpty(altar.m_setGlobalKey) ? "." : "; " + kit.World.GlobalKeyText(altar.m_setGlobalKey) + " libera o que depende dele."),
                };
                point.Occupants.Add(new Occupant(Reference.Entity(bossId), null, 1));
                kit.Dataset.Add(point);

                string recipeId = ExtId.Sanitize("summon_" + bossId);
                if (kit.Dataset.Contains("recipes", recipeId)) return;
                var recipe = new RecipeDoc { ExtId = recipeId, Name = "Invocar " + bossName, Summary = how + "." };
                if (itemId != null && !altar.m_useItemStands) recipe.Inputs.Add(new Requirement(Reference.Item(itemId), itemCount));
                recipe.Outputs.Add(new RecipeOutput(Reference.Entity(bossId), 1));
                recipe.Unlock.Add(new RecipeUnlock("location", null, location.Name));
                kit.Dataset.Add(recipe);
            }

            private Found Get(string targetId, bool creature)
            {
                string key = (creature ? "c:" : "e:") + targetId;
                if (!_found.TryGetValue(key, out Found found))
                    _found[key] = found = new Found { TargetId = targetId, Creature = creature };
                return found;
            }

            private static void AddInstance(Found found, double chance)
            {
                found.Count++;
                if (chance >= 1) found.Guaranteed++;
                found.NoneChance *= 1 - chance;
            }

            /// <summary>Produto das chances dos RandomSpawn no caminho até a raiz: o objeto só existe se todos passarem.</summary>
            private static double SpawnChance(Transform node, Transform root)
            {
                double chance = 1;
                for (Transform current = node; current != null; current = current.parent)
                {
                    RandomSpawn random = current.GetComponent<RandomSpawn>();
                    if (random != null) chance *= Mathf.Clamp01(random.m_chanceToSpawn / 100f);
                    if (current == root) break;
                }
                return chance;
            }
        }
    }
}
