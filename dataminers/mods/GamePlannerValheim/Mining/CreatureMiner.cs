using System.Collections;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>Criaturas de ZNetScene (tudo com Character, menos o jogador). Ícone: o troféu que ela dropa.</summary>
    internal static class CreatureMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                Character character = prefab != null ? prefab.GetComponent<Character>() : null;
                if (character == null || character is Player) continue;

                string id = ValheimNames.PrefabId(prefab);
                CharacterDrop drops = prefab.GetComponent<CharacterDrop>();
                var doc = new EntityDoc
                {
                    ExtId = id,
                    Name = ValheimNames.DisplayName(character.m_name, id),
                    IconImage = kit.Images.Collect(TrophyIcon(drops)),
                };
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Creature));
                if (character.m_boss) doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Boss));

                doc.Attributes["health"] = character.m_health;
                doc.Attributes["faction"] = ExtId.SnakeCase(character.m_faction.ToString());
                if (!string.IsNullOrEmpty(character.m_group)) doc.Attributes["group"] = character.m_group;
                doc.Drops.AddRange(ValheimDrops.FromCharacter(drops));

                kit.Dataset.Add(doc);
                if (kit.ShouldYield()) yield return null;
            }
        }

        private static Sprite TrophyIcon(CharacterDrop drops)
        {
            if (drops == null || drops.m_drops == null) return null;
            foreach (CharacterDrop.Drop drop in drops.m_drops)
            {
                ItemDrop.ItemData.SharedData shared = ItemMiner.Shared(drop?.m_prefab);
                if (shared != null && shared.m_itemType == ItemDrop.ItemData.ItemType.Trophy) return ItemMiner.Icon(shared);
            }
            return null;
        }
    }
}
