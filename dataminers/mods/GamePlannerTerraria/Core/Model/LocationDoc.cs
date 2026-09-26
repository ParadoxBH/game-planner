using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>Local: bioma, região, POI, masmorra. Area (WKT) é opcional: bioma de mundo procedural não tem.</summary>
    public sealed class LocationDoc : ContentDoc
    {
        /// <summary>Código aberto [a-z_]; padrão "region".</summary>
        public string LocationType;

        /// <summary>Id do local que contém este.</summary>
        public string Parent;

        public string Map;

        /// <summary>WKT em coordenadas de jogo: POLYGON, MULTIPOLYGON ou POINT.</summary>
        public string Area;

        public override string Resource => "locations";
        public override string Kind => ContentKinds.Location;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("locationType", LocationType)
                .Field("parent", Parent)
                .Field("map", Map)
                .Field("area", Area);
        }
    }
}
