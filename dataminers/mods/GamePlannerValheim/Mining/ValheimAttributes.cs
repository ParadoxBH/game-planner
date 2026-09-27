using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Rótulo, grupo e unidade dos atributos que os mineradores do Valheim gravam (ItemMiner, CreatureMiner,
    /// PieceMiner, WorldResourceMiner). O site mostra o detalhe em seções por grupo e o filtro de atributo agrupa
    /// igual. Chave nova sem entrada aqui aparece com a própria chave, em "Outros".
    /// </summary>
    internal static class ValheimAttributes
    {
        private const string Damage = "Dano";
        private const string DamagePerLevel = "Dano por nível";
        private const string Defense = "Defesa";
        private const string Food = "Comida";
        private const string General = "Geral";
        private const string Tool = "Ferramenta";
        private const string Set = "Conjunto";
        private const string Creature = "Criatura";
        private const string Building = "Construção";

        /// <summary>Tipos de dano na ordem da tela de inventário do jogo.</summary>
        private static readonly string[][] DamageTypes =
        {
            new[] { "base", "Dano bruto" },
            new[] { "blunt", "Impacto" },
            new[] { "slash", "Cortante" },
            new[] { "pierce", "Perfurante" },
            new[] { "chop", "Corte de árvore" },
            new[] { "pickaxe", "Mineração" },
            new[] { "fire", "Fogo" },
            new[] { "frost", "Gelo" },
            new[] { "lightning", "Raio" },
            new[] { "poison", "Veneno" },
            new[] { "spirit", "Espírito" },
        };

        public static void Register(MinedDataset dataset)
        {
            for (int i = 0; i < DamageTypes.Length; i++)
            {
                dataset.Define(new AttributeDefinitionDoc("damage_" + DamageTypes[i][0], DamageTypes[i][1], Damage, i));
                dataset.Define(new AttributeDefinitionDoc("damage_per_level_" + DamageTypes[i][0], DamageTypes[i][1], DamagePerLevel, i));
            }

            dataset.Define(new AttributeDefinitionDoc("armor", "Armadura", Defense, 0));
            dataset.Define(new AttributeDefinitionDoc("armor_per_level", "Armadura por nível", Defense, 1));
            dataset.Define(new AttributeDefinitionDoc("block_power", "Bloqueio", Defense, 2));
            dataset.Define(new AttributeDefinitionDoc("block_power_per_level", "Bloqueio por nível", Defense, 3));

            dataset.Define(new AttributeDefinitionDoc("food_health", "Vida", Food, 0));
            dataset.Define(new AttributeDefinitionDoc("food_stamina", "Vigor", Food, 1));
            dataset.Define(new AttributeDefinitionDoc("food_eitr", "Eitr", Food, 2));
            dataset.Define(new AttributeDefinitionDoc("food_regen", "Regeneração", Food, 3, "/tick"));
            dataset.Define(new AttributeDefinitionDoc("food_duration_seconds", "Duração", Food, 4, "s"));

            dataset.Define(new AttributeDefinitionDoc("skill", "Habilidade", Tool, 0));
            dataset.Define(new AttributeDefinitionDoc("tool_tier", "Nível da ferramenta", Tool, 1));
            dataset.Define(new AttributeDefinitionDoc("durability", "Durabilidade", Tool, 2));
            dataset.Define(new AttributeDefinitionDoc("durability_per_level", "Durabilidade por nível", Tool, 3));

            dataset.Define(new AttributeDefinitionDoc("weight", "Peso", General, 0));
            dataset.Define(new AttributeDefinitionDoc("max_stack", "Pilha máxima", General, 1));
            dataset.Define(new AttributeDefinitionDoc("max_quality", "Nível máximo", General, 2));
            dataset.Define(new AttributeDefinitionDoc("movement_modifier", "Velocidade de movimento", General, 3));
            dataset.Define(new AttributeDefinitionDoc("teleportable", "Teleportável", General, 4));

            dataset.Define(new AttributeDefinitionDoc("set", "Conjunto", Set, 0));
            dataset.Define(new AttributeDefinitionDoc("set_size", "Peças do conjunto", Set, 1));

            dataset.Define(new AttributeDefinitionDoc("health", "Vida", Creature, 0));
            dataset.Define(new AttributeDefinitionDoc("faction", "Facção", Creature, 1));
            dataset.Define(new AttributeDefinitionDoc("group", "Grupo", Creature, 2));
            dataset.Define(new AttributeDefinitionDoc("min_tool_tier", "Ferramenta mínima", Creature, 3));
            dataset.Define(new AttributeDefinitionDoc("min_depth", "Profundidade mínima", Creature, 4, "m"));
            dataset.Define(new AttributeDefinitionDoc("max_depth", "Profundidade máxima", Creature, 5, "m"));

            dataset.Define(new AttributeDefinitionDoc("comfort", "Conforto", Building, 0));
            dataset.Define(new AttributeDefinitionDoc("comfort_group", "Grupo de conforto", Building, 1));
            dataset.Define(new AttributeDefinitionDoc("seconds_per_unit", "Tempo por unidade", Building, 2, "s"));
        }
    }
}
