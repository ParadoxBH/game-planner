using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>
    /// Raridade do jogo: é o que dá significado (nome e cor) ao rarityCode de item e entidade. Não é um
    /// conteúdo — vai por PUT /games/{jogo}/rarities/{código}, um por vez, antes dos documentos.
    ///
    /// Para jogo que já traz nome e cor de cada raridade (Terraria, ARC Raiders). Quem não manda nenhuma, como o
    /// Valheim e o How to Fish, continua cadastrando as raridades à mão no site.
    /// </summary>
    public sealed class RarityDoc : IJsonWritable
    {
        public string Code;
        public string Name;

        /// <summary>Hexadecimal com # na frente, ex.: #CAC2AD.</summary>
        public string Color;

        /// <summary>Ordem de exibição, do mais comum para o mais raro.</summary>
        public int Ordinal;

        public RarityDoc(string code, string name, string color, int ordinal)
        {
            Code = code; Name = name; Color = color; Ordinal = ordinal;
        }

        /// <summary>Corpo do PUT: o código vai na URL.</summary>
        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("name", Name)
            .Field("color", Color)
            .Field("ordinal", Ordinal)
            .EndObject();
    }
}
