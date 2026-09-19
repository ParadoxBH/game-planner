using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>Itens de ObjectDB.m_items. Itens sem ícone são internos (ataques de criatura, mãos vazias) e ficam de fora.</summary>
    internal static class ItemMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            int skipped = 0;
            foreach (GameObject prefab in ObjectDB.instance.m_items)
            {
                ItemDrop.ItemData.SharedData shared = Shared(prefab);
                if (shared == null) continue;
                Sprite icon = Icon(shared);
                if (icon == null)
                {
                    skipped++;
                    continue;
                }

                string id = ValheimNames.PrefabId(prefab);
                var doc = new ItemDoc
                {
                    ExtId = id,
                    Name = ValheimNames.DisplayName(shared.m_name, id),
                    Description = ValheimNames.Localize(shared.m_description),
                    BaseSellPrice = shared.m_value > 0 ? shared.m_value : (double?)null,
                    IconImage = kit.Images.Collect(icon),
                };
                doc.Categories.Add(kit.Categories.ItemType(shared.m_itemType));
                FillAttributes(doc.Attributes, shared);
                kit.Dataset.Add(doc);

                if (kit.ShouldYield()) yield return null;
            }
            if (skipped > 0) kit.Dataset.Warn(skipped + " itens sem ícone ignorados (itens internos do jogo)");
        }

        public static ItemDrop.ItemData.SharedData Shared(GameObject prefab)
        {
            ItemDrop drop = prefab != null ? prefab.GetComponent<ItemDrop>() : null;
            return drop != null && drop.m_itemData != null ? drop.m_itemData.m_shared : null;
        }

        public static Sprite Icon(ItemDrop.ItemData.SharedData shared)
        {
            return shared != null && shared.m_icons != null && shared.m_icons.Length > 0 ? shared.m_icons[0] : null;
        }

        /// <summary>Ícone do item de um prefab (para usar em entidade que dropa ou dá esse item).</summary>
        public static Sprite Icon(GameObject itemPrefab) => Icon(Shared(itemPrefab));

        private static void FillAttributes(Dictionary<string, object> a, ItemDrop.ItemData.SharedData s)
        {
            a["weight"] = s.m_weight;
            a["max_stack"] = s.m_maxStackSize;
            a["max_quality"] = s.m_maxQuality;
            a["teleportable"] = s.m_teleportable;
            if (s.m_food > 0) a["food_health"] = s.m_food;
            if (s.m_foodStamina > 0) a["food_stamina"] = s.m_foodStamina;
            if (s.m_foodEitr > 0) a["food_eitr"] = s.m_foodEitr;
            if (s.m_foodBurnTime > 0) a["food_duration_seconds"] = s.m_foodBurnTime;
            if (s.m_foodRegen > 0) a["food_regen"] = s.m_foodRegen;

            bool armor = IsArmor(s.m_itemType);
            if (armor)
            {
                a["armor"] = s.m_armor;
                a["armor_per_level"] = s.m_armorPerLevel;
            }
            if (s.m_itemType == ItemDrop.ItemData.ItemType.Shield)
            {
                a["block_power"] = s.m_blockPower;
                a["block_power_per_level"] = s.m_blockPowerPerLevel;
            }
            if (s.m_movementModifier != 0) a["movement_modifier"] = s.m_movementModifier;
            if (s.m_useDurability)
            {
                a["durability"] = s.m_maxDurability;
                a["durability_per_level"] = s.m_durabilityPerLevel;
            }
            if (s.m_toolTier > 0) a["tool_tier"] = s.m_toolTier;

            float total = AddDamages(a, "damage_", s.m_damages);
            if (total > 0)
            {
                AddDamages(a, "damage_per_level_", s.m_damagesPerLevel);
                a["skill"] = ExtId.SnakeCase(s.m_skillType.ToString());
            }
            if (!string.IsNullOrEmpty(s.m_setName) && s.m_setSize > 0)
            {
                a["set"] = s.m_setName;
                a["set_size"] = s.m_setSize;
            }
        }

        private static bool IsArmor(ItemDrop.ItemData.ItemType type)
        {
            return type == ItemDrop.ItemData.ItemType.Helmet || type == ItemDrop.ItemData.ItemType.Chest ||
                   type == ItemDrop.ItemData.ItemType.Legs || type == ItemDrop.ItemData.ItemType.Shoulder ||
                   type == ItemDrop.ItemData.ItemType.Hands;
        }

        private static float AddDamages(Dictionary<string, object> a, string prefix, HitData.DamageTypes d)
        {
            float total = 0;
            total += Damage(a, prefix + "base", d.m_damage);
            total += Damage(a, prefix + "blunt", d.m_blunt);
            total += Damage(a, prefix + "slash", d.m_slash);
            total += Damage(a, prefix + "pierce", d.m_pierce);
            total += Damage(a, prefix + "chop", d.m_chop);
            total += Damage(a, prefix + "pickaxe", d.m_pickaxe);
            total += Damage(a, prefix + "fire", d.m_fire);
            total += Damage(a, prefix + "frost", d.m_frost);
            total += Damage(a, prefix + "lightning", d.m_lightning);
            total += Damage(a, prefix + "poison", d.m_poison);
            total += Damage(a, prefix + "spirit", d.m_spirit);
            return total;
        }

        private static float Damage(Dictionary<string, object> a, string key, float value)
        {
            if (value <= 0) return 0;
            a[key] = value;
            return value;
        }
    }
}
