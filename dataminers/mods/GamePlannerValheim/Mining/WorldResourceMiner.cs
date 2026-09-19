using System;
using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Tudo em ZNetScene que gera item sem ser criatura nem construção: coletáveis (Pickable), itens soltos no chão
    /// (PickableItem), baús de tesouro (Container), pontos de saque (LootSpawner), peixes, árvores e troncos,
    /// rochas e minérios e destrutíveis. Ninhos e geradores (SpawnArea) também entram, com um local próprio que
    /// diz quais criaturas saem deles. O mesmo Describe serve para objetos dentro de locais e salas de masmorra.
    /// </summary>
    internal static class WorldResourceMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                if (prefab == null || prefab.GetComponent<Character>() != null || prefab.GetComponent<Piece>() != null) continue;
                // Item largado no chão é item, não entidade; peixe também é ItemDrop, mas nada e é pescado.
                if (prefab.GetComponent<ItemDrop>() != null && prefab.GetComponent<Fish>() == null) continue;

                EnsureEntity(kit, prefab);
                if (kit.ShouldYield()) yield return null;
            }
        }

        /// <summary>
        /// Id da entidade do objeto, cadastrando-a se ainda não existe. Objeto dentro de local usa o prefab de
        /// mesmo nome do ZNetScene quando há. Null quando o objeto não gera nada.
        /// </summary>
        public static string EnsureEntity(MiningKit kit, GameObject source)
        {
            string id = ValheimNames.PrefabId(source);
            if (id == null) return null;
            if (kit.Dataset.Contains("entities", id)) return id;

            GameObject prefab = ZNetScene.instance.GetPrefab(id);
            GameObject target = prefab != null ? prefab : source;
            EntityDoc doc = Describe(kit, target, id, out bool keepWithoutDrops);
            if (doc == null || (doc.Drops.Count == 0 && !keepWithoutDrops)) return null;

            if (doc.Name == null) doc.Name = HoverName(target) ?? ValheimNames.Humanize(id);
            if (doc.IconImage == null && doc.Drops.Count > 0)
                doc.IconImage = kit.Images.Collect(ItemMiner.Icon(ObjectDB.instance.GetItemPrefab(doc.Drops[0].Target.ExtId)));
            kit.Dataset.Add(doc);

            SpawnArea area = target.GetComponentInChildren<SpawnArea>(true);
            if (area != null) SpawnerLocation(kit, area, doc);
            return id;
        }

        private static EntityDoc Describe(MiningKit kit, GameObject prefab, string id, out bool keepWithoutDrops)
        {
            keepWithoutDrops = false;
            var doc = new EntityDoc { ExtId = id };

            SpawnArea area = prefab.GetComponent<SpawnArea>();
            if (area != null)
            {
                keepWithoutDrops = true;
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Spawner));
                Destructible destructible = prefab.GetComponent<Destructible>();
                if (destructible != null) Toughness(doc, destructible.m_health, destructible.m_minToolTier);
                DropOnDestroyed dropOnDestroyed = prefab.GetComponent<DropOnDestroyed>();
                if (dropOnDestroyed != null) doc.Drops.AddRange(ValheimDrops.FromTable(dropOnDestroyed.m_dropWhenDestroyed));
                return doc;
            }

            Pickable pickable = prefab.GetComponent<Pickable>();
            if (pickable != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Pickable));
                string itemId = ValheimNames.PrefabId(pickable.m_itemPrefab);
                doc.Name = ValheimNames.Localize(pickable.m_overrideName) ??
                           ValheimNames.Localize(ItemMiner.Shared(pickable.m_itemPrefab)?.m_name);
                if (itemId != null) ValheimDrops.Add(doc.Drops, itemId, pickable.m_amount, pickable.m_amount, 1);
                doc.Drops.AddRange(ValheimDrops.FromTable(pickable.m_extraDrops));
                if (pickable.m_respawnTimeMinutes > 0) doc.RespawnDelayMinutes = (int)Math.Round(pickable.m_respawnTimeMinutes);
                return doc;
            }

            PickableItem pickableItem = prefab.GetComponent<PickableItem>();
            if (pickableItem != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.PickableItem));
                PickableItemDrops(pickableItem, doc);
                if (doc.Drops.Count == 1)
                    doc.Name = ValheimNames.Localize(ItemMiner.Shared(ObjectDB.instance.GetItemPrefab(doc.Drops[0].Target.ExtId))?.m_name);
                return doc;
            }

            Container container = prefab.GetComponent<Container>();
            if (container != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Treasure));
                doc.Name = ValheimNames.Localize(container.m_name);
                doc.Drops.AddRange(ValheimDrops.FromTable(container.m_defaultItems));
                return doc;
            }

            LootSpawner lootSpawner = prefab.GetComponent<LootSpawner>();
            if (lootSpawner != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.LootSpawner));
                doc.Drops.AddRange(ValheimDrops.FromTable(lootSpawner.m_items));
                if (lootSpawner.m_respawnTimeMinuts > 0) doc.RespawnDelayMinutes = (int)Math.Round(lootSpawner.m_respawnTimeMinuts);
                doc.Summary = new SpawnConditions(kit.World)
                    .Time(lootSpawner.m_spawnAtDay, lootSpawner.m_spawnAtNight)
                    .Add(lootSpawner.m_spawnWhenEnemiesCleared ? "reaparece quando os inimigos por perto morrem" : null)
                    .Text;
                return doc;
            }

            Fish fish = prefab.GetComponent<Fish>();
            if (fish != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Fish));
                doc.Name = ValheimNames.Localize(fish.m_name);
                doc.IconImage = kit.Images.Collect(ItemMiner.Icon(prefab));
                string itemId = ValheimNames.PrefabId(fish.m_pickupItem);
                if (itemId != null) ValheimDrops.Add(doc.Drops, itemId, fish.m_pickupItemStackSize, fish.m_pickupItemStackSize, 1);
                doc.Drops.AddRange(ValheimDrops.FromTable(fish.m_extraDrops));
                doc.Attributes["min_depth"] = fish.m_minDepth;
                doc.Attributes["max_depth"] = fish.m_maxDepth;
                FishBaits(fish, doc);
                return doc;
            }

            TreeBase tree = prefab.GetComponent<TreeBase>();
            if (tree != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Tree));
                Toughness(doc, tree.m_health, tree.m_minToolTier);
                doc.Drops.AddRange(ValheimDrops.FromTable(tree.m_dropWhenDestroyed));
                return doc;
            }

            TreeLog log = prefab.GetComponent<TreeLog>();
            if (log != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Tree));
                Toughness(doc, log.m_health, log.m_minToolTier);
                doc.Drops.AddRange(ValheimDrops.FromTable(log.m_dropWhenDestroyed));
                return doc;
            }

            MineRock rock = prefab.GetComponent<MineRock>();
            if (rock != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Rock));
                doc.Name = ValheimNames.Localize(rock.m_name);
                Toughness(doc, rock.m_health, rock.m_minToolTier);
                doc.Drops.AddRange(ValheimDrops.FromTable(rock.m_dropItems));
                return doc;
            }

            MineRock5 bigRock = prefab.GetComponent<MineRock5>();
            if (bigRock != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Rock));
                doc.Name = ValheimNames.Localize(bigRock.m_name);
                Toughness(doc, bigRock.m_health, bigRock.m_minToolTier);
                doc.Drops.AddRange(ValheimDrops.FromTable(bigRock.m_dropItems));
                return doc;
            }

            DropOnDestroyed dropsOnDestroyed = prefab.GetComponent<DropOnDestroyed>();
            if (dropsOnDestroyed != null)
            {
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Destructible));
                Destructible destructible = prefab.GetComponent<Destructible>();
                if (destructible != null) Toughness(doc, destructible.m_health, destructible.m_minToolTier);
                doc.Drops.AddRange(ValheimDrops.FromTable(dropsOnDestroyed.m_dropWhenDestroyed));
                return doc;
            }

            return null;
        }

        /// <summary>Item fixo com pilha, ou um sorteado entre m_randomItemPrefabs (chance igual para cada).</summary>
        private static void PickableItemDrops(PickableItem pickable, EntityDoc doc)
        {
            PickableItem.RandomItem[] random = pickable.m_randomItemPrefabs;
            if (random != null && random.Length > 0)
            {
                double chance = 1.0 / random.Length;
                foreach (PickableItem.RandomItem option in random)
                {
                    string itemId = ValheimNames.PrefabId(option.m_itemPrefab);
                    if (itemId != null) ValheimDrops.Add(doc.Drops, itemId, option.m_stackMin, option.m_stackMax, chance);
                }
                return;
            }
            string fixedId = ValheimNames.PrefabId(pickable.m_itemPrefab);
            if (fixedId != null) ValheimDrops.Add(doc.Drops, fixedId, pickable.m_stack, pickable.m_stack, 1);
        }

        private static void FishBaits(Fish fish, EntityDoc doc)
        {
            if (fish.m_baits == null || fish.m_baits.Count == 0) return;
            var baits = new List<string>();
            foreach (Fish.BaitSetting bait in fish.m_baits)
            {
                string baitId = ValheimNames.PrefabId(bait?.m_bait);
                if (baitId == null) continue;
                doc.Requirements.Add(new Requirement(Reference.Item(baitId), 1));
                baits.Add(ValheimNames.DisplayName(ItemMiner.Shared(bait.m_bait.gameObject)?.m_name, baitId) + " " + ValheimWorld.Percent(bait.m_chance));
            }
            if (baits.Count > 0) doc.Summary = "Isca (qualquer uma): " + string.Join(", ", baits) + ".";
        }

        /// <summary>
        /// Local "spawner_&lt;ninho&gt;" com um ponto por criatura que o gerador solta: chance pelo peso, níveis,
        /// intervalo e limites. O ninho em si aparece no mundo pela vegetação ou dentro de locais.
        /// </summary>
        private static void SpawnerLocation(MiningKit kit, SpawnArea area, EntityDoc spawner)
        {
            string locationId = "spawner_" + spawner.ExtId;
            if (kit.Dataset.Contains("locations", locationId) || area.m_prefabs == null) return;
            kit.Dataset.Add(new LocationDoc
            {
                ExtId = locationId,
                Name = spawner.Name,
                LocationType = "spawner",
                Summary = "Solta uma criatura a cada " + Mathf.RoundToInt(area.m_spawnIntervalSec) + " s, até " + area.m_maxNear +
                          " por perto e " + area.m_maxTotal + " no total.",
            });

            float totalWeight = 0f;
            foreach (SpawnArea.SpawnData data in area.m_prefabs) if (data?.m_prefab != null) totalWeight += Mathf.Max(0f, data.m_weight);

            foreach (SpawnArea.SpawnData data in area.m_prefabs)
            {
                string creatureId = ValheimNames.PrefabId(data?.m_prefab);
                if (creatureId == null) continue;
                var point = new SpawnPointDoc
                {
                    ExtId = locationId + "_" + creatureId,
                    Location = locationId,
                    RespawnMode = "respawn",
                    Summary = new SpawnConditions(kit.World).Levels(data.m_minLevel, data.m_maxLevel, area.m_levelupChance).Text,
                };
                double? chance = totalWeight > 0f ? Math.Round(Mathf.Max(0f, data.m_weight) / totalWeight, 4) : (double?)null;
                point.Occupants.Add(new Occupant(Reference.Entity(creatureId), chance >= 1 ? null : chance));
                kit.Dataset.Add(point);
            }
        }

        private static void Toughness(EntityDoc doc, float health, int minToolTier)
        {
            doc.Attributes["health"] = health;
            if (minToolTier > 0) doc.Attributes["min_tool_tier"] = minToolTier;
        }

        private static string HoverName(GameObject prefab)
        {
            HoverText hover = prefab.GetComponent<HoverText>();
            return hover != null ? ValheimNames.Localize(hover.m_text) : null;
        }
    }
}
