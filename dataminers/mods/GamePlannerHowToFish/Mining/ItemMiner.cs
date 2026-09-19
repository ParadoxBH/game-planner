using System;
using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// Todo prefab em Resources/Items, o mesmo conjunto que o jogo indexa em GameInfo: peixes e criaturas
    /// (inclusive chefes), armas, varas, ferramentas, explosivos e itens soltos. Criatura com malha "drip"
    /// ganha a variante rara, e item com SkinPreset ganha um item por skin (sorteadas no caça-níquel).
    /// </summary>
    internal static class ItemMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            Item[] items = Resources.LoadAll<Item>("Items");
            Array.Sort(items, (a, b) => a.ID.CompareTo(b.ID));

            // Ids e nomes antes de tudo: variantes e skins citam o item base, e o material de paleta sai de qualquer item.
            foreach (Item item in items)
            {
                string id = HtfNames.Id(item);
                if (id == null || kit.ItemIds.ContainsValue(id)) continue;
                kit.ItemIds[item] = id;
                kit.ItemNames[id] = HtfNames.Text(HtfFields.ItemName.Get(item)) ?? HtfNames.Humanize(id);
            }

            foreach (Item item in items)
            {
                string id = kit.ItemId(item);
                if (id == null) continue;

                ItemDoc doc = Build(kit, item, id);
                kit.Dataset.Add(doc);
                if (kit.ShouldYield()) yield return null;

                if (item is Creature creature)
                {
                    AddDrip(kit, creature, doc);
                    if (kit.ShouldYield()) yield return null;
                }

                foreach (object _ in AddSkins(kit, item, id))
                    if (kit.ShouldYield()) yield return null;
            }
        }

        private static ItemDoc Build(MiningKit kit, Item item, string id)
        {
            var doc = new ItemDoc
            {
                ExtId = id,
                Name = kit.ItemName(id),
                IconImage = kit.MeshIcon(id, HtfFields.ItemMesh.Get(item), item.InventoryMeshRot, item),
            };
            MiningKit.Price(doc, item.Cost, item.DefaultWorth);
            kit.Categories.Apply(doc, Kind(item));

            Dictionary<string, object> a = doc.Attributes;
            a["game_id"] = (int)item.ID;
            float weight = HtfFields.ItemWeight.Get(item);
            if (weight > 0) a["weight_kg"] = weight;
            if (item.IsQuestItem)
            {
                a["quest_item"] = true;
                kit.Categories.Apply(doc, HtfCategories.QuestItem);
            }

            switch (item)
            {
                case Creature creature:
                    FillCreature(kit, doc, creature);
                    break;
                case Weapon weapon:
                    FillWeapon(a, weapon);
                    break;
                case Melee melee:
                    SharpnessUpgrade[] sharpness = HtfFields.SharpnessUpgrades.Get(melee);
                    if (sharpness != null && sharpness.Length > 0 && sharpness[0] != null) a["damage"] = sharpness[0].Damage;
                    if (sharpness != null && sharpness.Length > 1) a["sharpness_levels"] = sharpness.Length - 1;
                    float range = HtfFields.MeleeRange.Get(melee);
                    if (range > 0) a["range"] = range;
                    break;
                case FishingRod rod:
                    float minLine = HtfFields.RodMinLine.Get(rod), maxLine = HtfFields.RodMaxLine.Get(rod);
                    if (minLine > 0) a["line_min_length"] = minLine;
                    if (maxLine > 0) a["line_max_length"] = maxLine;
                    break;
                case Explosive explosive:
                    ExplosionInfo explosion = HtfFields.Explosion.Get(explosive);
                    if (explosion != null)
                    {
                        a["explosion_damage"] = explosion.Damage;
                        a["explosion_radius"] = explosion.DamageRadius;
                    }
                    break;
            }
            return doc;
        }

        /// <summary>Categoria principal pelo tipo do componente. Tool vem depois das subclasses (arma, corpo a corpo, vara).</summary>
        private static string Kind(Item item)
        {
            switch (item)
            {
                case Fish _: return HtfCategories.Fish;
                case Creature _: return HtfCategories.Creature;
                case Weapon _: return HtfCategories.Firearm;
                case Melee _: return HtfCategories.Melee;
                case FishingRod _: return HtfCategories.FishingRod;
                case Tool _: return HtfCategories.Tool;
                case Explosive _: return HtfCategories.Explosive;
                default: return HtfCategories.Misc;
            }
        }

        private static void FillCreature(MiningKit kit, ItemDoc doc, Creature creature)
        {
            Dictionary<string, object> a = doc.Attributes;
            int hp = HtfFields.CreatureMaxHp.Get(creature);
            if (hp > 0) a["max_hp"] = hp;
            a["restores_fullness"] = creature.FullnessToRestore;
            a["restores_hp"] = creature.HpToRestore;
            a["in_journal"] = !creature.ExcludeFromJournal;
            a["has_drip"] = HtfFields.CreatureDripMesh.Get(creature) != null;
            if (creature.IsEndangered)
            {
                a["endangered"] = true;
                doc.Summary = "Espécie ameaçada: abater dá +25% de pontuação.";
            }

            if (creature.BossType == BossType.None) return;
            a["boss_type"] = ExtId.SnakeCase(creature.BossType.ToString());
            a["boss_time_seconds"] = creature.BossTimeInSeconds;
            a["boss_hp_multiplier"] = creature.BossHpMultiplier;
            kit.Categories.Apply(doc, creature.BossType == BossType.Boss ? HtfCategories.Boss : HtfCategories.MiniBoss);
        }

        private static void FillWeapon(Dictionary<string, object> a, Weapon weapon)
        {
            WeaponInfo info = HtfFields.WeaponInfo.Get(weapon);
            if (info != null)
            {
                if (info.ProjectileDamage > 0) a["projectile_damage"] = info.ProjectileDamage;
                if (info.ProjectileForce > 0) a["projectile_force"] = info.ProjectileForce;
            }
            float interval = HtfFields.WeaponTimeBetweenShots.Get(weapon);
            if (interval > 0)
            {
                a["time_between_shots"] = interval;
                a["shots_per_second"] = Math.Round(1.0 / interval, 2);
            }
            a["full_auto"] = HtfFields.WeaponFullAuto.Get(weapon);
            a["can_aim"] = HtfFields.WeaponCanAds.Get(weapon);
            int pellets = HtfFields.WeaponProjectilesPerShot.Get(weapon);
            if (pellets > 1) a["projectiles_per_shot"] = pellets;
            float spread = HtfFields.WeaponSpread.Get(weapon);
            if (spread > 0) a["spread"] = spread;

            Attachments attachments = weapon.Attachments;
            if (attachments == null) return;
            BulletUpgrade[] bullets = HtfFields.BulletUpgrades.Get(attachments);
            if (bullets != null && bullets.Length > 0 && bullets[0] != null) a["damage"] = bullets[0].Damage;
            if (bullets != null && bullets.Length > 1) a["ammo_levels"] = bullets.Length - 1;
            int mag = HtfFields.DefaultAmmoPerMag.Get(attachments), extended = HtfFields.ExtendedAmmoPerMag.Get(attachments);
            if (mag > 0) a["ammo_per_mag"] = mag;
            if (extended > 0) a["extended_ammo_per_mag"] = extended;
        }

        /// <summary>Versão rara com a malha "drip": variante do item, sem preço próprio.</summary>
        private static void AddDrip(MiningKit kit, Creature creature, ItemDoc baseDoc)
        {
            Mesh drip = HtfFields.CreatureDripMesh.Get(creature);
            if (drip == null) return;

            string label = HtfNames.Text(SafeDripLabel()) ?? "Drip";
            string id = baseDoc.ExtId + "_drip";
            var doc = new ItemDoc
            {
                ExtId = id,
                Name = label + " " + baseDoc.Name,
                Summary = "Versão rara (drip) de " + baseDoc.Name + ".",
                VariantOf = baseDoc.ExtId,
                IconImage = kit.MeshIcon(id, drip, creature.InventoryMeshRot, creature),
            };
            doc.Categories.AddRange(baseDoc.Categories);
            kit.Categories.Apply(doc, HtfCategories.Drip);
            doc.Attributes["drip"] = true;
            kit.Dataset.Add(doc);
        }

        private static UnityEngine.Localization.LocalizedString SafeDripLabel()
        {
            try
            {
                return LocalizationManager.DripLocalized;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>
        /// Um item por skin da SkinPreset, menos a padrão (que é o próprio item). Devolve um passo por skin para o
        /// chamador decidir o yield, já que cada uma renderiza um ícone.
        /// </summary>
        private static IEnumerable<object> AddSkins(MiningKit kit, Item item, string itemId)
        {
            SkinPreset preset = item.SkinPreset;
            if (preset == null || preset.Skins == null || preset.Skins.Count < 2) yield break;

            var used = new HashSet<string>();
            Mesh mesh = HtfFields.ItemMesh.Get(item);
            for (int i = 0; i < preset.Skins.Count; i++)
            {
                ItemSkin skin = preset.Skins[i];
                if (skin.Rarity == Rarity.Default) continue;

                ItemDoc doc = SkinDoc(kit, itemId, skin, i, used);
                ItemSkin captured = skin;
                doc.IconImage = kit.MeshIcon(doc.ExtId, mesh, item.InventoryMeshRot, item,
                    renderer => ShaderManager.ApplyItemSkin(captured, renderer));
                kit.Dataset.Add(doc);
                yield return null;
            }
        }

        /// <summary>Documento de skin, compartilhado com as skins do barco.</summary>
        public static ItemDoc SkinDoc(MiningKit kit, string ownerId, ItemSkin skin, int index, HashSet<string> used)
        {
            string skinName = HtfNames.First(skin.Name, "Skin " + index);
            string id = ExtId.Sanitize("skin_" + ownerId + "_" + (ExtId.Sanitize(skinName.Replace(' ', '_')) ?? index.ToString()));
            if (!used.Add(id)) id = ExtId.Sanitize(id + "_" + index);

            var doc = new ItemDoc
            {
                ExtId = id,
                Name = kit.ItemName(ownerId) + " — " + skinName,
                Summary = "Skin sorteada no caça-níquel.",
                RarityCode = ExtId.SnakeCase(skin.Rarity.ToString()),
                VariantOf = ownerId,
            };
            kit.Categories.Apply(doc, HtfCategories.Skin, HtfCategories.Unlockable);
            doc.Attributes["rarity"] = doc.RarityCode;
            doc.Attributes["skin_index"] = index;
            if (skin.IsRainbowSkin) doc.Attributes["rainbow"] = true;
            return doc;
        }
    }
}
