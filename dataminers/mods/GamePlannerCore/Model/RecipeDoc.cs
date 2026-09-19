using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>Receita sem nome é exibida pelo nome do produto.</summary>
    public sealed class RecipeDoc : ContentDoc
    {
        public int? CraftTimeSeconds;

        /// <summary>Ids de entidades (bancadas).</summary>
        public List<string> Stations = new List<string>();
        public List<Requirement> Inputs = new List<Requirement>();
        public List<RecipeOutput> Outputs = new List<RecipeOutput>();
        public List<RecipeUnlock> Unlock = new List<RecipeUnlock>();

        public override string Resource => "recipes";
        public override string Kind => ContentKinds.Recipe;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("craftTimeSeconds", CraftTimeSeconds)
                .Field("stations", Stations)
                .Field("inputs", Inputs)
                .Field("outputs", Outputs)
                .Field("unlock", Unlock);
        }
    }
}
