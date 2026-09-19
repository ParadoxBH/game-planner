using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using GamePlanner.Core.Imaging;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;
using UnityEngine;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// Minera o How to Fish a partir do que o jogo carrega: Resources/Items (peixes, criaturas, armas,
    /// ferramentas), Resources/Baits e Resources/Attachments, as melhorias guardadas nos prefabs (afiação,
    /// munição, bolsos, motores do barco) e os desbloqueáveis (roupas, skins, ilhas, missões). Tudo vira item:
    /// as ligações (isca -> peixe, custo de melhoria, recompensa de missão) vão como receitas.
    ///
    /// Ids são os nomes dos assets, com prefixo quando o asset não é um Item ("bait_", "attachment_"...).
    /// Preços usam o item "money" como moeda. O que só existe na cena da ilha (motores à venda, radar,
    /// missões dos NPCs) sai da ilha carregada; minerar em outra ilha completa o que faltou.
    /// </summary>
    internal sealed class HowToFishDataMiner : IDataMiner
    {
        public string DefaultGameId => "how-to-fish";
        public string GameName => "How to Fish";

        public bool CanMine(out string reason)
        {
            if (GameInfo.AllBaits.Count == 0 || Player.LocalPlayer == null)
            {
                reason = "Entre numa partida antes de minerar: itens, barco e ilhas só são carregados dentro do jogo.";
                return false;
            }
            reason = null;
            return true;
        }

        public IEnumerator Mine(MinedDataset dataset, MiningContext context)
        {
            var kit = new MiningKit(dataset, context);
            kit.AddCurrency();

            context.Status("Minerando peixes, criaturas e itens...");
            yield return ItemMiner.Mine(kit);

            context.Status("Minerando iscas e o que cada uma pesca...");
            yield return BaitMiner.Mine(kit);

            context.Status("Minerando acessórios, afiação e munição das armas...");
            yield return WeaponUpgradeMiner.Mine(kit);

            context.Status("Minerando bolsos, barco e motores...");
            yield return PlayerUpgradeMiner.Mine(kit);

            context.Status("Minerando roupas, ilhas e missões...");
            yield return UnlockableMiner.Mine(kit);

            foreach (string field in HtfFields.Missing)
                dataset.Warn("Campo " + field + " não existe mais nesta versão do jogo: o dado correspondente ficou de fora");

            var summary = new System.Text.StringBuilder("Mineração concluída:");
            foreach (var documents in dataset.Resources())
                if (documents.Count > 0) summary.Append(' ').Append(documents.Count).Append(' ').Append(documents[0].Resource).Append(',');
            summary.Append(' ').Append(dataset.Images.Count).Append(" imagens, ").Append(dataset.Warnings.Count).Append(" avisos.");
            context.Status(summary.ToString());
            foreach (string warning in dataset.Warnings) context.Log.Warn(warning);
        }
    }

    /// <summary>O que todos os mineradores compartilham.</summary>
    internal sealed class MiningKit
    {
        /// <summary>Tempo máximo de trabalho por frame antes de devolver o controle ao jogo.</summary>
        private const long FrameBudgetMilliseconds = 25;

        public const string MoneyId = "money";

        public readonly MinedDataset Dataset;
        public readonly MiningContext Context;
        public readonly HtfCategories Categories;
        public readonly MeshImageCollector Icons;

        /// <summary>Prefab -> id do item, preenchido pelo ItemMiner. Os outros mineradores citam itens por aqui.</summary>
        public readonly Dictionary<Item, string> ItemIds = new Dictionary<Item, string>();

        /// <summary>Nome exibido de cada item minerado, para compor nomes de melhoria ("Afiação 2 — Faca").</summary>
        public readonly Dictionary<string, string> ItemNames = new Dictionary<string, string>();

        private readonly Stopwatch _frame = Stopwatch.StartNew();
        private Material _palette;

        public MiningKit(MinedDataset dataset, MiningContext context)
        {
            Dataset = dataset;
            Context = context;
            Categories = new HtfCategories(dataset);
            Icons = new MeshImageCollector(dataset, context);
            int? layer = InventoryLayer();
            if (layer != null) Icons.Layer = layer.Value;
        }

        /// <summary>
        /// Layer em que o inventário do jogo desenha as malhas dos itens. É garantido que o pipeline do jogo
        /// desenha essa layer, o que uma layer qualquer (filtrada pelo Renderer Data do URP) não é.
        /// </summary>
        private static int? InventoryLayer()
        {
            PlayerInventory inventory = Player.LocalPlayer != null ? Player.LocalPlayer.Inventory : null;
            List<InventorySlot> slots = HtfFields.ItemSlots.Get(inventory);
            if (slots == null) return null;
            foreach (InventorySlot slot in slots)
            {
                MeshFilter filter = HtfFields.SlotFilter.Get(slot);
                if (filter != null) return filter.gameObject.layer;
            }
            return null;
        }

        /// <summary>true quando o frame estourou o orçamento: o minerador dá yield return null.</summary>
        public bool ShouldYield()
        {
            if (_frame.ElapsedMilliseconds < FrameBudgetMilliseconds) return false;
            _frame.Restart();
            return true;
        }

        public static Reference Money => Reference.Item(MoneyId);

        public void AddCurrency()
        {
            var doc = new ItemDoc { ExtId = MoneyId, Name = "Dinheiro", Summary = "Moeda do jogo: vem da venda do que se pesca." };
            Categories.Apply(doc, HtfCategories.Currency);
            Dataset.Add(doc);
        }

        /// <summary>Preço de compra (e de venda) em dinheiro. Zero ou negativo fica sem preço.</summary>
        public static void Price(ItemDoc doc, int buy, int sell = 0)
        {
            if (buy > 0) doc.BaseBuyPrice = buy;
            if (sell > 0) doc.BaseSellPrice = sell;
            if (doc.BaseBuyPrice != null || doc.BaseSellPrice != null) doc.Currency = Money;
        }

        public string ItemId(Item item) => item != null && ItemIds.TryGetValue(item, out string id) ? id : null;

        public string ItemName(string id) => id != null && ItemNames.TryGetValue(id, out string name) ? name : HtfNames.Humanize(id);

        /// <summary>
        /// Material dos itens. O inventário do jogo desenha toda malha com o mesmo material de paleta, e os
        /// prefabs de item usam esse material; o primeiro renderer de malha comum de um item serve para todos.
        /// </summary>
        public Material Palette(Item hint = null)
        {
            Material own = MaterialOf(hint);
            if (own != null) return own;
            if (_palette != null) return _palette;
            foreach (Item item in ItemIds.Keys)
                if ((_palette = MaterialOf(item)) != null) break;
            return _palette;
        }

        private static Material MaterialOf(Item item)
        {
            if (item == null) return null;
            List<Renderer> renderers = HtfFields.ItemRenderers.Get(item);
            if (renderers != null)
                foreach (Renderer renderer in renderers)
                    if (renderer != null && renderer.sharedMaterial != null) return renderer.sharedMaterial;
            foreach (Renderer renderer in item.GetComponentsInChildren<Renderer>(true))
                if ((renderer is MeshRenderer || renderer is SkinnedMeshRenderer) && renderer.sharedMaterial != null) return renderer.sharedMaterial;
            return null;
        }

        /// <summary>Ícone de uma malha de inventário, na rotação que o próprio inventário usa.</summary>
        public string MeshIcon(string name, Mesh mesh, Vector3 inventoryRotation, Item materialHint = null,
            System.Action<Renderer> customize = null)
        {
            if (mesh == null) return null;
            Material material = Palette(materialHint);
            if (material == null) return null;
            return Icons.Collect(name, new[] { new MeshPart(mesh, material) }, Quaternion.Euler(inventoryRotation), customize);
        }
    }
}
