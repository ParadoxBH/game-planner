using System.Collections.Generic;
using System.Linq;
using GamePlanner.ArcRaiders.Source;
using GamePlanner.Core.Model;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>
    /// ARCs (os robôs inimigos) como entidades: categoria ARC com a classe do site como sub-categoria, drops ligados
    /// aos itens e o resto da página (resistência, armadura, ataques, percepção, onde aparece) como atributos.
    /// </summary>
    public sealed class ArcEnemyMapper
    {
        private const string General = "ARC";
        private const string Attacks = "Ataques";
        private const string Perception = "Percepção";

        private readonly ArcContext _context;
        private readonly ArcCatalog _catalog;

        public ArcEnemyMapper(ArcContext context, ArcCatalog catalog)
        {
            _context = context;
            _catalog = catalog;
        }

        public void DefineAttributes()
        {
            Define("toughness", "Resistência", General, AttributeDefinitionDoc.Text);
            Define("toughness_level", "Nível de resistência", General, AttributeDefinitionDoc.Number);
            Define("armor_plates", "Placas de armadura", General, AttributeDefinitionDoc.Text);
            Define("destructible_parts", "Partes destrutíveis", General, AttributeDefinitionDoc.Text);
            Define("lootable_parts", "Partes saqueáveis", General, AttributeDefinitionDoc.Text);
            Define("spawn_count", "Locais de aparição", General, AttributeDefinitionDoc.Number);
            Define("spawn_maps", "Onde aparece", General, AttributeDefinitionDoc.Text);
            Define("destroy_xp", "XP ao destruir", General, AttributeDefinitionDoc.Number);
            Define("loot_xp", "XP ao saquear", General, AttributeDefinitionDoc.Number);
            Define("detect_range", "Detecta você a partir de", Perception, AttributeDefinitionDoc.Number, "m");
            Define("lose_range", "Perde você além de", Perception, AttributeDefinitionDoc.Number, "m");
            Define("field_of_view", "Campo de visão", Perception, AttributeDefinitionDoc.Number, "°");
        }

        private void Define(string key, string label, string group, string dataType, string unit = null)
        {
            int ordinal = _context.Dataset.AttributeDefinitions.Count(definition => definition.Group == group);
            _context.Dataset.Define(new AttributeDefinitionDoc(key, label, group, ordinal, unit) { DataType = dataType });
        }

        public void AddEnemies()
        {
            foreach ((string subject, string example) in _context.Source.ReadWarnings) _context.Warn(subject, example);
            if (_context.Source.Enemies.Count == 0)
            {
                _context.Warn("Nenhuma ARC encontrada: nem as páginas do site nem o bots.json do clone");
                return;
            }
            foreach (ArcEnemy enemy in _context.Source.Enemies) _context.Dataset.Add(Map(enemy));
        }

        private EntityDoc Map(ArcEnemy enemy)
        {
            var doc = new EntityDoc
            {
                ExtId = enemy.Id,
                Name = enemy.Name ?? enemy.Id,
                Summary = enemy.Subtitle,
                Description = enemy.Description,
                Categories = _catalog.ArcCategories(enemy.Class),
            };

            Set(doc, "toughness", enemy.Toughness);
            Set(doc, "toughness_level", enemy.ToughnessLevel);
            Set(doc, "armor_plates", Join(enemy.Plates));
            Set(doc, "destructible_parts", Join(enemy.Parts));
            Set(doc, "lootable_parts", Join(enemy.LootableParts));
            Set(doc, "spawn_count", enemy.SpawnTotal);
            Set(doc, "spawn_maps", enemy.Spawns.Count == 0 ? null
                : string.Join("\n", enemy.Spawns.Select(spawn => spawn.Detail == null ? spawn.Map : spawn.Map + ": " + spawn.Detail)));
            Set(doc, "destroy_xp", enemy.DestroyXp);
            Set(doc, "loot_xp", enemy.LootXp);
            Set(doc, "detect_range", enemy.DetectRange);
            Set(doc, "lose_range", enemy.LoseRange);
            Set(doc, "field_of_view", enemy.FieldOfView);

            foreach ((string key, string label, double damage) in enemy.Attacks)
            {
                string attribute = "attack_" + key;
                if (_context.Dataset.AttributeDefinitions.All(definition => definition.Key != attribute))
                    Define(attribute, label, Attacks, AttributeDefinitionDoc.Number);
                doc.Attributes[attribute] = damage;
            }

            foreach (string item in enemy.Drops)
            {
                if (!_context.Source.ItemsById.ContainsKey(item)) _context.Warn("Drop de ARC que não está entre os itens", enemy.Id + " -> " + item);
                doc.Drops.Add(new Drop(Reference.Item(item), 1));
            }

            if (_context.Source.Image("arcs", enemy.Id) is byte[] image)
            {
                string key = "arcs/" + enemy.Id;
                _context.Dataset.Images[key] = image;
                doc.IconImage = key;
            }
            else _context.Warn("ARC sem imagem", enemy.Id);
            return doc;
        }

        private static void Set(EntityDoc doc, string key, object value)
        {
            if (value != null) doc.Attributes[key] = value is int number ? (double)number : value;
        }

        private static string Join(List<string> values) => values.Count == 0 ? null : string.Join(", ", values);
    }
}
