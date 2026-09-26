using System;
using System.Collections.Generic;
using GamePlanner.Core.Text;
using Terraria;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Grupos de receita ("qualquer madeira", "qualquer barra de ferro") viram categoria de item: a receita
    /// pede a categoria, e cada item do grupo entra nela. É assim que a árvore de crafting do site deixa
    /// escolher o membro (category:qualquer_madeira=item:Wood).
    ///
    /// Roda antes do minerador de itens: é ele que põe as categorias no documento de cada item.
    /// </summary>
    internal static class RecipeGroupMiner
    {
        public static void Mine(MiningKit kit)
        {
            Dictionary<int, string> nomes = NomesPorId();

            foreach (KeyValuePair<int, RecipeGroup> entrada in RecipeGroup.recipeGroups)
            {
                RecipeGroup grupo = entrada.Value;
                if (grupo == null || grupo.ValidItems == null || grupo.ValidItems.Count == 0) continue;

                string nomeInterno = nomes.TryGetValue(entrada.Key, out string encontrado) ? encontrado : "Grupo" + entrada.Key;
                if (kit.SomenteVanilla && nomeInterno.Contains(":")) continue; // grupo de mod: "MeuMod:Madeiras"

                string codigo = ExtId.Sanitize("group_" + nomeInterno.Replace(':', '_'));
                string nome = TerrariaNames.Clean(Texto(grupo)) ?? TerrariaNames.Humanize(nomeInterno);
                kit.GroupIds[entrada.Key] = kit.Categories.Custom(codigo, nome);

                foreach (int type in grupo.ValidItems)
                {
                    if (!kit.ItemAceito(type)) continue;
                    if (!kit.GroupCategories.TryGetValue(type, out List<string> categorias))
                        kit.GroupCategories[type] = categorias = new List<string>();
                    if (!categorias.Contains(codigo)) categorias.Add(codigo);
                }
            }
        }

        /// <summary>O dicionário do jogo é nome -> id; aqui interessa o contrário.</summary>
        private static Dictionary<int, string> NomesPorId()
        {
            var nomes = new Dictionary<int, string>();
            foreach (KeyValuePair<string, int> entrada in RecipeGroup.recipeGroupIDs) nomes[entrada.Value] = entrada.Key;
            return nomes;
        }

        private static string Texto(RecipeGroup grupo)
        {
            try
            {
                return grupo.GetText?.Invoke();
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
