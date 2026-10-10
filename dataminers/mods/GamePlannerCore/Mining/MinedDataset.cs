using System.Collections.Generic;
using GamePlanner.Core.Model;

namespace GamePlanner.Core.Mining
{
    /// <summary>
    /// Tudo que o minerador achou, já no formato da API, mais as imagens em PNG. É dado puro: depois de
    /// montado na thread principal pode ir para a thread de envio sem tocar em nada da Unity.
    /// </summary>
    public sealed class MinedDataset
    {
        public readonly string GameId;
        public readonly string GameName;

        public readonly List<CategoryDoc> Categories = new List<CategoryDoc>();
        public readonly List<EventDoc> Events = new List<EventDoc>();
        public readonly List<ItemDoc> Items = new List<ItemDoc>();
        public readonly List<EntityDoc> Entities = new List<EntityDoc>();
        public readonly List<RecipeDoc> Recipes = new List<RecipeDoc>();
        public readonly List<ShopDoc> Shops = new List<ShopDoc>();
        public readonly List<ShopCategoryDoc> ShopCategories = new List<ShopCategoryDoc>();
        public readonly List<MapDoc> Maps = new List<MapDoc>();
        public readonly List<LocationDoc> Locations = new List<LocationDoc>();
        public readonly List<SpawnPointDoc> SpawnPoints = new List<SpawnPointDoc>();

        /// <summary>
        /// Rótulo, unidade e grupo dos atributos de itens e entidades, pela chave. Vão antes dos documentos; o tipo
        /// vazio é deduzido dos valores (CompleteAttributeTypes).
        /// </summary>
        public readonly List<AttributeDefinitionDoc> AttributeDefinitions = new List<AttributeDefinitionDoc>();

        /// <summary>Raridades do jogo, enviadas antes dos documentos que as citam em RarityCode.</summary>
        public readonly List<RarityDoc> Rarities = new List<RarityDoc>();

        /// <summary>Chave da imagem -> PNG. Os documentos apontam para a chave em IconImage.</summary>
        public readonly Dictionary<string, byte[]> Images = new Dictionary<string, byte[]>();

        public readonly List<string> Warnings = new List<string>();

        private readonly HashSet<string> _ids = new HashSet<string>();

        public MinedDataset(string gameId, string gameName)
        {
            GameId = gameId;
            GameName = gameName;
        }

        /// <summary>Na ordem de envio: o que é citado vai antes de quem cita (referência pendente também é aceita).</summary>
        public IEnumerable<IReadOnlyList<ContentDoc>> Resources()
        {
            yield return Categories;
            yield return Events;
            yield return Items;
            yield return Entities;
            yield return Recipes;
            yield return Shops;
            yield return ShopCategories;
            yield return Maps;
            yield return Locations;
            yield return SpawnPoints;
        }

        public bool Add(CategoryDoc doc) => Add(Categories, doc);
        public bool Add(EventDoc doc) => Add(Events, doc);
        public bool Add(ItemDoc doc) => Add(Items, doc);
        public bool Add(EntityDoc doc) => Add(Entities, doc);
        public bool Add(RecipeDoc doc) => Add(Recipes, doc);
        public bool Add(ShopDoc doc) => Add(Shops, doc);
        public bool Add(ShopCategoryDoc doc) => Add(ShopCategories, doc);
        public bool Add(MapDoc doc) => Add(Maps, doc);
        public bool Add(LocationDoc doc) => Add(Locations, doc);
        public bool Add(SpawnPointDoc doc) => Add(SpawnPoints, doc);

        /// <summary>Raridade repetida fica com o primeiro cadastro.</summary>
        public bool Add(RarityDoc rarity)
        {
            if (rarity == null || string.IsNullOrEmpty(rarity.Code)) return false;
            foreach (RarityDoc existing in Rarities)
                if (existing.Code == rarity.Code) return false;
            Rarities.Add(rarity);
            return true;
        }

        /// <summary>Definição de atributo; chave repetida fica a primeira.</summary>
        public void Define(AttributeDefinitionDoc definition)
        {
            if (definition == null || string.IsNullOrEmpty(definition.Key)) return;
            foreach (AttributeDefinitionDoc existing in AttributeDefinitions)
                if (existing.Key == definition.Key) return;
            AttributeDefinitions.Add(definition);
        }

        /// <summary>
        /// As definições que valem para o envio: só as de atributos que algum item ou entidade tem, com o tipo
        /// deduzido dos valores quando a definição não diz. Chave com valores de tipos diferentes fica sem
        /// definição (vira aviso): com ela, o servidor recusaria os valores do outro tipo.
        /// </summary>
        public List<AttributeDefinitionDoc> CompleteAttributeTypes()
        {
            var types = new Dictionary<string, string>();
            var mixed = new HashSet<string>();
            void Scan(Dictionary<string, object> attributes)
            {
                foreach (KeyValuePair<string, object> attribute in attributes)
                {
                    string type = attribute.Value is bool ? AttributeDefinitionDoc.Boolean
                        : attribute.Value is string ? AttributeDefinitionDoc.Text
                        : AttributeDefinitionDoc.Number;
                    if (types.TryGetValue(attribute.Key, out string seen) && seen != type) mixed.Add(attribute.Key);
                    else types[attribute.Key] = type;
                }
            }
            foreach (ItemDoc item in Items) Scan(item.Attributes);
            foreach (EntityDoc entity in Entities) Scan(entity.Attributes);

            var used = new List<AttributeDefinitionDoc>();
            foreach (AttributeDefinitionDoc definition in AttributeDefinitions)
            {
                if (!types.TryGetValue(definition.Key, out string type)) continue;
                if (mixed.Contains(definition.Key))
                {
                    Warn("Atributo '" + definition.Key + "' tem valores de tipos diferentes: enviado sem definição");
                    continue;
                }
                if (definition.DataType == null) definition.DataType = type;
                used.Add(definition);
            }
            return used;
        }

        /// <summary>resource é o segmento da URL: "entities", "spawn-points"...</summary>
        public bool Contains(string resource, string extId) => _ids.Contains(resource + "/" + extId);

        public void Warn(string message) => Warnings.Add(message);

        public int DocumentCount
        {
            get
            {
                int total = 0;
                foreach (IReadOnlyList<ContentDoc> documents in Resources()) total += documents.Count;
                return total;
            }
        }

        /// <summary>Id repetido no mesmo recurso: fica o primeiro e o segundo vira aviso.</summary>
        private bool Add<T>(List<T> list, T doc) where T : ContentDoc
        {
            if (doc == null || string.IsNullOrEmpty(doc.ExtId))
            {
                Warn("Documento sem id ignorado" + (doc?.Name != null ? ": " + doc.Name : ""));
                return false;
            }
            if (!_ids.Add(doc.Resource + "/" + doc.ExtId))
            {
                Warn(doc.Resource + " '" + doc.ExtId + "' repetido: ficou o primeiro");
                return false;
            }
            list.Add(doc);
            return true;
        }
    }
}
