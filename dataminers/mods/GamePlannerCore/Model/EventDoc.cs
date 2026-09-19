using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>
    /// Evento de jogo: temporada, clima, ataque... Conteúdo com eventos só aparece quando algum deles está
    /// ativo (qualquer um basta); sem eventos, aparece sempre.
    /// </summary>
    public sealed class EventDoc : ContentDoc
    {
        /// <summary>Tipo usado pelo site para agrupar climas no mapa.</summary>
        public const string Weather = "clima";

        /// <summary>Código [a-z_]; padrão "event".</summary>
        public string EventType;

        public override string Resource => "events";
        public override string Kind => ContentKinds.Event;

        public EventDoc() { }

        public EventDoc(string extId, string name, string eventType)
        {
            ExtId = extId; Name = name; EventType = eventType;
        }

        protected override void WriteSpecific(JsonWriter w) => w.Field("eventType", EventType);
    }
}
