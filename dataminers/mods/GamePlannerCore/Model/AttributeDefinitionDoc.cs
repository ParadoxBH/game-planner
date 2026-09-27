using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>
    /// Como um atributo aparece no site: rótulo, unidade, grupo (seção do detalhe e do filtro: Dano, Comida...)
    /// e ordem dentro do grupo. Vai no PUT /attributes em lote. DataType vazio é deduzido dos valores minerados
    /// (MinedDataset.CompleteAttributeTypes): com definição, o servidor passa a conferir o tipo de cada valor.
    /// </summary>
    public sealed class AttributeDefinitionDoc : IJsonWritable
    {
        public const string Number = "number";
        public const string Text = "text";
        public const string Boolean = "boolean";

        public string Key;
        public string Label;
        public string Unit;
        public string Group;
        public int Ordinal;
        public string DataType;

        public AttributeDefinitionDoc(string key, string label, string group, int ordinal, string unit = null)
        {
            Key = key; Label = label; Group = group; Ordinal = ordinal; Unit = unit;
        }

        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("key", Key)
            .Field("label", Label)
            .Field("dataType", DataType ?? Number)
            .Field("unit", Unit)
            .Field("group", Group)
            .Field("ordinal", Ordinal)
            .EndObject();
    }
}
