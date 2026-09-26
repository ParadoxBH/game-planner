using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>Criatura, NPC, bancada, construção, recurso coletável... tudo que não é item.</summary>
    public sealed class EntityDoc : ContentDoc
    {
        public string RarityCode;
        public int? Level;
        public int? RespawnDelayMinutes;
        public double? BaseBuyPrice;
        public double? BaseSellPrice;
        public string VariantOf;
        public List<string> Categories = new List<string>();
        public Dictionary<string, object> Attributes = new Dictionary<string, object>();
        public List<Requirement> Requirements = new List<Requirement>();
        public List<Drop> Drops = new List<Drop>();

        public override string Resource => "entities";
        public override string Kind => ContentKinds.Entity;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("rarityCode", RarityCode)
                .Field("level", Level)
                .Field("respawnDelayMinutes", RespawnDelayMinutes)
                .Field("baseBuyPrice", BaseBuyPrice)
                .Field("baseSellPrice", BaseSellPrice)
                .Field("variantOf", VariantOf)
                .Field("categories", Categories)
                .Field("attributes", Attributes)
                .Field("requirements", Requirements)
                .Field("drops", Drops);
        }
    }
}
