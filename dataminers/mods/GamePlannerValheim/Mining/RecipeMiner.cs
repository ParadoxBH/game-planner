using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Receitas de ObjectDB.m_recipes. Cada nível de qualidade vira uma receita própria ("_q2", "_q3"...):
    /// no Valheim o upgrade consome o item do nível anterior mais m_amountPerLevel de cada recurso e pede a
    /// bancada um nível acima.
    ///
    /// O ídolo (Requirement.m_upgraderResource, ex.: Upgrader2Weapon) não é ingrediente da receita: é o que o Altar
    /// Ancestral (CraftingStation.m_upgrader) gasta para subir o item mais um nível, sem limite, com a chance de
    /// SharedData.m_upgradeChance. Como o altar vale para qualquer item que use o mesmo ídolo, cada ídolo vira uma
    /// categoria curinga (altar_Upgrader2Weapon) nos itens que o usam e uma receita no altar que entra e sai com essa
    /// categoria.
    /// </summary>
    internal static class RecipeMiner
    {
        private sealed class AltarGroup
        {
            public string IdolId;
            public string IdolName;
            public int Amount;
            public readonly List<string> Items = new List<string>();
            /// <summary>Chance de sucesso → quantos itens do grupo a usam; a receita leva a mais comum.</summary>
            public readonly Dictionary<float, int> Chances = new Dictionary<float, int>();
        }

        public static IEnumerator Mine(MiningKit kit)
        {
            var altar = new Dictionary<string, AltarGroup>();
            foreach (Recipe recipe in ObjectDB.instance.m_recipes)
            {
                if (recipe == null || recipe.m_item == null || !recipe.m_enabled) continue;

                string itemId = ValheimNames.PrefabId(recipe.m_item);
                ItemDrop.ItemData.SharedData shared = recipe.m_item.m_itemData?.m_shared;
                string itemName = ValheimNames.DisplayName(shared?.m_name, itemId);
                string stationId = PieceMiner.EnsureStation(kit, recipe.m_craftingStation);
                string baseId = ExtId.Sanitize(recipe.name) ?? "Recipe_" + itemId;

                kit.Dataset.Add(Build(baseId, recipe, itemId, stationId, 1, null));
                int maxQuality = shared != null ? shared.m_maxQuality : 1;
                for (int quality = 2; quality <= maxQuality; quality++)
                    kit.Dataset.Add(Build(baseId + "_q" + quality, recipe, itemId, stationId, quality, itemName));

                Collect(altar, recipe, itemId, shared);
                if (kit.ShouldYield()) yield return null;
            }

            string altarId = PieceMiner.EnsureStation(kit, UpgraderStation());
            foreach (AltarGroup group in altar.Values)
            {
                AddAltar(kit, group, altarId);
                if (kit.ShouldYield()) yield return null;
            }
        }

        private static RecipeDoc Build(string id, Recipe recipe, string itemId, string stationId, int quality, string itemName)
        {
            var doc = new RecipeDoc { ExtId = id };
            if (quality > 1)
            {
                doc.Name = itemName + " (nível " + quality + ")";
                doc.Inputs.Add(new Requirement(Reference.Item(itemId), 1));
            }

            if (recipe.m_resources != null)
            {
                foreach (Piece.Requirement requirement in recipe.m_resources)
                {
                    // O ídolo é do altar, não da bancada: vai na receita curinga (AddAltar).
                    if (requirement == null || requirement.m_resItem == null || requirement.m_upgraderResource) continue;
                    int amount = requirement.GetAmount(quality);
                    if (amount > 0) doc.Inputs.Add(new Requirement(Reference.Item(ValheimNames.PrefabId(requirement.m_resItem)), amount));
                }
            }

            int outputAmount = quality > 1 ? 1 : System.Math.Max(1, recipe.m_amount);
            doc.Outputs.Add(new RecipeOutput(Reference.Item(itemId), outputAmount, quality > 1 ? quality : (int?)null));

            if (stationId != null)
            {
                doc.Stations.Add(stationId);
                // Nível 1 é a bancada recém-construída: serve qualquer uma, então fica sem nível.
                int level = recipe.GetRequiredStationLevel(quality);
                if (level > 1) doc.StationLevels[stationId] = level;
            }
            if (recipe.m_requireOnlyOneIngredient) doc.Summary = "Precisa de só um dos ingredientes.";
            return doc;
        }

        /// <summary>Guarda o item no grupo do ídolo que a receita dele marca como recurso do altar.</summary>
        private static void Collect(Dictionary<string, AltarGroup> altar, Recipe recipe, string itemId, ItemDrop.ItemData.SharedData shared)
        {
            if (recipe.m_resources == null) return;
            foreach (Piece.Requirement requirement in recipe.m_resources)
            {
                if (requirement == null || requirement.m_resItem == null || !requirement.m_upgraderResource) continue;
                string idolId = ValheimNames.PrefabId(requirement.m_resItem);
                if (idolId == null) continue;
                if (!altar.TryGetValue(idolId, out AltarGroup group))
                {
                    altar[idolId] = group = new AltarGroup
                    {
                        IdolId = idolId,
                        IdolName = ValheimNames.DisplayName(requirement.m_resItem.m_itemData?.m_shared?.m_name, idolId),
                        Amount = System.Math.Max(1, requirement.m_amount),
                    };
                }
                if (!group.Items.Contains(itemId)) group.Items.Add(itemId);
                if (shared != null)
                {
                    group.Chances.TryGetValue(shared.m_upgradeChance, out int count);
                    group.Chances[shared.m_upgradeChance] = count + 1;
                }
                return;
            }
        }

        /// <summary>A bancada que sobe item com ídolo: a CraftingStation com m_upgrader (o Altar Ancestral).</summary>
        private static CraftingStation UpgraderStation()
        {
            if (ZNetScene.instance == null) return null;
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                CraftingStation station = prefab != null ? prefab.GetComponent<CraftingStation>() : null;
                if (station != null && station.m_upgrader) return station;
            }
            return null;
        }

        /// <summary>
        /// Categoria curinga do ídolo nos itens que o usam (com a chance de cada um como atributo) e a receita do altar:
        /// entra um item da categoria, em qualquer nível, mais o ídolo; sai o mesmo item um nível acima, com a chance.
        /// </summary>
        private static void AddAltar(MiningKit kit, AltarGroup group, string altarId)
        {
            string categoryId = "altar_" + group.IdolId;
            kit.Dataset.Add(new CategoryDoc(categoryId, "Altar: " + group.IdolName, CategoryDoc.ForItem));

            var byId = new Dictionary<string, ItemDoc>();
            foreach (ItemDoc item in kit.Dataset.Items) byId[item.ExtId] = item;
            foreach (string itemId in group.Items)
            {
                if (!byId.TryGetValue(itemId, out ItemDoc item)) continue;
                if (!item.Categories.Contains(categoryId)) item.Categories.Add(categoryId);
                ItemDrop.ItemData.SharedData shared = ObjectDB.instance.GetItemPrefab(itemId)?.GetComponent<ItemDrop>()?.m_itemData?.m_shared;
                if (shared == null) continue;
                item.Attributes["upgrade_chance"] = System.Math.Round(shared.m_upgradeChance * 100.0, 2);
                if (shared.m_breakChance > 0) item.Attributes["upgrade_break_chance"] = System.Math.Round(shared.m_breakChance * 100.0, 2);
            }

            float chance = 0f;
            int most = -1;
            foreach (KeyValuePair<float, int> entry in group.Chances)
            {
                if (entry.Value > most) { most = entry.Value; chance = entry.Key; }
            }

            var category = new Reference(ContentKinds.Category, categoryId);
            var recipe = new RecipeDoc
            {
                ExtId = "altar_upgrade_" + group.IdolId,
                Name = "Altar: " + group.IdolName,
                Summary = "Sobe o item um nível, sem limite. Falhando, o nível cai e o item pode quebrar.",
            };
            recipe.Inputs.Add(new Requirement(category, 1));
            recipe.Inputs.Add(new Requirement(Reference.Item(group.IdolId), group.Amount));
            var output = new RecipeOutput(category, 1);
            if (chance > 0 && chance < 1) output.Chance = System.Math.Round(chance, 4);
            recipe.Outputs.Add(output);
            if (altarId != null) recipe.Stations.Add(altarId);
            kit.Dataset.Add(recipe);
        }
    }
}
