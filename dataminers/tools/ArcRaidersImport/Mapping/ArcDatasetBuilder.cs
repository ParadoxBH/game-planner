using System.Collections.Generic;
using System.Linq;
using GamePlanner.ArcRaiders.Source;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>Monta o dataset do ARC Raiders a partir do repositório, na ordem em que um mapeador depende do outro.</summary>
    public static class ArcDatasetBuilder
    {
        public const string DefaultGameId = "arc_raiders";
        public const string GameName = "ARC Raiders";

        public static MinedDataset Build(ArcSource source, string gameId)
        {
            var dataset = new MinedDataset(gameId, GameName);
            var context = new ArcContext(source, dataset);
            if (!source.HasUiTexts)
                context.Warn("arctracker-ui/pt-BR.json não encontrado: tipos, locais e raridades ficaram em inglês");

            var catalog = new ArcCatalog(context);
            var items = new ItemMapper(context, catalog);
            var stations = new StationMapper(context, catalog);

            catalog.AddRarities();
            items.DefineAttributes();
            stations.DefineAttributes();

            items.AddItems();
            items.AddCurrencies();
            items.NormalizeEffectTypes();
            stations.AddStations();
            new RecipeMapper(context, stations).AddRecipes();
            new TraderMapper(context, catalog).AddTraders();

            CheckReferences(context);
            context.FlushWarnings();
            return dataset;
        }

        /// <summary>
        /// A API aceita referência a conteúdo que ainda não existe (vira pendente), então isto não barra o envio:
        /// só avisa, porque aqui tudo vem do mesmo repositório e referência solta é erro de dado.
        /// </summary>
        private static void CheckReferences(ArcContext context)
        {
            MinedDataset dataset = context.Dataset;
            var known = new HashSet<string>(dataset.Items.Select(item => ContentKinds.Item + "/" + item.ExtId)
                .Concat(dataset.Entities.Select(entity => ContentKinds.Entity + "/" + entity.ExtId)));

            void Check(Reference reference, string owner)
            {
                if (reference != null && !known.Contains(reference.Kind + "/" + reference.ExtId))
                    context.Warn("Referência a conteúdo que não está no repositório", owner + " -> " + reference.Kind + " " + reference.ExtId);
            }

            foreach (ItemDoc item in dataset.Items) Check(item.Currency, item.ExtId);
            foreach (RecipeDoc recipe in dataset.Recipes)
            {
                foreach (Requirement input in recipe.Inputs) Check(input.Target, recipe.ExtId);
                foreach (RecipeOutput output in recipe.Outputs) Check(output.Target, recipe.ExtId);
                foreach (RecipeUnlock unlock in recipe.Unlock) Check(unlock.Target, recipe.ExtId);
            }
            foreach (ShopCategoryDoc category in dataset.ShopCategories)
                foreach (ShopItem item in category.Items)
                {
                    Check(item.Target, category.ExtId);
                    Check(item.Currency, category.ExtId);
                }
        }
    }
}
