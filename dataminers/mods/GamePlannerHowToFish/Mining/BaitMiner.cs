using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using GamePlanner.Core.Model;
using UnityEngine;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// Iscas (BaitInfo de Resources/Baits mais as padrão que o GameInfo conhece) como itens, e uma receita
    /// "Pescar com ..." por isca: as saídas são os peixes da tabela de pesos da isca, com a chance de cada um.
    /// </summary>
    internal static class BaitMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            var baits = new List<BaitInfo>();
            foreach (BaitInfo bait in GameInfo.AllBaits)
                if (bait != null && !baits.Contains(bait)) baits.Add(bait);
            foreach (BaitInfo bait in Resources.LoadAll<BaitInfo>("Baits"))
                if (bait != null && !baits.Contains(bait)) baits.Add(bait);

            var inShop = new HashSet<BaitInfo>(GameInfo.AllBaits);
            foreach (BaitInfo bait in baits)
            {
                string id = Id(bait);
                if (id == null) continue;

                var doc = new ItemDoc
                {
                    ExtId = id,
                    Name = HtfNames.First(HtfNames.Text(HtfFields.BaitName.Get(bait)), HtfFields.BaitRawName.Get(bait), HtfNames.Humanize(bait.name)),
                    Description = HtfNames.Text(HtfFields.BaitDescription.Get(bait)),
                    IconImage = kit.MeshIcon(id, bait.Mesh, bait.InventoryMeshRot),
                };
                MiningKit.Price(doc, bait.Cost);
                kit.Categories.Apply(doc, HtfCategories.Bait);
                doc.Attributes["lost_chance_percent"] = bait.LostOnBaitChance;
                doc.Attributes["catch_time_min"] = bait.CatchTimeMinMax.x;
                doc.Attributes["catch_time_max"] = bait.CatchTimeMinMax.y;
                doc.Attributes["require_reeling"] = bait.RequireReelingToCatch;
                if (!inShop.Contains(bait)) doc.Attributes["default_bait"] = true;
                kit.Dataset.Add(doc);

                RecipeDoc fishing = FishingRecipe(kit, bait, doc);
                if (fishing != null) kit.Dataset.Add(fishing);

                if (kit.ShouldYield()) yield return null;
            }
        }

        public static string Id(BaitInfo bait) => HtfNames.Id("bait_", bait);

        /// <summary>A isca não é consumida a cada fisgada: perde-se com LostOnBaitChance.</summary>
        private static RecipeDoc FishingRecipe(MiningKit kit, BaitInfo bait, ItemDoc baitDoc)
        {
            List<ItemInfoWeight> weights = bait.ItemWeights;
            if (weights == null || weights.Count == 0) return null;

            float total = 0;
            var outputs = new Dictionary<string, float>();
            foreach (ItemInfoWeight entry in weights)
            {
                string fishId = kit.ItemId(entry?.Fishable != null ? entry.Fishable.ItemToSpawn : null);
                if (fishId == null || entry.Weight <= 0) continue;
                outputs[fishId] = (outputs.TryGetValue(fishId, out float sum) ? sum : 0) + entry.Weight;
                total += entry.Weight;
            }
            if (outputs.Count == 0) return null;

            var recipe = new RecipeDoc
            {
                ExtId = "fishing_" + baitDoc.ExtId,
                Name = "Pescar com " + baitDoc.Name,
                Summary = bait.LostOnBaitChance > 0
                    ? "Perde a isca em " + bait.LostOnBaitChance.ToString("0.#", CultureInfo.InvariantCulture) + "% das fisgadas."
                    : "A isca não se perde.",
            };
            recipe.Inputs.Add(new Requirement(Reference.Item(baitDoc.ExtId), 1, notConsumed: true));
            foreach (KeyValuePair<string, float> output in outputs)
                recipe.Outputs.Add(new RecipeOutput(Reference.Item(output.Key), 1) { Chance = System.Math.Round(output.Value / total, 4) });
            return recipe;
        }
    }
}
