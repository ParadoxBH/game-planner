using System;
using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using Terraria;
using Terraria.GameContent.UI;
using Terraria.ModLoader;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Lojas dos moradores. Cada loja vira um documento de loja apontando para a entidade do NPC, e os itens
    /// entram em categorias de loja agrupadas pelas condições da oferta ("Depois de derrotar o Olho de
    /// Cthulhu", "Durante a Lua de Sangue"): é o mesmo recorte que o jogo usa para decidir o que está à venda.
    ///
    /// O preço de compra do item também é gravado no próprio item (o menor entre as lojas), que é o que o
    /// site usa quando não há receita e a árvore de crafting precisa comprar.
    /// </summary>
    internal static class ShopMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            int lojas = 0;
            foreach (AbstractNPCShop loja in NPCShopDatabase.AllShops)
            {
                if (loja == null) continue;
                string npcId = kit.NpcId(loja.NpcType);
                if (npcId == null) continue;
                if (kit.SomenteVanilla && loja.FullName != null && !loja.FullName.StartsWith("Terraria/", StringComparison.Ordinal)) continue;

                if (Construir(kit, loja, npcId)) lojas++;
                if (kit.ShouldYield()) yield return null;
            }

            kit.Context.Status("Lojas: " + lojas + " minerada(s)");
        }

        private static bool Construir(MiningKit kit, AbstractNPCShop loja, string npcId)
        {
            string nomeDoNpc = TerrariaNames.NpcName(loja.NpcType);
            bool padrao = string.IsNullOrEmpty(loja.Name) || loja.Name == "Shop";
            string id = ExtId.Sanitize("shop_" + npcId + (padrao ? "" : "_" + loja.Name));

            var doc = new ShopDoc
            {
                ExtId = id,
                Name = TerrariaNames.Own("Mineracao.NomeDaLoja", nomeDoNpc) ?? nomeDoNpc,
                Npc = npcId,
            };
            if (!padrao) doc.Name += " — " + TerrariaNames.Humanize(loja.Name);

            List<Grupo> grupos = Agrupar(kit, loja);
            if (grupos.Count == 0) return false;

            for (int i = 0; i < grupos.Count; i++)
            {
                Grupo grupo = grupos[i];
                var categoria = new ShopCategoryDoc
                {
                    ExtId = ExtId.Sanitize(id + "_" + (i + 1)),
                    Name = grupo.Nome,
                    Shop = id,
                    Items = grupo.Itens,
                };
                if (kit.Dataset.Add(categoria)) doc.Categories.Add(categoria.ExtId);
            }

            return kit.Dataset.Add(doc);
        }

        private sealed class Grupo
        {
            public string Nome;
            public readonly List<ShopItem> Itens = new List<ShopItem>();
        }

        /// <summary>Uma categoria por conjunto de condições, na ordem em que as ofertas aparecem na loja.</summary>
        private static List<Grupo> Agrupar(MiningKit kit, AbstractNPCShop loja)
        {
            var grupos = new List<Grupo>();
            var porNome = new Dictionary<string, Grupo>();

            foreach (AbstractNPCShop.Entry entrada in Entradas(loja))
            {
                Item item = entrada?.Item;
                if (item == null || item.type <= 0) continue;
                Reference alvo = kit.ItemRef(item.type);
                if (alvo == null) continue;

                string nome = Condicoes(entrada) ?? TerrariaNames.Own("Mineracao.SempreAVenda") ?? "Sempre à venda";
                if (!porNome.TryGetValue(nome, out Grupo grupo))
                {
                    porNome[nome] = grupo = new Grupo { Nome = nome };
                    grupos.Add(grupo);
                }

                double preco = item.shopCustomPrice ?? item.value;
                Reference moeda = Moeda(kit, item);
                grupo.Itens.Add(new ShopItem(alvo, preco > 0 ? preco : (double?)null, preco > 0 ? moeda : null));
                if (preco > 0) PrecoDeCompra(kit, item.type, preco, moeda);
            }
            return grupos;
        }

        /// <summary>NPCShop conhece as ofertas desligadas por outros mods; a loja abstrata só as ativas.</summary>
        private static IEnumerable<AbstractNPCShop.Entry> Entradas(AbstractNPCShop loja)
        {
            if (!(loja is NPCShop completa)) return loja.ActiveEntries;

            var entradas = new List<AbstractNPCShop.Entry>();
            foreach (NPCShop.Entry entrada in completa.Entries)
                if (entrada != null && !entrada.Disabled) entradas.Add(entrada);
            return entradas;
        }

        private static string Condicoes(AbstractNPCShop.Entry entrada)
        {
            if (entrada.Conditions == null) return null;
            var textos = new List<string>();
            foreach (Condition condicao in entrada.Conditions)
            {
                string texto = Texto(condicao);
                if (texto != null && !textos.Contains(texto)) textos.Add(texto);
            }
            return textos.Count == 0 ? null : string.Join(" + ", textos);
        }

        private static string Texto(Condition condicao)
        {
            try
            {
                return condicao?.Description == null ? null : TerrariaNames.Clean(condicao.Description.Value);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>
        /// Quase tudo é comprado com moeda comum. Algumas lojas cobram em outro item (medalha do defensor,
        /// ficha do parque): o sistema de moeda do jogo diz qual item vale como unidade.
        /// </summary>
        private static Reference Moeda(MiningKit kit, Item item)
        {
            if (item.shopSpecialCurrency < 0) return kit.Moeda;
            try
            {
                if (!CustomCurrencyManager.TryGetCurrencySystem(item.shopSpecialCurrency, out CustomCurrencySystem sistema))
                    return kit.Moeda;

                Dictionary<int, int> unidades = TerrariaFields.CurrencyUnits.Get(sistema);
                if (unidades == null || unidades.Count == 0) return kit.Moeda;

                int menor = 0;
                int valorDoMenor = int.MaxValue;
                foreach (KeyValuePair<int, int> unidade in unidades)
                    if (unidade.Value < valorDoMenor) { menor = unidade.Key; valorDoMenor = unidade.Value; }

                return kit.ItemRef(menor) ?? kit.Moeda;
            }
            catch (Exception)
            {
                return kit.Moeda;
            }
        }

        /// <summary>
        /// Preço base de compra do item: o menor entre as lojas. O documento tem uma moeda só para compra e
        /// venda, então oferta em moeda especial (medalha, ficha) fica apenas na loja — senão o preço de venda
        /// do item passaria a ser lido na moeda errada.
        /// </summary>
        private static void PrecoDeCompra(MiningKit kit, int type, double preco, Reference moeda)
        {
            if (!kit.ItemDocs.TryGetValue(type, out ItemDoc doc)) return;
            if (doc.Currency != null && doc.Currency.ExtId != moeda.ExtId) return;
            if (doc.BaseBuyPrice != null && doc.BaseBuyPrice <= preco) return;

            doc.BaseBuyPrice = preco;
            doc.Currency = moeda;
        }
    }
}
