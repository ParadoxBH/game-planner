using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using Terraria;
using Terraria.ID;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Bancadas: os blocos que alguma receita exige (bancada, forja, bigorna, mesa de alquimia...). Viram
    /// entidade, que é como a API cita bancada em receita.
    ///
    /// O nome e o ícone vêm do item que coloca o bloco — é ele que o jogador conhece. Bloco sem item (o vaso
    /// de planta de um bioma, por exemplo) cai no nome que o mapa mostra.
    /// </summary>
    internal static class StationMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            List<int> blocos = BlocosDeReceita(kit);
            Dictionary<int, int> itemPorBloco = ItensQueColocam(kit);

            foreach (int bloco in blocos)
            {
                string id = TerrariaNames.StationId(bloco);
                if (id == null) continue;

                itemPorBloco.TryGetValue(bloco, out int item);
                var doc = new EntityDoc
                {
                    ExtId = id,
                    Name = item > 0 ? TerrariaNames.ItemName(item) : TerrariaNames.TileName(bloco),
                    IconImage = item > 0 ? kit.Icons.Item(item, TerrariaNames.ItemId(item)) : null,
                };
                kit.Categories.Apply(doc, TerrariaCategories.Station);
                doc.Attributes["tile_id"] = bloco;
                if (item > 0 && kit.ItemId(item) != null) doc.Attributes["placed_by"] = TerrariaNames.ItemName(item);

                if (kit.Dataset.Add(doc)) kit.StationIds[bloco] = id;
                if (kit.ShouldYield()) yield return null;
            }

            kit.Context.Status("Bancadas: " + kit.StationIds.Count + " minerada(s)");
        }

        private static List<int> BlocosDeReceita(MiningKit kit)
        {
            var blocos = new List<int>();
            var vistos = new HashSet<int>();
            for (int i = 0; i < Recipe.numRecipes; i++)
            {
                Recipe receita = Main.recipe[i];
                if (receita?.requiredTile == null) continue;
                foreach (int bloco in receita.requiredTile)
                    if (kit.TileAceito(bloco) && vistos.Add(bloco)) blocos.Add(bloco);
            }
            blocos.Sort();
            return blocos;
        }

        /// <summary>Bloco -> item que o coloca. Com vários itens para o mesmo bloco, fica o do primeiro estilo.</summary>
        private static Dictionary<int, int> ItensQueColocam(MiningKit kit)
        {
            var itens = new Dictionary<int, int>();
            foreach (KeyValuePair<int, Item> entrada in ContentSamples.ItemsByType)
            {
                Item item = entrada.Value;
                if (item == null || item.createTile < 0 || !kit.ItemAceito(entrada.Key)) continue;
                if (itens.TryGetValue(item.createTile, out int atual) && Melhor(atual, entrada.Key, item)) continue;
                itens[item.createTile] = entrada.Key;
            }
            return itens;
        }

        private static bool Melhor(int atual, int candidato, Item item) => item.placeStyle != 0 || atual < candidato;
    }
}
