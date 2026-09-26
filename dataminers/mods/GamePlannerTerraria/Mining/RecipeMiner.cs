using System;
using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using Terraria;
using Terraria.ID;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Receitas de fabricação (Main.recipe) e as transmutações no Brilho. Ingrediente que é grupo de receita
    /// ("qualquer madeira") entra como categoria, que é o que deixa o site escolher o membro na árvore de
    /// crafting.
    ///
    /// O id é craft_&lt;produto&gt;, com sufixo quando o mesmo item tem mais de uma receita. A ordem é a do
    /// jogo, que não muda entre partidas da mesma versão com os mesmos mods — muda se a lista de mods mudar.
    /// </summary>
    internal static class RecipeMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            var contagem = new Dictionary<string, int>();
            int feitas = 0, ignoradas = 0;

            for (int i = 0; i < Recipe.numRecipes; i++)
            {
                Recipe receita = Main.recipe[i];
                if (receita == null || receita.Disabled) continue;

                RecipeDoc doc = Construir(kit, receita, contagem);
                if (doc == null) ignoradas++;
                else if (kit.Dataset.Add(doc)) feitas++;

                if (kit.ShouldYield()) yield return null;
            }

            foreach (object _ in Transmutacoes(kit, contagem))
            {
                feitas++;
                if (kit.ShouldYield()) yield return null;
            }

            kit.Context.Status("Receitas: " + feitas + " minerada(s)" + (ignoradas > 0 ? ", " + ignoradas + " fora do escopo" : ""));
        }

        private static RecipeDoc Construir(MiningKit kit, Recipe receita, Dictionary<string, int> contagem)
        {
            Item resultado = receita.createItem;
            if (resultado == null || resultado.type <= 0 || resultado.stack <= 0) return null;

            string produto = kit.ItemId(resultado.type);
            if (produto == null) return null;

            var doc = new RecipeDoc { ExtId = Id(produto, contagem) };
            string nome = TerrariaNames.ItemName(resultado.type);
            doc.Name = TerrariaNames.Own("Mineracao.NomeDaReceita", nome) ?? nome;
            doc.Outputs.Add(new RecipeOutput(Reference.Item(produto), resultado.stack));

            if (!Ingredientes(kit, receita, doc)) return null;
            if (!Bancadas(kit, receita, doc)) return null;
            Condicoes(receita, doc);
            return doc;
        }

        /// <summary>false quando algum ingrediente ficou de fora da mineração: a receita não faria sentido.</summary>
        private static bool Ingredientes(MiningKit kit, Recipe receita, RecipeDoc doc)
        {
            if (receita.requiredItem == null) return false;
            foreach (Item ingrediente in receita.requiredItem)
            {
                if (ingrediente == null || ingrediente.type <= 0 || ingrediente.stack <= 0) continue;

                string grupo = CategoriaDoGrupo(kit, receita, ingrediente.type);
                Reference alvo = grupo != null
                    ? new Reference(ContentKinds.Category, grupo)
                    : kit.ItemRef(ingrediente.type);
                if (alvo == null) return false;
                doc.Inputs.Add(new Requirement(alvo, ingrediente.stack));
            }
            return doc.Inputs.Count > 0;
        }

        /// <summary>
        /// O ingrediente de um grupo é o item-símbolo dele (madeira comum representa "qualquer madeira"), e o
        /// id do grupo fica em acceptedGroups: é assim que o jogo sabe aceitar os outros membros.
        /// </summary>
        private static string CategoriaDoGrupo(MiningKit kit, Recipe receita, int type)
        {
            if (receita.acceptedGroups == null) return null;
            foreach (int id in receita.acceptedGroups)
            {
                if (!RecipeGroup.recipeGroups.TryGetValue(id, out RecipeGroup grupo) || grupo == null) continue;
                if (grupo.IconicItemId != type) continue;
                if (kit.GroupIds.TryGetValue(id, out string categoria)) return categoria;
            }
            return null;
        }

        private static bool Bancadas(MiningKit kit, Recipe receita, RecipeDoc doc)
        {
            if (receita.requiredTile == null) return true;
            foreach (int bloco in receita.requiredTile)
            {
                if (bloco < 0) continue;
                if (!kit.StationIds.TryGetValue(bloco, out string bancada)) return false;
                if (!doc.Stations.Contains(bancada)) doc.Stations.Add(bancada);
            }
            return true;
        }

        /// <summary>
        /// Condição de receita (perto d'água, no ermo, em modo difícil) vira desbloqueio do tipo "condition"
        /// com o texto que o jogo mostra na interface de fabricação.
        /// </summary>
        private static void Condicoes(Recipe receita, RecipeDoc doc)
        {
            if (receita.Conditions == null) return;
            foreach (Condition condicao in receita.Conditions)
            {
                string texto = Texto(condicao);
                if (texto != null) doc.Unlock.Add(new RecipeUnlock("condition", value: texto));
            }
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
        /// Transmutação no Brilho: cai o item no líquido e sai outro. Não tem bancada; o desbloqueio "shimmer"
        /// diz o que é preciso.
        /// </summary>
        private static IEnumerable<object> Transmutacoes(MiningKit kit, Dictionary<string, int> contagem)
        {
            int[] tabela = ItemID.Sets.ShimmerTransformToItem;
            if (tabela == null) yield break;

            for (int type = 1; type < tabela.Length; type++)
            {
                int destino = tabela[type];
                if (destino <= 0) continue;

                string origemId = kit.ItemId(type);
                string destinoId = kit.ItemId(destino);
                if (origemId == null || destinoId == null) continue;

                string nome = TerrariaNames.ItemName(type);
                var doc = new RecipeDoc
                {
                    ExtId = ExtId.Sanitize("shimmer_" + origemId),
                    Name = TerrariaNames.Own("Mineracao.NomeDaTransmutacao", nome) ?? nome,
                };
                doc.Inputs.Add(new Requirement(Reference.Item(origemId), 1));
                doc.Outputs.Add(new RecipeOutput(Reference.Item(destinoId), 1));
                // Desbloqueio sem alvo precisa de texto: a API recusa condição vazia.
                doc.Unlock.Add(new RecipeUnlock("shimmer", value: TerrariaNames.Own("Mineracao.Brilho") ?? "Shimmer"));
                if (kit.Dataset.Add(doc)) yield return null;
            }
        }

        private static string Id(string produto, Dictionary<string, int> contagem)
        {
            contagem.TryGetValue(produto, out int usadas);
            contagem[produto] = usadas + 1;
            return ExtId.Sanitize("craft_" + produto + (usadas == 0 ? "" : "_" + (usadas + 1)));
        }
    }
}
