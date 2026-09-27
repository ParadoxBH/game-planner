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
        /// <summary>
        /// Ids de itens que fazem papel de bancada: a ferramenta que se segura para construir ou preparar
        /// (martelo, enxada, bandeja do Valheim). Vão na frente das bancadas, como bancada do tipo item.
        /// </summary>
        public List<string> ToolStations = new List<string>();
        public List<Requirement> Inputs = new List<Requirement>();
        public List<RecipeOutput> Outputs = new List<RecipeOutput>();
        public List<RecipeUnlock> Unlock = new List<RecipeUnlock>();

        public override string Resource => "recipes";
        public override string Kind => ContentKinds.Recipe;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("craftTimeSeconds", CraftTimeSeconds)
                .Field("stations", AllStations())
                .Field("inputs", Inputs)
                .Field("outputs", Outputs)
                .Field("unlock", Unlock);
        }

        private List<object> AllStations()
        {
            var all = new List<object>(ToolStations.Count + Stations.Count);
            foreach (string tool in ToolStations) all.Add(Reference.Item(tool));
            foreach (string station in Stations) all.Add(station);
            return all;
        }
    }
}
