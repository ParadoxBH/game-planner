using System.Collections.Generic;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// Categorias de item usadas pelos mineradores. No How to Fish tudo vira item (peixes, iscas, melhorias,
    /// desbloqueáveis), então todas são ForItem. Cada uma entra no dataset na primeira vez que alguém a usa.
    /// </summary>
    internal sealed class HtfCategories
    {
        public const string Currency = "currency";

        public const string Fish = "fish";
        public const string Creature = "creature";
        public const string Boss = "boss";
        public const string MiniBoss = "mini_boss";
        public const string Drip = "drip";

        public const string Firearm = "firearm";
        public const string Melee = "melee";
        public const string FishingRod = "fishing_rod";
        public const string Tool = "tool";
        public const string Explosive = "explosive";
        public const string Misc = "misc";
        public const string QuestItem = "quest_item";

        public const string Bait = "bait";
        public const string Attachment = "attachment";

        public const string Upgrade = "upgrade";
        public const string UpgradePocket = "upgrade_pocket";
        public const string UpgradeBoat = "upgrade_boat";

        public const string Unlockable = "unlockable";
        public const string Skin = "skin";
        public const string Outfit = "outfit";
        public const string Island = "island";
        public const string Boat = "boat";
        public const string Feature = "feature";

        private static readonly Dictionary<string, string> Names = new Dictionary<string, string>
        {
            { Currency, "Moeda" },
            { Fish, "Peixes" },
            { Creature, "Criaturas" },
            { Boss, "Chefes" },
            { MiniBoss, "Mini-chefes" },
            { Drip, "Drip (versões raras)" },
            { Firearm, "Armas de fogo" },
            { Melee, "Armas corpo a corpo" },
            { FishingRod, "Varas de pesca" },
            { Tool, "Ferramentas" },
            { Explosive, "Explosivos" },
            { Misc, "Diversos" },
            { QuestItem, "Itens de missão" },
            { Bait, "Iscas" },
            { Attachment, "Acessórios de arma" },
            { Upgrade, "Melhorias" },
            { UpgradePocket, "Bolsos extras" },
            { UpgradeBoat, "Melhorias do barco" },
            { Unlockable, "Desbloqueáveis" },
            { Skin, "Skins" },
            { Outfit, "Roupas" },
            { Island, "Ilhas" },
            { Boat, "Barco" },
            { Feature, "Recursos do jogo" },
        };

        private readonly MinedDataset _dataset;

        public HtfCategories(MinedDataset dataset) => _dataset = dataset;

        /// <summary>Id da categoria, registrando-a no dataset.</summary>
        public string Get(string code)
        {
            if (!_dataset.Contains("categories", code))
                _dataset.Add(new CategoryDoc(code, Names.TryGetValue(code, out string name) ? name : code, CategoryDoc.ForItem));
            return code;
        }

        /// <summary>Adiciona as categorias ao documento, registrando cada uma.</summary>
        public void Apply(ItemDoc doc, params string[] codes)
        {
            foreach (string code in codes)
            {
                string id = Get(code);
                if (!doc.Categories.Contains(id)) doc.Categories.Add(id);
            }
        }
    }
}
