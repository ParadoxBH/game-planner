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
        public const string Shop = "shop";
        public const string ShopCategory = "shop_category";
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

    /// <summary>
    /// O que pode aparecer num ponto de surgimento. Chance de 0 a 1; quantidades opcionais e positivas.
    /// Level é o nível em que o alvo está ali — só quando é um só, porque faixa vira condição "level".
    /// </summary>
    public sealed class Occupant : IJsonWritable
    {
        public Reference Target;
        public double? Chance;
        public double? Amount;
        public double? MaxAmount;
        public int? Level;

        public Occupant(Reference target, double? chance = null, double? amount = null, double? maxAmount = null,
                        int? level = null)
        {
            Target = target; Chance = chance; Amount = amount; MaxAmount = maxAmount; Level = level;
        }

        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("target", Target)
            .Field("chance", Chance)
            .Field("amount", Amount)
            .Field("maxAmount", MaxAmount)
            .Field("level", Level)
            .EndObject();
    }

    /// <summary>
    /// Vocabulário de condições de surgimento, compartilhado entre os jogos. O que cada tipo
    /// significa e como as linhas se combinam está em doc/spawn_and_spatial.md.
    /// </summary>
    public static class ConditionTypes
    {
        // Filtram: valem contra uma amostra do mundo.
        public const string Altitude = "altitude";
        public const string Depth = "depth";
        public const string TimeOfDay = "time_of_day";
        public const string BiomeArea = "biome_area";
        public const string Forest = "forest";
        public const string Weather = "weather";
        public const string Progress = "progress";
        public const string DistanceFromCenter = "distance_from_center";
        public const string WaterSurface = "water_surface";
        public const string NearBase = "near_base";
        public const string KnownItem = "known_item";

        // Descritivos: aparecem na tela, não filtram.
        public const string Level = "level";
        public const string LevelUpChance = "level_up_chance";
        public const string MaxAlive = "max_alive";
        public const string MaxTotal = "max_total";
        public const string SpawnInterval = "spawn_interval";
        public const string PerZone = "per_zone";
        public const string HuntsPlayer = "hunts_player";
        public const string Duration = "duration";
        public const string DungeonRoom = "dungeon_room";

        // Valores fechados dos tipos de código.
        public const string Day = "day";
        public const string Night = "night";
        public const string Edge = "edge";
        public const string Interior = "interior";
        public const string Inside = "inside";
        public const string Outside = "outside";
    }

    /// <summary>
    /// Condição para o ponto valer. Linhas de tipos diferentes valem juntas (E); do mesmo tipo,
    /// basta uma (OU) — é assim que se expressa conjunto. Negated inverte a linha.
    ///
    /// Use Value para código, Target para conteúdo (clima, chefe), Min/Max para faixa inclusiva
    /// (nulo é sem limite) e só o Type para bandeira. Grandeza única vai com Min igual a Max.
    /// </summary>
    public sealed class SpawnConditionRow : IJsonWritable
    {
        public string Type;
        public string Value;
        public Reference Target;
        public double? Min;
        public double? Max;
        public bool Negated;

        public SpawnConditionRow(string type)
        {
            Type = type;
        }

        public static SpawnConditionRow Flag(string type) => new SpawnConditionRow(type);

        public static SpawnConditionRow Code(string type, string value) =>
            new SpawnConditionRow(type) { Value = value };

        public static SpawnConditionRow Of(string type, Reference target) =>
            new SpawnConditionRow(type) { Target = target };

        public static SpawnConditionRow Range(string type, double? min, double? max) =>
            new SpawnConditionRow(type) { Min = min, Max = max };

        public static SpawnConditionRow Scalar(string type, double value) =>
            new SpawnConditionRow(type) { Min = value, Max = value };

        /// <summary>Marca a linha como "não vale quando isto acontece".</summary>
        public SpawnConditionRow Not()
        {
            Negated = true;
            return this;
        }

        public void WriteJson(JsonWriter w)
        {
            w.BeginObject()
                .Field("type", Type)
                .Field("value", Value)
                .Field("target", Target)
                .Field("min", Min)
                .Field("max", Max);
            if (Negated) w.Name("negated").Value(true);
            w.EndObject();
        }
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

    /// <summary>
    /// O que a receita muda num atributo de um item: Add soma, Percent soma a porcentagem do valor atual e Set fixa
    /// o valor (número, texto ou booleano). Target nulo é o item que a receita melhora (o produto que também entra
    /// como ingrediente); acessório que muda outra arma leva a arma no Target.
    /// </summary>
    public sealed class RecipeModifier : IJsonWritable
    {
        public const string Add = "add";
        public const string Percent = "percent";
        public const string Set = "set";

        public Reference Target;
        public string Attribute;
        public string Operation;
        public object Value;

        public RecipeModifier(string attribute, string operation, object value, Reference target = null)
        {
            Attribute = attribute; Operation = operation; Value = value; Target = target;
        }

        public void WriteJson(JsonWriter w)
        {
            w.BeginObject()
                .Field("target", Target)
                .Field("attribute", Attribute)
                .Field("operation", Operation)
                .Name("value").Any(Value);
            w.EndObject();
        }
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
