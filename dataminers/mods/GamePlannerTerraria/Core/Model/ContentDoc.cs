using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>
    /// Campos comuns a todo conteúdo da API. IconImage é a chave de uma imagem em MinedDataset.Images:
    /// o envio troca pela mídia enviada. Media nulo não vai no JSON, e aí o servidor mantém as imagens
    /// que já estavam ligadas.
    /// </summary>
    public abstract class ContentDoc : IJsonWritable
    {
        public string ExtId;
        public string Name;
        public string Summary;
        public string Description;
        public List<string> Events = new List<string>();

        /// <summary>Não vai para a API. Chave da imagem de ícone no dataset.</summary>
        public string IconImage;

        /// <summary>Preenchido pelo envio a partir de IconImage.</summary>
        public List<MediaLink> Media;

        /// <summary>Segmento da coleção na URL: "items", "entities", "recipes"...</summary>
        public abstract string Resource { get; }

        /// <summary>Tipo usado nas referências ("item", "entity"...).</summary>
        public abstract string Kind { get; }

        public void WriteJson(JsonWriter w)
        {
            w.BeginObject()
                .Field("extId", ExtId)
                .Field("name", Name)
                .Field("summary", Summary)
                .Field("description", Description);
            if (Media != null)
            {
                w.Name("media").BeginArray();
                foreach (MediaLink link in Media) w.Value(link);
                w.EndArray();
            }
            WriteSpecific(w);
            w.Field("events", Events);
            w.EndObject();
        }

        protected abstract void WriteSpecific(JsonWriter w);

        public Reference ToReference() => new Reference(Kind, ExtId);
    }
}
