using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    public sealed class CategoryDoc : ContentDoc
    {
        public const string ForItem = "item";
        public const string ForEntity = "entity";
        public const string ForBoth = "both";

        /// <summary>item, entity ou both.</summary>
        public string AppliesTo = ForBoth;

        public override string Resource => "categories";
        public override string Kind => ContentKinds.Category;

        public CategoryDoc() { }

        public CategoryDoc(string extId, string name, string appliesTo)
        {
            ExtId = extId; Name = name; AppliesTo = appliesTo;
        }

        protected override void WriteSpecific(JsonWriter w) => w.Field("appliesTo", AppliesTo);
    }
}
