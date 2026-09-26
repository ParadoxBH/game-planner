using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Model
{
    /// <summary>
    /// Loja. Os itens à venda não ficam aqui: ficam nas categorias da loja (<see cref="ShopCategoryDoc"/>),
    /// que apontam para ela pelo código. Npc é o código da entidade que atende.
    ///
    /// Não existe no GamePlannerCore: o Valheim e o How to Fish não têm loja com balcão fixo. Se outro jogo
    /// precisar, é este arquivo que sobe para o Core.
    /// </summary>
    public sealed class ShopDoc : ContentDoc
    {
        public string Npc;

        /// <summary>Código [a-z_]: daily, weekly, unique...</summary>
        public string ResetType;

        public List<string> Categories = new List<string>();

        public override string Resource => "shops";
        public override string Kind => ContentKinds.Shop;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("npc", Npc)
                .Field("resetType", ResetType)
                .Field("categories", Categories);
        }
    }

    /// <summary>Categoria de uma loja, com os itens à venda. Shop é o código da loja.</summary>
    public sealed class ShopCategoryDoc : ContentDoc
    {
        public string Shop;
        public string ResetType;
        public List<ShopItem> Items = new List<ShopItem>();

        public override string Resource => "shop-categories";
        public override string Kind => ContentKinds.ShopCategory;

        protected override void WriteSpecific(JsonWriter w)
        {
            w.Field("shop", Shop)
                .Field("resetType", ResetType)
                .Field("items", Items);
        }
    }

    /// <summary>
    /// Item à venda numa categoria de loja. Quantity é o tamanho do pacote (nulo = avulso); PurchaseLimit,
    /// quantas compras até o ResetType. O mesmo alvo pode se repetir com preços ou pacotes diferentes.
    /// </summary>
    public sealed class ShopItem : IJsonWritable
    {
        public Reference Target;
        public double? Quantity;
        public int? PurchaseLimit;
        public double? Price;
        public Reference Currency;
        public string ResetType;
        public string RarityCode;

        public ShopItem(Reference target, double? price = null, Reference currency = null)
        {
            Target = target; Price = price; Currency = currency;
        }

        public void WriteJson(JsonWriter w) => w.BeginObject()
            .Field("target", Target)
            .Field("quantity", Quantity)
            .Field("purchaseLimit", PurchaseLimit)
            .Field("price", Price)
            .Field("currency", Currency)
            .Field("resetType", ResetType)
            .Field("rarityCode", RarityCode)
            .EndObject();
    }
}
