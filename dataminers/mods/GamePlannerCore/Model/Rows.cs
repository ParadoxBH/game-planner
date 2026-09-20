using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>Tipos de conteúdo usados em referências.</summary>
    public static class ContentKinds
    {
        public const string Item = "item";
        public const string Entity = "entity";
        public const string Category = "category";
        public const string Recipe = "recipe";
        public const string Event = "event";
        public const string Map = "map";
        public const string Location = "location";
        public const string SpawnPoint = "spawn_point";
    }

    /// <summary>Referência a outro conteúdo, que pode ainda não estar cadastrado.</summary>
    public sealed class Reference : IJsonWritable
    {
        public string Kind;
        public string ExtId;

        public Reference(string kind, string extId) { Kind = kind; ExtId = extId; }

        public static Reference Item(string extId) => new Reference(ContentKinds.Item, extId);
        public static Reference Entity(string extId) => new Reference(ContentKinds.Entity, extId);

        public void WriteJson(JsonWriter w) => w.BeginObject().Field("kind", Kind).Field("extId", ExtId).EndObject();
    }

    /// <summary>
    /// Ingrediente de receita ou requisito de entidade. Amount precisa ser positivo.
    /// Level exige o alvo num nível; LevelOperator diz como comparar ("exact", "min" ou "max") e,
    /// vazio, vale exact. Sem Level, qualquer nível serve.
    /// </summary>
    public sealed class Requirement : IJsonWritable
    {
        public Reference Target;
        public double Amount;
        public bool NotConsumed;
        public int? Level;
        public string LevelOperator;

        public Requirement(Reference target, double amount, bool notConsumed = false, int? level = null,
            string levelOperator = null)
        {
            Target = target; Amount = amount; NotConsumed = notConsumed; Level = level; LevelOperator = levelOperator;
        }

        public void WriteJson(JsonWriter w)
        {
            w.BeginObject().Field("target", Target).Name("amount").Value(Amount);
            if (NotConsumed) w.Name("notConsumed").Value(true);
            w.Field("level", Level).Field("levelOperator", LevelOperator).EndObject();
        }
    }

    /// <summary>Drop de entidade. Chance de 0 a 1; MaxAmount, quando há, não é menor que Amount.</summary>
    public sealed class Drop : IJsonWritable
    {
        public Reference Target;
        public double? Chance;
        public double Amount;
        public double? MaxAmount;

        public Drop(Reference target, double amount, double? maxAmount = null, double? chance = null)
        {
            Target = target; Amount = amount; MaxAmount = maxAmount; Chance = chance;
        }

        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("target", Target)
            .Field("chance", Chance)
            .Name("amount").Value(Amount)
            .Field("maxAmount", MaxAmount)
            .EndObject();
    }

    /// <summary>O que pode aparecer num ponto de surgimento. Chance de 0 a 1; quantidades opcionais e positivas.</summary>
    public sealed class Occupant : IJsonWritable
    {
        public Reference Target;
        public double? Chance;
        public double? Amount;
        public double? MaxAmount;

        public Occupant(Reference target, double? chance = null, double? amount = null, double? maxAmount = null)
        {
            Target = target; Chance = chance; Amount = amount; MaxAmount = maxAmount;
        }

        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("target", Target)
            .Field("chance", Chance)
            .Field("amount", Amount)
            .Field("maxAmount", MaxAmount)
            .EndObject();
    }

    /// <summary>Produto de receita. Level é a qualidade do que sai (upgrade).</summary>
    public sealed class RecipeOutput : IJsonWritable
    {
        public Reference Target;
        public double Amount;
        public double? Chance;
        public int? Level;

        public RecipeOutput(Reference target, double amount, int? level = null)
        {
            Target = target; Amount = amount; Level = level;
        }

        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("target", Target)
            .Name("amount").Value(Amount)
            .Field("chance", Chance)
            .Field("level", Level)
            .EndObject();
    }

    /// <summary>Condição para liberar a receita: precisa de Target ou Value. Type é código [a-z_].</summary>
    public sealed class RecipeUnlock : IJsonWritable
    {
        public string Type;
        public Reference Target;
        public string Value;

        public RecipeUnlock(string type, Reference target = null, string value = null)
        {
            Type = type; Target = target; Value = value;
        }

        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("type", Type)
            .Field("target", Target)
            .Field("value", Value)
            .EndObject();
    }

    /// <summary>Imagem ligada ao conteúdo. Usos aceitos dependem do tipo (item: icon, screenshot).</summary>
    public sealed class MediaLink : IJsonWritable
    {
        public string Usage;
        public string MediaId;

        public MediaLink(string usage, string mediaId) { Usage = usage; MediaId = mediaId; }

        public void WriteJson(JsonWriter w) => w.BeginObject().Field("usage", Usage).Field("mediaId", MediaId).EndObject();
    }
}
