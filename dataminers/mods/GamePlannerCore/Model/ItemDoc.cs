using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    public sealed class ItemDoc : ContentDoc
    {
        public string RarityCode;
        public int? Level;
        public double? BaseBuyPrice;
        public double? BaseSellPrice;
        public Reference Currency;
        public string VariantOf;
        public List<string> Categories = new List<string>();

        /// <summary>Valores número, texto ou booleano. Chave segue a regra de id.</summary>
        public Dictionary<string, object> Attributes = new Dictionary<string, object>();

        public override string Resource => "items";
        public override string Kind => ContentKinds.Item;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("rarityCode", RarityCode)
                .Field("level", Level)
                .Field("baseBuyPrice", BaseBuyPrice)
                .Field("baseSellPrice", BaseSellPrice)
                .Field("currency", Currency)
                .Field("variantOf", VariantOf)
                .Field("categories", Categories)
                .Field("attributes", Attributes);
        }
    }
}
