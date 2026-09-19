using System.Collections;
using System.Globalization;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Receitas de ObjectDB.m_recipes. Cada nível de qualidade vira uma receita própria ("_q2", "_q3"...):
    /// no Valheim o upgrade consome o item do nível anterior mais m_amountPerLevel de cada recurso e pede a
    /// bancada um nível acima.
    /// </summary>
    internal static class RecipeMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
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
                    if (requirement == null || requirement.m_resItem == null) continue;
                    int amount = requirement.GetAmount(quality);
                    if (amount > 0) doc.Inputs.Add(new Requirement(Reference.Item(ValheimNames.PrefabId(requirement.m_resItem)), amount));
                }
            }

            int outputAmount = quality > 1 ? 1 : System.Math.Max(1, recipe.m_amount);
            doc.Outputs.Add(new RecipeOutput(Reference.Item(itemId), outputAmount, quality > 1 ? quality : (int?)null));

            if (stationId != null)
            {
                doc.Stations.Add(stationId);
                doc.Unlock.Add(new RecipeUnlock("station_level", null,
                    recipe.GetRequiredStationLevel(quality).ToString(CultureInfo.InvariantCulture)));
            }
            if (recipe.m_requireOnlyOneIngredient) doc.Summary = "Precisa de só um dos ingredientes.";
            return doc;
        }
    }
}
