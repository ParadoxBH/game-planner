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

        /// <summary>
        /// Categoria principal: é a que abre a listagem no site e aparece no menu; as demais entram como
        /// sub-categoria. Não existe no GamePlannerCore, que sempre manda categoria comum.
        /// </summary>
        public bool Primary;

        public override string Resource => "categories";
        public override string Kind => ContentKinds.Category;

        public CategoryDoc() { }

        public CategoryDoc(string extId, string name, string appliesTo, bool primary = false)
        {
            ExtId = extId; Name = name; AppliesTo = appliesTo; Primary = primary;
        }

        protected override void WriteSpecific(JsonWriter w) => w.Field("appliesTo", AppliesTo).Field("primary", Primary);
    }
}
