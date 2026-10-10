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

        /// <summary>
        /// Categoria principal: é a que abre a listagem no site e aparece no menu; as demais entram como
        /// sub-categoria. Só vai no JSON quando ligada, então quem não usa manda o mesmo documento de antes.
        /// </summary>
        public bool Primary;

        public CategoryDoc(string extId, string name, string appliesTo, bool primary = false)
        {
            ExtId = extId; Name = name; AppliesTo = appliesTo; Primary = primary;
        }

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("appliesTo", AppliesTo);
            if (Primary) w.Name("primary").Value(true);
        }
    }
}
