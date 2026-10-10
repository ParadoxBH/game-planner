using System;
using System.Collections.Generic;
using System.Linq;
using GamePlanner.Core.Model;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>
    /// Raridades e categorias. Os nomes vêm do pt-BR da interface do arctracker (seções Rarity e ItemTypes);
    /// o que falta lá sai com o nome em inglês e um aviso.
    ///
    /// Os 23 tipos do jogo são muitos para o menu do site, então viram sub-categorias de poucos grupos
    /// principais (Armas, Equipamentos, Materiais...). Item de arma vai para Armas mesmo com tipo "Special".
    /// </summary>
    public sealed class ArcCatalog
    {
        public const string Stations = "stations";
        public const string Traders = "traders";
        public const string Others = "others";
        public const string CurrencyType = "type_currency";

        private sealed class Group
        {
            public readonly string Id;
            public readonly string Name;
            public readonly string[] Types;

            public Group(string id, string name, params string[] types) { Id = id; Name = name; Types = types; }
        }

        private static readonly Group Weapons = new Group("weapons", "Armas",
            "Assault Rifle", "Battle Rifle", "SMG", "Pistol", "Hand Cannon", "Shotgun", "LMG", "Sniper Rifle", "Weapon");

        private static readonly Group[] Groups =
        {
            Weapons,
            new Group("gear", "Equipamentos",
                "Augment", "Shield", "Modification", "Ammunition", "Quick Use", "Backpack Attachment", "Backpack Charm",
                "Outfit", "Cosmetic", "Stencil"),
            new Group("materials", "Materiais",
                "Basic Material", "Topside Material", "Refined Material", "Nature", "Recyclable", "Key Material", "Material"),
            new Group("trinkets", "Bugigangas", "Trinket", "Valuable"),
            new Group("blueprints", "Esquemas", "Blueprint"),
            new Group("keys", "Chaves", "Key"),
            new Group("outposts", "Posto avançado", "Outpost Furniture", "Outpost Room", "Design"),
            new Group("research", "Pesquisas", "Research"),
            new Group(Others, "Outros"),
        };

        /// <summary>
        /// Tipos que nem o pt-BR da interface do arctracker traduz (o próprio site os mostra em inglês), ou que só
        /// existem na versão nova e faltam no arquivo de tradução do repositório.
        /// </summary>
        private static readonly Dictionary<string, string> TypeNames = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            { "Outpost Furniture", "Móvel do posto avançado" },
            { "Outpost Room", "Sala do posto avançado" },
            { "Research", "Pesquisa" },
            { "Design", "Projeto" },
            { "Stencil", "Estêncil" },
        };

        /// <summary>Do mais comum para o mais raro, com a cor do jogo. As cores podem ser ajustadas no site.</summary>
        private static readonly (string English, string Color)[] RarityOrder =
        {
            ("Common", "#A0A4A8"),
            ("Uncommon", "#4CAF50"),
            ("Rare", "#2D9CDB"),
            ("Epic", "#B05CE0"),
            ("Legendary", "#F2B233"),
        };

        private readonly ArcContext _context;
        private readonly HashSet<string> _categories = new HashSet<string>(StringComparer.Ordinal);

        public ArcCatalog(ArcContext context)
        {
            _context = context;
        }

        // ------------------------------------------------------------------ raridades

        public void AddRarities()
        {
            for (int i = 0; i < RarityOrder.Length; i++)
            {
                (string english, string color) = RarityOrder[i];
                _context.Dataset.Add(new RarityDoc(RarityCode(english), RarityName(english), color, i));
            }
        }

        /// <summary>Código da raridade do item; raridade fora da lista é cadastrada no fim, em cinza.</summary>
        public string Rarity(string english)
        {
            if (english == null) return null;
            string code = RarityCode(english);
            if (_context.Dataset.Rarities.All(rarity => rarity.Code != code))
            {
                _context.Dataset.Add(new RarityDoc(code, RarityName(english), "#A0A4A8", _context.Dataset.Rarities.Count));
                _context.Warn("Raridade sem cor definida, cadastrada em cinza", english);
            }
            return code;
        }

        private static string RarityCode(string english) => Fields.Slug(english);

        private string RarityName(string english) => _context.Source.UiText("Rarity", english) ?? english;

        // ------------------------------------------------------------------ categorias

        /// <summary>Grupo principal e sub-categoria do tipo, criando as duas na primeira vez.</summary>
        public List<string> ItemCategories(string type, bool isWeapon)
        {
            Group group = isWeapon ? Weapons : Groups.FirstOrDefault(g => type != null && g.Types.Contains(type)) ?? Groups[^1];
            var result = new List<string> { Ensure(group.Id, group.Name, CategoryDoc.ForItem, primary: true) };
            if (type != null)
            {
                string name = _context.Source.UiText("ItemTypes", type) ?? TypeNames.GetValueOrDefault(type);
                if (name == null) _context.Warn("Tipo de item sem tradução, ficou em inglês", type);
                result.Add(Ensure("type_" + Fields.Slug(type), name ?? type, CategoryDoc.ForItem, primary: false));
            }
            return result;
        }

        /// <summary>Moedas criadas pela ferramenta (coins, creds), que o repositório não tem como item.</summary>
        public List<string> CurrencyCategories() => new List<string>
        {
            Ensure(Others, "Outros", CategoryDoc.ForItem, primary: true),
            Ensure(CurrencyType, "Moeda", CategoryDoc.ForItem, primary: false),
        };

        /// <summary>Módulos da oficina (bancadas, estoque, Sucatinha) e as ações de reciclar, recuperar e fabricar em incursão.</summary>
        public string StationCategory() => Ensure(Stations, "Oficina", CategoryDoc.ForEntity, primary: true);

        public string TraderCategory() => Ensure(Traders, "Comerciantes", CategoryDoc.ForEntity, primary: true);

        private string Ensure(string id, string name, string appliesTo, bool primary)
        {
            if (_categories.Add(id)) _context.Dataset.Add(new CategoryDoc(id, name, appliesTo, primary));
            return id;
        }
    }
}
