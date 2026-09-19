using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Construções das ferramentas (martelo, enxada, cultivador...: todo item com m_buildPieces). Cada peça vira
    /// uma entidade e uma receita "build_&lt;peça&gt;" que produz a entidade, liberada pela ferramenta.
    /// </summary>
    internal static class PieceMiner
    {
        private static readonly Dictionary<Piece.PieceCategory, string> CategoryNames = new Dictionary<Piece.PieceCategory, string>
        {
            { Piece.PieceCategory.Misc, "Construções: diversos" },
            { Piece.PieceCategory.Crafting, "Construções: produção" },
            { Piece.PieceCategory.BuildingWorkbench, "Construções: bancada" },
            { Piece.PieceCategory.BuildingStonecutter, "Construções: cortador de pedra" },
            { Piece.PieceCategory.Furniture, "Construções: móveis" },
            { Piece.PieceCategory.Feasts, "Banquetes" },
            { Piece.PieceCategory.Food, "Comidas" },
            { Piece.PieceCategory.Meads, "Hidroméis" },
        };

        public static IEnumerator Mine(MiningKit kit)
        {
            foreach (GameObject toolPrefab in ObjectDB.instance.m_items)
            {
                ItemDrop.ItemData.SharedData tool = ItemMiner.Shared(toolPrefab);
                if (tool == null || tool.m_buildPieces == null || tool.m_buildPieces.m_pieces == null) continue;
                string toolId = ValheimNames.PrefabId(toolPrefab);

                foreach (GameObject piecePrefab in tool.m_buildPieces.m_pieces)
                {
                    Piece piece = piecePrefab != null ? piecePrefab.GetComponent<Piece>() : null;
                    if (piece == null || !piece.m_enabled) continue;
                    string pieceId = ValheimNames.PrefabId(piecePrefab);

                    if (!kit.Dataset.Contains("entities", pieceId)) kit.Dataset.Add(Entity(kit, piece, pieceId));
                    string recipeId = "build_" + pieceId;
                    if (!kit.Dataset.Contains("recipes", recipeId)) kit.Dataset.Add(BuildRecipe(kit, piece, pieceId, recipeId, toolId));

                    if (kit.ShouldYield()) yield return null;
                }
            }
        }

        /// <summary>
        /// Id da bancada, cadastrando uma entidade mínima se nenhuma construção a trouxe (receitas apontam para
        /// bancadas em Recipe.m_craftingStation).
        /// </summary>
        public static string EnsureStation(MiningKit kit, CraftingStation station)
        {
            if (station == null) return null;
            string id = ValheimNames.PrefabId(station);
            if (id != null && !kit.Dataset.Contains("entities", id))
            {
                var doc = new EntityDoc
                {
                    ExtId = id,
                    Name = ValheimNames.DisplayName(station.m_name, id),
                    IconImage = kit.Images.Collect(station.m_icon),
                };
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.CraftingStation));
                kit.Dataset.Add(doc);
            }
            return id;
        }

        private static EntityDoc Entity(MiningKit kit, Piece piece, string pieceId)
        {
            var doc = new EntityDoc
            {
                ExtId = pieceId,
                Name = ValheimNames.DisplayName(piece.m_name, pieceId),
                Description = ValheimNames.Localize(piece.m_description),
                IconImage = kit.Images.Collect(piece.m_icon),
            };
            doc.Categories.Add(kit.Categories.Entity(ValheimCategories.Piece));
            CategoryNames.TryGetValue(piece.m_category, out string label);
            doc.Categories.Add(kit.Categories.PieceCategory(piece.m_category, label));
            if (piece.GetComponent<CraftingStation>() != null)
                doc.Categories.Add(kit.Categories.Entity(ValheimCategories.CraftingStation));
            // Construções que produzem sozinhas: colmeia (mel) e coletor de seiva.
            Beehive beehive = piece.GetComponent<Beehive>();
            if (beehive != null && beehive.m_honeyItem != null)
            {
                ValheimDrops.Add(doc.Drops, ValheimNames.PrefabId(beehive.m_honeyItem), 1, beehive.m_maxHoney, 1);
                doc.Attributes["seconds_per_unit"] = beehive.m_secPerUnit;
                doc.Summary = "Produz 1 a cada " + Mathf.RoundToInt(beehive.m_secPerUnit) + " s, até " + beehive.m_maxHoney +
                              (beehive.m_biome != Heightmap.Biome.None ? ". Biomas: " + ValheimWorld.BiomeNames(beehive.m_biome) : "") + ".";
            }
            SapCollector sap = piece.GetComponent<SapCollector>();
            if (sap != null && sap.m_spawnItem != null)
            {
                ValheimDrops.Add(doc.Drops, ValheimNames.PrefabId(sap.m_spawnItem), 1, sap.m_maxLevel, 1);
                doc.Attributes["seconds_per_unit"] = sap.m_secPerUnit;
                doc.Summary = "Produz 1 a cada " + Mathf.RoundToInt(sap.m_secPerUnit) + " s, até " + sap.m_maxLevel + ".";
            }
            if (piece.m_comfort > 0)
            {
                doc.Attributes["comfort"] = piece.m_comfort;
                doc.Attributes["comfort_group"] = piece.m_comfortGroup.ToString();
            }
            return doc;
        }

        private static RecipeDoc BuildRecipe(MiningKit kit, Piece piece, string pieceId, string recipeId, string toolId)
        {
            var recipe = new RecipeDoc { ExtId = recipeId };
            if (piece.m_resources != null)
            {
                foreach (Piece.Requirement requirement in piece.m_resources)
                {
                    if (requirement == null || requirement.m_resItem == null || requirement.m_amount <= 0) continue;
                    recipe.Inputs.Add(new Requirement(Reference.Item(ValheimNames.PrefabId(requirement.m_resItem)), requirement.m_amount));
                }
            }
            recipe.Outputs.Add(new RecipeOutput(Reference.Entity(pieceId), 1));
            string stationId = EnsureStation(kit, piece.m_craftingStation);
            if (stationId != null) recipe.Stations.Add(stationId);
            if (toolId != null) recipe.Unlock.Add(new RecipeUnlock("tool", Reference.Item(toolId)));
            return recipe;
        }
    }
}
