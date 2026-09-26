using System;
using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using Terraria;
using Terraria.ID;
using Terraria.ModLoader;
using Terraria.UI;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Todo item carregado, na ordem do tipo. Os valores saem de ContentSamples, que é a cópia que o jogo
    /// mantém de cada item com os padrões aplicados — ler de lá evita criar Item e chamar SetDefaults 5 mil
    /// vezes, e é o mesmo que o bestiário e o modo criativo usam.
    ///
    /// Preço: value é o preço de compra em cobre e a venda é um quinto dele, como no jogo. Preço de compra só
    /// entra em quem está à venda em alguma loja, o que o <see cref="ShopMiner"/> completa depois.
    /// </summary>
    internal static class ItemMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            int total = ItemLoader.ItemCount;
            var usados = new HashSet<string>();

            for (int type = 1; type < total; type++)
            {
                if (!kit.ItemAceito(type)) continue;
                if (!ContentSamples.ItemsByType.TryGetValue(type, out Item item) || item == null) continue;

                string id = TerrariaNames.ItemId(type);
                if (id == null || !usados.Add(id))
                {
                    kit.Dataset.Warn("Item " + type + " sem id próprio: ficou de fora");
                    continue;
                }

                ItemDoc doc = Construir(kit, item, type, id);
                if (kit.Dataset.Add(doc))
                {
                    kit.ItemIds[type] = id;
                    kit.ItemDocs[type] = doc;
                }

                if (type % 250 == 0) kit.Context.Status("Itens: " + type + "/" + total);
                if (kit.ShouldYield()) yield return null;
            }

            kit.Context.Status("Itens: " + kit.ItemIds.Count + " minerados");
        }

        private static ItemDoc Construir(MiningKit kit, Item item, int type, string id)
        {
            var doc = new ItemDoc
            {
                ExtId = id,
                Name = TerrariaNames.ItemName(type),
                RarityCode = RarityMiner.Code(kit, item.rare),
                IconImage = kit.Icons.Item(type, id),
            };

            Textos(doc, type);
            if (item.value > 0 && !item.IsACoin)
            {
                doc.BaseSellPrice = item.value / 5;
                doc.Currency = kit.Moeda;
            }

            Classificar(kit, doc, item);
            if (kit.GroupCategories.TryGetValue(type, out List<string> grupos))
                foreach (string grupo in grupos)
                    if (!doc.Categories.Contains(grupo)) doc.Categories.Add(grupo);

            Atributos(doc.Attributes, item, type);
            return doc;
        }

        /// <summary>Primeira linha da dica vira resumo; todas juntas, a descrição.</summary>
        private static void Textos(ItemDoc doc, int type)
        {
            ItemTooltip dica = Lang.GetTooltip(type);
            if (dica == null) return;

            var linhas = new List<string>();
            for (int i = 0; i < dica.Lines; i++)
            {
                string linha = TerrariaNames.Clean(dica.GetLine(i));
                if (linha != null) linhas.Add(linha);
            }
            if (linhas.Count == 0) return;
            doc.Summary = linhas[0];
            doc.Description = string.Join("\n", linhas);
        }

        // ------------------------------------------------------------------ categorias

        /// <summary>Uma categoria principal (a que abre a listagem) e as sub-categorias que detalham o item.</summary>
        private static void Classificar(MiningKit kit, ItemDoc doc, Item item)
        {
            TerrariaCategories c = kit.Categories;

            if (item.IsACoin)
            {
                c.Apply(doc, TerrariaCategories.Misc, TerrariaCategories.Coin);
                return;
            }

            bool ferramenta = item.pick > 0 || item.axe > 0 || item.hammer > 0 || item.fishingPole > 0;
            if (ferramenta)
            {
                c.Apply(doc, TerrariaCategories.Tool);
                if (item.pick > 0) c.Apply(doc, TerrariaCategories.Pickaxe);
                if (item.axe > 0) c.Apply(doc, TerrariaCategories.Axe);
                if (item.hammer > 0) c.Apply(doc, TerrariaCategories.Hammer);
                if (item.fishingPole > 0) c.Apply(doc, TerrariaCategories.FishingRod);
            }

            if (item.ammo > 0 && item.damage > 0)
            {
                c.Apply(doc, TerrariaCategories.Weapon, TerrariaCategories.Ammo);
            }
            else if (item.damage > 0 && !ferramenta && !item.accessory)
            {
                c.Apply(doc, TerrariaCategories.Weapon, ClasseDeDano(item));
            }

            if (item.headSlot >= 0) c.Apply(doc, Armadura(item), TerrariaCategories.Helmet);
            if (item.bodySlot >= 0) c.Apply(doc, Armadura(item), TerrariaCategories.Chestplate);
            if (item.legSlot >= 0) c.Apply(doc, Armadura(item), TerrariaCategories.Leggings);

            if (item.accessory)
            {
                c.Apply(doc, item.vanity ? TerrariaCategories.Cosmetic : TerrariaCategories.Accessory);
                if (item.wingSlot > 0) c.Apply(doc, TerrariaCategories.Wings);
            }

            if (Gancho(item)) c.Apply(doc, TerrariaCategories.Tool, TerrariaCategories.GrapplingHook);

            if (item.createTile >= 0)
            {
                c.Apply(doc, TerrariaCategories.Building);
                if (Minerio(item.createTile)) c.Apply(doc, TerrariaCategories.Ore);
                else if (item.createTile == TileID.MetalBars) c.Apply(doc, TerrariaCategories.Bar);
                else if (Solido(item.createTile)) c.Apply(doc, TerrariaCategories.Block);
                else c.Apply(doc, TerrariaCategories.Furniture);
                if (item.mech) c.Apply(doc, TerrariaCategories.Mechanism);
            }
            if (item.createWall > 0) c.Apply(doc, TerrariaCategories.Building, TerrariaCategories.Wall);

            if (item.consumable || item.potion || item.healLife > 0 || item.healMana > 0)
            {
                c.Apply(doc, TerrariaCategories.Consumable);
                if (Comida(item.type)) c.Apply(doc, TerrariaCategories.Food);
                else if (item.potion || item.healLife > 0 || item.healMana > 0 || item.buffType > 0)
                    c.Apply(doc, TerrariaCategories.Potion);
                if (item.bait > 0) c.Apply(doc, TerrariaCategories.Bait);
                if (InvocaChefe(item.type)) c.Apply(doc, TerrariaCategories.BossSummon);
            }

            if (item.material) c.Apply(doc, TerrariaCategories.Material);
            if (item.dye > 0 || item.hairDye >= 0) c.Apply(doc, TerrariaCategories.Cosmetic, TerrariaCategories.Dye);
            if (item.paint > 0) c.Apply(doc, TerrariaCategories.Cosmetic, TerrariaCategories.Paint);
            if (item.mountType >= 0) c.Apply(doc, TerrariaCategories.Misc, TerrariaCategories.Mount);
            if (Bichinho(item.buffType, Main.vanityPet)) c.Apply(doc, TerrariaCategories.Misc, TerrariaCategories.Pet);
            if (Bichinho(item.buffType, Main.lightPet)) c.Apply(doc, TerrariaCategories.Misc, TerrariaCategories.LightPet);
            if (item.questItem) c.Apply(doc, TerrariaCategories.Misc, TerrariaCategories.QuestItem);
            if (item.expert || item.expertOnly || item.master || item.masterOnly) c.Apply(doc, TerrariaCategories.ExpertItem);
            if (item.vanity && !item.accessory) c.Apply(doc, TerrariaCategories.Cosmetic);

            if (doc.Categories.Count == 0) c.Apply(doc, TerrariaCategories.Misc);
        }

        private static string Armadura(Item item) => item.vanity ? TerrariaCategories.Cosmetic : TerrariaCategories.Armor;

        private static string ClasseDeDano(Item item)
        {
            string nome = NomeDaClasse(item);
            switch (nome)
            {
                case "Melee":
                case "MeleeNoSpeed":
                case "SummonMeleeSpeed": return TerrariaCategories.Melee;
                case "Ranged": return TerrariaCategories.Ranged;
                case "Magic":
                case "MagicSummonHybrid": return TerrariaCategories.Magic;
                case "Summon": return TerrariaCategories.Summon;
                case "Throwing": return TerrariaCategories.Throwing;
                default: return TerrariaCategories.Melee;
            }
        }

        private static string NomeDaClasse(Item item)
        {
            try
            {
                return item.DamageType?.Name;
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static bool Gancho(Item item) =>
            item.shoot > 0 && item.shoot < Main.projHook.Length && Main.projHook[item.shoot];

        private static bool Solido(int tile) =>
            tile >= 0 && tile < Main.tileSolid.Length && Main.tileSolid[tile];

        private static bool Minerio(int tile) =>
            tile >= 0 && TileID.Sets.Ore != null && tile < TileID.Sets.Ore.Length && TileID.Sets.Ore[tile];

        private static bool Comida(int type) =>
            ItemID.Sets.IsFood != null && type < ItemID.Sets.IsFood.Length && ItemID.Sets.IsFood[type];

        private static bool InvocaChefe(int type) =>
            ItemID.Sets.SortingPriorityBossSpawns != null && type < ItemID.Sets.SortingPriorityBossSpawns.Length &&
            ItemID.Sets.SortingPriorityBossSpawns[type] >= 0;

        private static bool Bichinho(int buff, bool[] tabela) =>
            buff > 0 && tabela != null && buff < tabela.Length && tabela[buff];

        // ------------------------------------------------------------------ atributos

        private static void Atributos(Dictionary<string, object> a, Item item, int type)
        {
            a["item_id"] = type;
            Numero(a, "max_stack", item.maxStack, 1);
            Numero(a, "value_copper", item.value);
            Numero(a, "rare", item.rare, 0);

            if (item.damage > 0)
            {
                a["damage"] = item.damage;
                string classe = NomeDaClasse(item);
                if (classe != null) a["damage_class"] = ExtId.SnakeCase(classe);
                Numero(a, "crit_chance", item.crit);
                Numero(a, "knockback", Math.Round(item.knockBack, 2));
                Numero(a, "use_time", item.useTime);
                Numero(a, "use_animation", item.useAnimation);
                Numero(a, "reuse_delay", item.reuseDelay);
                Numero(a, "mana_cost", item.mana);
                Numero(a, "shoot_speed", Math.Round(item.shootSpeed, 2));
                if (item.autoReuse) a["auto_reuse"] = true;
                if (item.useAmmo > 0) Texto(a, "uses_ammo", TerrariaNames.ItemName(item.useAmmo));
            }
            else
            {
                Numero(a, "use_time", item.useTime);
            }

            Numero(a, "defense", item.defense);
            Numero(a, "pickaxe_power", item.pick);
            Numero(a, "axe_power", item.axe * 5);
            Numero(a, "hammer_power", item.hammer);
            Numero(a, "tile_range_bonus", item.tileBoost);
            Numero(a, "fishing_power", item.fishingPole);
            Numero(a, "bait_power", item.bait);
            Numero(a, "heal_life", item.healLife);
            Numero(a, "heal_mana", item.healMana);
            Numero(a, "mana_increase", item.manaIncrease);
            Numero(a, "life_regen", item.lifeRegen);
            Numero(a, "research_count", item.ResearchUnlockCount, 1);

            if (item.buffType > 0)
            {
                Texto(a, "buff", TerrariaNames.Clean(Lang.GetBuffName(item.buffType)));
                Numero(a, "buff_seconds", item.buffTime / 60);
            }

            if (item.accessory) a["accessory"] = true;
            if (item.material) a["material"] = true;
            if (item.consumable) a["consumable"] = true;
            if (item.vanity) a["vanity"] = true;
            if (item.expert || item.expertOnly) a["expert"] = true;
            if (item.master || item.masterOnly) a["master"] = true;
            if (item.questItem) a["quest_item"] = true;
            if (item.createTile >= 0) Texto(a, "places_tile", TerrariaNames.TileName(item.createTile, item.placeStyle));
            if (item.makeNPC > 0) Texto(a, "releases_npc", TerrariaNames.NpcName(item.makeNPC));
        }

        /// <summary>Atributo aceita número, texto ou booleano: texto vazio não vai.</summary>
        private static void Texto(Dictionary<string, object> a, string chave, string valor)
        {
            if (!string.IsNullOrWhiteSpace(valor)) a[chave] = valor;
        }

        private static void Numero(Dictionary<string, object> a, string chave, double valor, double ignorar = 0)
        {
            if (valor != ignorar) a[chave] = valor;
        }

        private static void Numero(Dictionary<string, object> a, string chave, int valor, int ignorar = 0)
        {
            if (valor != ignorar) a[chave] = valor;
        }
    }
}
