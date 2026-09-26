using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>
    /// Onde algo aparece. Sem Position, vale para o Location inteiro (ex.: criatura que surge num bioma), e aí
    /// Location é obrigatório. Occupants é o que pode aparecer; Drops, o que o ponto larga além do drop da
    /// entidade. Events funciona como em todo conteúdo: basta um ativo.
    /// </summary>
    public sealed class SpawnPointDoc : ContentDoc
    {
        public string Map;
        public string Location;

        /// <summary>WKT de ponto, com ou sem Z.</summary>
        public string Position;

        /// <summary>Código [a-z_]: respawn, daily, weekly...</summary>
        public string RespawnMode;
        public int? RespawnDelayMinutes;
        public List<Occupant> Occupants = new List<Occupant>();
        public List<Drop> Drops = new List<Drop>();

        public override string Resource => "spawn-points";
        public override string Kind => ContentKinds.SpawnPoint;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("map", Map)
                .Field("location", Location)
                .Field("position", Position)
                .Field("respawnMode", RespawnMode)
                .Field("respawnDelayMinutes", RespawnDelayMinutes)
                .Field("occupants", Occupants)
                .Field("drops", Drops);
        }
    }
}
