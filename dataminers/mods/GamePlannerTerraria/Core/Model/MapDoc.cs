using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>
    /// Mapa. Mundo gerado por semente não tem imagem: use MapType procedural, que abre no dashboard e agrupa
    /// o conteúdo pelos locais (biomas).
    /// </summary>
    public sealed class MapDoc : ContentDoc
    {
        public const string Procedural = "procedural";

        public string MapType = Procedural;
        public string DefaultView;
        public List<string> AvailableViews = new List<string>();

        /// <summary>Ids dos eventos de clima que o mapa oferece no filtro.</summary>
        public List<string> Weathers = new List<string>();

        public override string Resource => "maps";
        public override string Kind => ContentKinds.Map;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("mapType", MapType)
                .Field("defaultView", DefaultView)
                .Field("availableViews", AvailableViews)
                .Field("weathers", Weathers);
        }
    }
}
