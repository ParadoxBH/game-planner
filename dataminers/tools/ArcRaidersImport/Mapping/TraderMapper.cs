using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using GamePlanner.Core.Model;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>
    /// Comerciantes (Celeste, Shani, Lance, Tian Wen, Apollo) como entidades, cada um com a sua loja. O que cada um
    /// vende está no próprio item (vendors) e vai para categorias da loja pelo nível exigido, que é como o jogo
    /// libera. O preço é em moedas, creds ou num item (sementes, aperfeiçoamento) — tudo vira item de moeda.
    /// O trades.json do repositório não é usado: parou antes da 2.0 e tem os mesmos dados, só que velhos.
    /// </summary>
    public sealed class TraderMapper
    {
        private const int Daily = 86_400;
        private const int Hourly = 3_600;

        private readonly ArcContext _context;
        private readonly ArcCatalog _catalog;

        public TraderMapper(ArcContext context, ArcCatalog catalog)
        {
            _context = context;
            _catalog = catalog;
        }

        public void AddTraders()
        {
            // Uma linha por oferta, com o item vendido junto (o vendors não repete o id do item).
            List<(string ItemId, JsonObject Offer)> offers = _context.Source.Items
                .SelectMany(item => (item["vendors"] as JsonArray)?.OfType<JsonObject>()
                                    .Select(offer => (Fields.String(item["id"]), offer))
                                ?? Enumerable.Empty<(string, JsonObject)>())
                .Where(entry => entry.Item1 != null && Fields.String(entry.offer["trader"]) != null)
                .ToList();
            if (offers.Count == 0)
            {
                _context.Warn("Nenhum item com vendors: comerciantes e lojas não foram montados");
                return;
            }

            foreach (IGrouping<string, (string ItemId, JsonObject Offer)> trader in offers
                         .GroupBy(entry => Fields.String(entry.Offer["trader"]))
                         .OrderBy(group => group.Key, System.StringComparer.Ordinal))
            {
                string traderId = Fields.Slug(trader.Key);
                AddTraderEntity(traderId, trader.Key);

                string shopId = "shop_" + traderId;
                var shop = new ShopDoc { ExtId = shopId, Name = "Loja de " + trader.Key, Npc = traderId };

                foreach (IGrouping<int?, (string ItemId, JsonObject Offer)> tier in trader
                             .GroupBy(entry => Fields.Int(entry.Offer["requiredLevel"]))
                             .OrderBy(group => group.Key ?? 0))
                {
                    var category = new ShopCategoryDoc
                    {
                        ExtId = shopId + (tier.Key is int level ? "_level_" + level : "_base"),
                        Name = tier.Key is int required ? "Requer nível " + required : "Sem requisito",
                        Shop = shopId,
                    };
                    foreach ((string itemId, JsonObject offer) in tier)
                    {
                        ShopItem item = Map(itemId, offer, trader.Key);
                        if (item != null) category.Items.Add(item);
                    }
                    if (category.Items.Count == 0) continue;
                    shop.Categories.Add(category.ExtId);
                    _context.Dataset.Add(category);
                }
                _context.Dataset.Add(shop);
            }
        }

        private void AddTraderEntity(string id, string name)
        {
            var entity = new EntityDoc { ExtId = id, Name = name, Categories = new List<string> { _catalog.TraderCategory() } };
            // images/traders usa o nome sem espaço: tianwen.png.
            string file = id.Replace("_", "");
            if (_context.Source.Image("traders", file) is byte[] png)
            {
                string key = "traders/" + file;
                _context.Dataset.Images[key] = png;
                entity.IconImage = key;
            }
            else _context.Warn("Comerciante sem imagem em images/traders", name);
            _context.Dataset.Add(entity);
        }

        /// <summary>cost é {moeda: preço}, sempre com uma moeda só; outra quantidade de moedas vira aviso.</summary>
        private ShopItem Map(string itemId, JsonObject offer, string trader)
        {
            List<KeyValuePair<string, double>> cost = Fields.Amounts(offer["cost"]);
            if (cost.Count != 1)
            {
                _context.Warn("Oferta sem preço ou com mais de uma moeda, ignorada", trader + ": " + itemId);
                return null;
            }

            var item = new ShopItem(Reference.Item(itemId), cost[0].Value, Reference.Item(cost[0].Key));
            if (Fields.Number(offer["quantity"]) is double quantity && quantity > 1) item.Quantity = quantity;
            if (Fields.Int(offer["limit"]) is int limit && limit > 0) item.PurchaseLimit = limit;

            switch (Fields.Int(offer["refreshSeconds"]))
            {
                case null:
                    break;
                case Daily:
                    item.ResetType = "daily";
                    break;
                case Hourly:
                    item.ResetType = "hourly";
                    break;
                case int seconds:
                    _context.Warn("Reabastecimento fora de diário ou por hora, enviado sem reset", trader + " " + itemId + ": " + seconds + " s");
                    break;
            }
            return item;
        }
    }
}
