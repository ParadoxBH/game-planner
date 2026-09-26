using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;
using GamePlannerTerraria.Imaging;
using Terraria;
using Terraria.ID;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Minerador do Terraria. Lê o conteúdo que o jogo já tem carregado — não precisa de mundo aberto para
    /// existir, mas precisa de partida para as texturas estarem disponíveis:
    ///
    /// | O quê | Vira |
    /// | --- | --- |
    /// | Itens (ContentSamples) | item, com atributos de dano, uso, defesa, preço de venda... |
    /// | NPCs (ContentSamples) | entidade, com vida, dano, defesa e os drops da tabela do bestiário |
    /// | Bancadas (blocos exigidos por receita) | entidade |
    /// | Receitas (Main.recipe) | receita, com bancada, ingredientes e condições |
    /// | Grupos de receita ("qualquer madeira") | categoria usada como ingrediente |
    /// | Lojas dos moradores | loja + categoria de loja, uma por conjunto de condições |
    /// | Bestiário | evento (lua de sangue, invasão), local (bioma) e ponto de surgimento |
    /// | Raridades | cadastro de raridade, com a cor que o jogo usa |
    ///
    /// Preços são em moeda de cobre, que é o item CopperCoin; o site converte para ouro e platina sozinho.
    /// </summary>
    internal sealed class TerrariaMiner : IDataMiner
    {
        public const string DefaultGame = "terraria";

        private readonly bool _somenteVanilla;

        public TerrariaMiner(bool somenteVanilla) => _somenteVanilla = somenteVanilla;

        public string DefaultGameId => DefaultGame;

        public string GameName => "Terraria";

        public bool CanMine(out string reason)
        {
            if (Main.gameMenu)
            {
                reason = "Entre num mundo antes de minerar: os ícones só carregam com o jogo em partida.";
                return false;
            }
            if (ContentSamples.ItemsByType == null || ContentSamples.ItemsByType.Count == 0)
            {
                reason = "O jogo ainda não terminou de carregar o conteúdo.";
                return false;
            }
            reason = null;
            return true;
        }

        public IEnumerator Mine(MinedDataset dataset, MiningContext context)
        {
            var kit = new MiningKit(dataset, context, _somenteVanilla);

            context.Status("Raridades e grupos de receita...");
            RarityMiner.Mine(kit);
            RecipeGroupMiner.Mine(kit);

            context.Status("Minerando itens...");
            yield return ItemMiner.Mine(kit);

            context.Status("Minerando NPCs e o que eles largam...");
            yield return NpcMiner.Mine(kit);

            context.Status("Minerando bancadas...");
            yield return StationMiner.Mine(kit);

            context.Status("Minerando receitas...");
            yield return RecipeMiner.Mine(kit);

            context.Status("Minerando lojas dos moradores...");
            yield return ShopMiner.Mine(kit);

            context.Status("Minerando o bestiário (biomas, eventos e onde cada NPC aparece)...");
            yield return BestiaryMiner.Mine(kit);

            foreach (string campo in TerrariaFields.Missing)
                dataset.Warn("Campo " + campo + " não existe mais nesta versão do jogo: o dado correspondente ficou de fora");

            var resumo = new StringBuilder("Mineração concluída:");
            foreach (IReadOnlyList<ContentDoc> documentos in dataset.Resources())
                if (documentos.Count > 0) resumo.Append(' ').Append(documentos.Count).Append(' ').Append(documentos[0].Resource).Append(',');
            resumo.Append(' ').Append(dataset.Images.Count).Append(" imagens, ").Append(dataset.Warnings.Count).Append(" avisos.");
            context.Status(resumo.ToString());
            foreach (string aviso in dataset.Warnings) context.Log.Warn(aviso);
        }
    }

    /// <summary>O que todos os mineradores compartilham.</summary>
    internal sealed class MiningKit
    {
        /// <summary>
        /// Tempo de trabalho por quadro antes de devolver o controle ao jogo. O Terraria tem 16 ms por quadro
        /// a 60 fps; 6 ms deixa a mineração rápida sem o jogo engasgar.
        /// </summary>
        private const long FrameBudgetMilliseconds = 6;

        public readonly MinedDataset Dataset;
        public readonly MiningContext Context;
        public readonly TerrariaCategories Categories;
        public readonly TextureImages Icons;

        /// <summary>Com true, só entra conteúdo do Terraria; o de outros mods fica de fora.</summary>
        public readonly bool SomenteVanilla;

        /// <summary>Tipo do item -> id na API. Só tem o que foi minerado.</summary>
        public readonly Dictionary<int, string> ItemIds = new Dictionary<int, string>();

        /// <summary>Tipo do item -> documento, para quem precisa completar o item depois (preço de loja).</summary>
        public readonly Dictionary<int, ItemDoc> ItemDocs = new Dictionary<int, ItemDoc>();

        /// <summary>Net id do NPC -> id na API.</summary>
        public readonly Dictionary<int, string> NpcIds = new Dictionary<int, string>();

        /// <summary>Net id do NPC -> documento, que o bestiário completa depois com descrição e eventos.</summary>
        public readonly Dictionary<int, EntityDoc> NpcDocs = new Dictionary<int, EntityDoc>();

        /// <summary>Bloco de bancada -> id da entidade.</summary>
        public readonly Dictionary<int, string> StationIds = new Dictionary<int, string>();

        /// <summary>Tipo do item -> categorias de grupo de receita a que ele pertence ("qualquer madeira").</summary>
        public readonly Dictionary<int, List<string>> GroupCategories = new Dictionary<int, List<string>>();

        /// <summary>Id do grupo de receita -> id da categoria, para o ingrediente apontar para a categoria.</summary>
        public readonly Dictionary<int, string> GroupIds = new Dictionary<int, string>();

        private readonly Stopwatch _quadro = Stopwatch.StartNew();

        public MiningKit(MinedDataset dataset, MiningContext context, bool somenteVanilla)
        {
            Dataset = dataset;
            Context = context;
            SomenteVanilla = somenteVanilla;
            Categories = new TerrariaCategories(dataset);
            Icons = new TextureImages(dataset, context);
        }

        /// <summary>true quando o quadro estourou o orçamento: o minerador dá yield return null.</summary>
        public bool ShouldYield()
        {
            if (_quadro.ElapsedMilliseconds < FrameBudgetMilliseconds) return false;
            _quadro.Restart();
            Icons.ReiniciarContagem();
            return true;
        }

        public string MoedaId => TerrariaNames.ItemId(ItemID.CopperCoin);

        /// <summary>Todo preço do Terraria é em cobre; a moeda é o próprio item moeda de cobre.</summary>
        public Reference Moeda => Reference.Item(MoedaId);

        public bool ItemAceito(int type) => type > 0 && (!SomenteVanilla || TerrariaNames.IsVanillaItem(type));

        public bool NpcAceito(int netId) => netId != 0 && (!SomenteVanilla || TerrariaNames.IsVanillaNpc(netId));

        public bool TileAceito(int tile) => tile >= 0 && (!SomenteVanilla || TerrariaNames.IsVanillaTile(tile));

        /// <summary>Id do item já minerado, ou null quando ele ficou de fora (mod com "só Terraria" ligado).</summary>
        public string ItemId(int type) => ItemIds.TryGetValue(type, out string id) ? id : null;

        public string NpcId(int netId) => NpcIds.TryGetValue(netId, out string id) ? id : null;

        /// <summary>Referência ao item, ou null: referência para o que não foi minerado vira pendência à toa.</summary>
        public Reference ItemRef(int type)
        {
            string id = ItemId(type);
            return id == null ? null : Reference.Item(id);
        }

        public Reference NpcRef(int netId)
        {
            string id = NpcId(netId);
            return id == null ? null : Reference.Entity(id);
        }
    }
}
