using System.Collections.Generic;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Categorias usadas pelos mineradores. Cada uma entra no dataset na primeira vez que alguém a usa, então
    /// só vão para a API as que têm conteúdo.
    /// </summary>
    internal sealed class ValheimCategories
    {
        public const string Creature = "creature";
        public const string Boss = "boss";
        public const string Piece = "piece";
        public const string CraftingStation = "crafting_station";
        public const string Pickable = "pickable";
        public const string Tree = "tree";
        public const string Rock = "rock";
        public const string Destructible = "destructible";
        public const string Treasure = "treasure";
        public const string PickableItem = "pickable_item";
        public const string LootSpawner = "loot_spawner";
        public const string Fish = "fish";
        public const string Spawner = "spawner";

        private static readonly Dictionary<string, string> Names = new Dictionary<string, string>
        {
            { Treasure, "Tesouros" },
            { PickableItem, "Itens no chão" },
            { LootSpawner, "Pontos de saque" },
            { Fish, "Peixes" },
            { Spawner, "Geradores de criaturas" },
            { Creature, "Criaturas" },
            { Boss, "Chefes" },
            { Piece, "Construções" },
            { CraftingStation, "Bancadas" },
            { Pickable, "Coletáveis" },
            { Tree, "Árvores" },
            { Rock, "Rochas e minérios" },
            { Destructible, "Destrutíveis" },
        };

        private static readonly Dictionary<string, string> ItemTypeNames = new Dictionary<string, string>
        {
            { "Material", "Materiais" },
            { "Consumable", "Consumíveis" },
            { "OneHandedWeapon", "Armas de uma mão" },
            { "Bow", "Arcos" },
            { "Shield", "Escudos" },
            { "Helmet", "Capacetes" },
            { "Chest", "Peitorais" },
            { "Ammo", "Munições" },
            { "Customization", "Customização" },
            { "Legs", "Calças" },
            { "Hands", "Luvas" },
            { "Trophy", "Troféus" },
            { "TwoHandedWeapon", "Armas de duas mãos" },
            { "Torch", "Tochas" },
            { "Misc", "Diversos" },
            { "Shoulder", "Capas" },
            { "Utility", "Utilitários" },
            { "Tool", "Ferramentas" },
            { "Attach_Atgeir", "Atgeirs" },
            { "Fish", "Peixes" },
            { "TwoHandedWeaponLeft", "Armas de duas mãos (esquerda)" },
            { "AmmoNonEquipable", "Munições não equipáveis" },
            { "Trinket", "Amuletos" },
        };

        private readonly MinedDataset _dataset;

        public ValheimCategories(MinedDataset dataset) => _dataset = dataset;

        /// <summary>Id da categoria de entidade, registrando-a no dataset.</summary>
        public string Entity(string code) => Ensure(code, Names.TryGetValue(code, out string name) ? name : code, CategoryDoc.ForEntity);

        /// <summary>"OneHandedWeapon" -> "item_one_handed_weapon".</summary>
        public string ItemType(ItemDrop.ItemData.ItemType type)
        {
            string raw = type.ToString();
            string name = ItemTypeNames.TryGetValue(raw, out string known) ? known : raw;
            return Ensure("item_" + ExtId.SnakeCase(raw), name, CategoryDoc.ForItem);
        }

        /// <summary>"BuildingWorkbench" -> "piece_building_workbench".</summary>
        public string PieceCategory(global::Piece.PieceCategory category, string label)
        {
            return Ensure("piece_" + ExtId.SnakeCase(category.ToString()), label ?? category.ToString(), CategoryDoc.ForEntity);
        }

        private string Ensure(string extId, string name, string appliesTo)
        {
            if (!_dataset.Contains("categories", extId))
                _dataset.Add(new CategoryDoc(extId, name, appliesTo));
            return extId;
        }
    }
}
