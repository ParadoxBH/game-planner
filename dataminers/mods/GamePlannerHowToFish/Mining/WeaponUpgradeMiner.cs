using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Imaging;
using GamePlanner.Core.Model;
using UnityEngine;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// O que se compra para as armas na loja da ilha. Acessórios (miras, canos, laser, pente estendido) são
    /// itens com uma receita por arma, porque o preço muda de arma para arma. Munição (armas de fogo) e
    /// afiação (corpo a corpo) sobem a própria arma de nível: uma receita por nível, que consome a arma no
    /// nível anterior e devolve a mesma arma um nível acima.
    /// </summary>
    internal static class WeaponUpgradeMiner
    {
        /// <summary>Bancada da afiação. A entidade é cadastrada à mão no site; o jogo não a expõe.</summary>
        private const string Anvil = "anvil";

        private sealed class Offer
        {
            public string WeaponId;
            public int Cost;
        }

        private sealed class AttachmentData
        {
            public string Kind;
            public Attachment Model;
            public readonly List<Offer> Offers = new List<Offer>();
        }

        public static IEnumerator Mine(MiningKit kit)
        {
            var attachments = new Dictionary<AttachmentInfo, AttachmentData>();
            foreach (AttachmentInfo info in GameInfo.AllAttachments) Ensure(attachments, info, null);
            foreach (AttachmentInfo info in Resources.LoadAll<AttachmentInfo>("Attachments")) Ensure(attachments, info, null);

            foreach (KeyValuePair<Item, string> entry in kit.ItemIds)
            {
                if (entry.Key is Weapon weapon)
                {
                    CollectAttachments(attachments, weapon, entry.Value);
                    AddLevels(kit, entry.Value, AmmoLevels(weapon), "upgrade_ammo_", null);
                }
                else if (entry.Key is Melee melee)
                {
                    AddLevels(kit, entry.Value, SharpnessLevels(melee), "upgrade_sharpness_", Anvil);
                }
                if (kit.ShouldYield()) yield return null;
            }

            foreach (KeyValuePair<AttachmentInfo, AttachmentData> entry in attachments)
            {
                AddAttachment(kit, entry.Key, entry.Value);
                if (kit.ShouldYield()) yield return null;
            }
        }

        private static AttachmentData Ensure(Dictionary<AttachmentInfo, AttachmentData> all, AttachmentInfo info, string kind)
        {
            if (info == null) return null;
            if (!all.TryGetValue(info, out AttachmentData data)) all[info] = data = new AttachmentData();
            if (data.Kind == null) data.Kind = kind;
            return data;
        }

        private static void CollectAttachments(Dictionary<AttachmentInfo, AttachmentData> all, Weapon weapon, string weaponId)
        {
            Attachments attachments = weapon.Attachments;
            if (attachments == null) return;

            List<Sight> sights = HtfFields.Sights.Get(attachments);
            if (sights != null) foreach (Sight sight in sights) AddOffer(all, sight, "sight", weaponId);
            List<BarrelAttachment> barrels = HtfFields.Barrels.Get(attachments);
            if (barrels != null) foreach (BarrelAttachment barrel in barrels) AddOffer(all, barrel, "barrel", weaponId);
            AddOffer(all, HtfFields.LaserSight.Get(attachments), "laser", weaponId);

            AttachmentInfo magazine = HtfFields.ExtendedMagInfo.Get(attachments);
            AttachmentData data = Ensure(all, magazine, "magazine");
            data?.Offers.Add(new Offer { WeaponId = weaponId, Cost = HtfFields.ExtendedMagCost.Get(attachments) });
        }

        private static void AddOffer(Dictionary<AttachmentInfo, AttachmentData> all, Attachment attachment, string kind, string weaponId)
        {
            if (attachment == null || attachment.Info == null) return;
            AttachmentData data = Ensure(all, attachment.Info, kind);
            if (data.Model == null) data.Model = attachment;
            data.Offers.Add(new Offer { WeaponId = weaponId, Cost = attachment.Cost });
        }

        private static void AddAttachment(MiningKit kit, AttachmentInfo info, AttachmentData data)
        {
            string id = HtfNames.Id("attachment_", info);
            if (id == null) return;

            var doc = new ItemDoc
            {
                ExtId = id,
                Name = HtfNames.First(HtfNames.Text(HtfFields.AttachmentName.Get(info)), HtfFields.AttachmentRawName.Get(info), HtfNames.Humanize(info.name)),
                Description = HtfNames.Text(HtfFields.AttachmentDescription.Get(info)),
                IconImage = data.Model != null ? kit.Icons.Collect(id, Parts(data.Model.transform), Quaternion.Euler(0, 90, 0)) : null,
            };
            kit.Categories.Apply(doc, HtfCategories.Attachment, HtfCategories.Upgrade);
            if (data.Kind != null) doc.Attributes["attachment_type"] = data.Kind;
            doc.Attributes["compatible_weapons"] = data.Offers.Count;

            int min = int.MaxValue, max = 0;
            foreach (Offer offer in data.Offers)
            {
                if (offer.Cost > 0 && offer.Cost < min) min = offer.Cost;
                if (offer.Cost > max) max = offer.Cost;
            }
            if (max > 0) MiningKit.Price(doc, min);
            if (max > min && min != int.MaxValue) doc.Attributes["max_cost"] = max;
            kit.Dataset.Add(doc);

            foreach (Offer offer in data.Offers)
            {
                var recipe = new RecipeDoc
                {
                    ExtId = id + "_" + offer.WeaponId,
                    Name = doc.Name + " — " + kit.ItemName(offer.WeaponId),
                    Summary = "Comprado na loja de armas com a arma na mão.",
                };
                if (offer.Cost > 0) recipe.Inputs.Add(new Requirement(MiningKit.Money, offer.Cost));
                recipe.Inputs.Add(new Requirement(Reference.Item(offer.WeaponId), 1, notConsumed: true));
                recipe.Outputs.Add(new RecipeOutput(Reference.Item(id), 1));
                kit.Dataset.Add(recipe);
            }
        }

        /// <summary>Malhas do acessório com a posição relativa a ele, como aparece montado na arma.</summary>
        private static List<MeshPart> Parts(Transform root)
        {
            var parts = new List<MeshPart>();
            foreach (MeshFilter filter in root.GetComponentsInChildren<MeshFilter>(true))
            {
                MeshRenderer renderer = filter.GetComponent<MeshRenderer>();
                if (renderer == null || filter.sharedMesh == null) continue;
                parts.Add(new MeshPart(filter.sharedMesh, renderer.sharedMaterials, root.worldToLocalMatrix * filter.transform.localToWorldMatrix));
            }
            return parts;
        }

        private static List<KeyValuePair<int, int>> AmmoLevels(Weapon weapon)
        {
            var levels = new List<KeyValuePair<int, int>>();
            BulletUpgrade[] upgrades = weapon.Attachments != null ? HtfFields.BulletUpgrades.Get(weapon.Attachments) : null;
            if (upgrades != null) foreach (BulletUpgrade u in upgrades) levels.Add(new KeyValuePair<int, int>(u?.Damage ?? 0, u?.Cost ?? 0));
            return levels;
        }

        private static List<KeyValuePair<int, int>> SharpnessLevels(Melee melee)
        {
            var levels = new List<KeyValuePair<int, int>>();
            SharpnessUpgrade[] upgrades = HtfFields.SharpnessUpgrades.Get(melee);
            if (upgrades != null) foreach (SharpnessUpgrade u in upgrades) levels.Add(new KeyValuePair<int, int>(u?.Damage ?? 0, u?.Cost ?? 0));
            return levels;
        }

        /// <summary>
        /// levels[0] é o dano de fábrica; cada nível seguinte vira uma receita que sobe a arma de nível:
        /// entram a arma no nível anterior e o dinheiro, sai a mesma arma no nível novo. O dano fica no
        /// resumo, porque atributo é do item, e o item aqui é um só em todos os níveis.
        /// </summary>
        private static void AddLevels(MiningKit kit, string weaponId, List<KeyValuePair<int, int>> levels, string prefix,
            string station)
        {
            for (int level = 1; level < levels.Count; level++)
            {
                int damage = levels[level].Key, cost = levels[level].Value;
                var recipe = new RecipeDoc
                {
                    ExtId = prefix + weaponId + "_" + level,
                    Name = kit.ItemName(weaponId) + " +" + level,
                    Summary = "Dano " + levels[level - 1].Key + " -> " + damage + ".",
                };
                if (station != null) recipe.Stations.Add(station);
                recipe.Inputs.Add(new Requirement(Reference.Item(weaponId), 1, level: level - 1));
                if (cost > 0) recipe.Inputs.Add(new Requirement(MiningKit.Money, cost));
                recipe.Outputs.Add(new RecipeOutput(Reference.Item(weaponId), 1, level));
                kit.Dataset.Add(recipe);
            }
        }
    }
}
