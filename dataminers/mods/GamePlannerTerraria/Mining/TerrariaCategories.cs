using System.Collections.Generic;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Categorias usadas pelos mineradores. Como no How to Fish, cada uma só entra no dataset na primeira vez
    /// que alguém a usa — o que sobrar do jogo do jogador não vira categoria vazia no site.
    ///
    /// As principais (Primary) são as que abrem a listagem e aparecem no menu: um item cai numa delas e ganha
    /// as sub-categorias que descrevem o detalhe (arma + corpo a corpo, construção + móvel...).
    /// </summary>
    internal sealed class TerrariaCategories
    {
        // Principais de item
        public const string Weapon = "weapon";
        public const string Tool = "tool";
        public const string Armor = "armor";
        public const string Accessory = "accessory";
        public const string Consumable = "consumable";
        public const string Material = "material";
        public const string Building = "building";
        public const string Cosmetic = "cosmetic";
        public const string Misc = "misc";

        // Sub-categorias de item
        public const string Melee = "melee";
        public const string Ranged = "ranged";
        public const string Magic = "magic";
        public const string Summon = "summon";
        public const string Throwing = "throwing";
        public const string Ammo = "ammo";
        public const string Pickaxe = "pickaxe";
        public const string Axe = "axe";
        public const string Hammer = "hammer";
        public const string FishingRod = "fishing_rod";
        public const string Bait = "bait";
        public const string GrapplingHook = "grappling_hook";
        public const string Helmet = "helmet";
        public const string Chestplate = "chestplate";
        public const string Leggings = "leggings";
        public const string Wings = "wings";
        public const string Potion = "potion";
        public const string Food = "food";
        public const string BossSummon = "boss_summon";
        public const string Key = "key";
        public const string Coin = "coin";
        public const string Ore = "ore";
        public const string Bar = "bar";
        public const string Block = "block";
        public const string Wall = "wall";
        public const string Furniture = "furniture";
        public const string Mechanism = "mechanism";
        public const string LightSource = "light_source";
        public const string Seed = "seed";
        public const string Dye = "dye";
        public const string Paint = "paint";
        public const string Pet = "pet";
        public const string LightPet = "light_pet";
        public const string Mount = "mount";
        public const string Fish = "fish";
        public const string QuestItem = "quest_item";
        public const string ExpertItem = "expert_item";

        // Entidades
        public const string Enemy = "enemy";
        public const string Boss = "boss";
        public const string TownNpc = "town_npc";
        public const string Critter = "critter";
        public const string Station = "station";

        private sealed class Definicao
        {
            public string Nome;
            public string AppliesTo;
            public bool Principal;

            public Definicao(string nome, string appliesTo, bool principal = false)
            {
                Nome = nome; AppliesTo = appliesTo; Principal = principal;
            }
        }

        private static readonly Dictionary<string, Definicao> Catalogo = new Dictionary<string, Definicao>
        {
            { Weapon, new Definicao("Armas", CategoryDoc.ForItem, true) },
            { Tool, new Definicao("Ferramentas", CategoryDoc.ForItem, true) },
            { Armor, new Definicao("Armaduras", CategoryDoc.ForItem, true) },
            { Accessory, new Definicao("Acessórios", CategoryDoc.ForItem, true) },
            { Consumable, new Definicao("Consumíveis", CategoryDoc.ForItem, true) },
            { Material, new Definicao("Materiais", CategoryDoc.ForItem, true) },
            { Building, new Definicao("Construção", CategoryDoc.ForItem, true) },
            { Cosmetic, new Definicao("Cosméticos", CategoryDoc.ForItem, true) },
            { Misc, new Definicao("Diversos", CategoryDoc.ForItem, true) },

            { Melee, new Definicao("Corpo a corpo", CategoryDoc.ForItem) },
            { Ranged, new Definicao("Longo alcance", CategoryDoc.ForItem) },
            { Magic, new Definicao("Magia", CategoryDoc.ForItem) },
            { Summon, new Definicao("Invocação", CategoryDoc.ForItem) },
            { Throwing, new Definicao("Arremesso", CategoryDoc.ForItem) },
            { Ammo, new Definicao("Munição", CategoryDoc.ForItem) },
            { Pickaxe, new Definicao("Picaretas", CategoryDoc.ForItem) },
            { Axe, new Definicao("Machados", CategoryDoc.ForItem) },
            { Hammer, new Definicao("Marretas", CategoryDoc.ForItem) },
            { FishingRod, new Definicao("Varas de pesca", CategoryDoc.ForItem) },
            { Bait, new Definicao("Iscas", CategoryDoc.ForItem) },
            { GrapplingHook, new Definicao("Ganchos", CategoryDoc.ForItem) },
            { Helmet, new Definicao("Capacetes", CategoryDoc.ForItem) },
            { Chestplate, new Definicao("Peitorais", CategoryDoc.ForItem) },
            { Leggings, new Definicao("Perneiras", CategoryDoc.ForItem) },
            { Wings, new Definicao("Asas", CategoryDoc.ForItem) },
            { Potion, new Definicao("Poções", CategoryDoc.ForItem) },
            { Food, new Definicao("Comida", CategoryDoc.ForItem) },
            { BossSummon, new Definicao("Invocadores de chefe", CategoryDoc.ForItem) },
            { Key, new Definicao("Chaves", CategoryDoc.ForItem) },
            { Coin, new Definicao("Moedas", CategoryDoc.ForItem) },
            { Ore, new Definicao("Minérios", CategoryDoc.ForItem) },
            { Bar, new Definicao("Barras", CategoryDoc.ForItem) },
            { Block, new Definicao("Blocos", CategoryDoc.ForItem) },
            { Wall, new Definicao("Paredes", CategoryDoc.ForItem) },
            { Furniture, new Definicao("Móveis", CategoryDoc.ForItem) },
            { Mechanism, new Definicao("Mecanismos", CategoryDoc.ForItem) },
            { LightSource, new Definicao("Iluminação", CategoryDoc.ForItem) },
            { Seed, new Definicao("Sementes", CategoryDoc.ForItem) },
            { Dye, new Definicao("Tinturas", CategoryDoc.ForItem) },
            { Paint, new Definicao("Tintas", CategoryDoc.ForItem) },
            { Pet, new Definicao("Bichos de estimação", CategoryDoc.ForItem) },
            { LightPet, new Definicao("Bichos de luz", CategoryDoc.ForItem) },
            { Mount, new Definicao("Montarias", CategoryDoc.ForItem) },
            { Fish, new Definicao("Peixes", CategoryDoc.ForItem) },
            { QuestItem, new Definicao("Itens de missão", CategoryDoc.ForItem) },
            { ExpertItem, new Definicao("Exclusivos de dificuldade", CategoryDoc.ForItem) },

            { Enemy, new Definicao("Inimigos", CategoryDoc.ForEntity, true) },
            { Boss, new Definicao("Chefes", CategoryDoc.ForEntity, true) },
            { TownNpc, new Definicao("Moradores", CategoryDoc.ForEntity, true) },
            { Critter, new Definicao("Bichinhos", CategoryDoc.ForEntity, true) },
            { Station, new Definicao("Bancadas", CategoryDoc.ForEntity, true) },
        };

        private readonly MinedDataset _dataset;

        public TerrariaCategories(MinedDataset dataset) => _dataset = dataset;

        /// <summary>Id da categoria, cadastrando-a no dataset na primeira vez.</summary>
        public string Get(string codigo)
        {
            if (codigo == null || _dataset.Contains("categories", codigo)) return codigo;
            Definicao definicao = Catalogo.TryGetValue(codigo, out Definicao encontrada)
                ? encontrada
                : new Definicao(TerrariaNames.Humanize(codigo), CategoryDoc.ForBoth);
            _dataset.Add(new CategoryDoc(codigo, definicao.Nome, definicao.AppliesTo, definicao.Principal));
            return codigo;
        }

        /// <summary>Categoria que não está no catálogo: grupo de receita ("Qualquer madeira"), por exemplo.</summary>
        public string Custom(string codigo, string nome, string appliesTo = CategoryDoc.ForItem)
        {
            if (codigo == null) return null;
            if (!_dataset.Contains("categories", codigo))
                _dataset.Add(new CategoryDoc(codigo, nome ?? TerrariaNames.Humanize(codigo), appliesTo));
            return codigo;
        }

        public void Apply(ItemDoc doc, params string[] codigos) => Apply(doc.Categories, codigos);

        public void Apply(EntityDoc doc, params string[] codigos) => Apply(doc.Categories, codigos);

        private void Apply(List<string> destino, string[] codigos)
        {
            foreach (string codigo in codigos)
            {
                if (codigo == null) continue;
                string id = Get(codigo);
                if (!destino.Contains(id)) destino.Add(id);
            }
        }
    }
}
