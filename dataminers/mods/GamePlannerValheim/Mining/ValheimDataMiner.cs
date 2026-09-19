using System.Collections;
using System.Diagnostics;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Minera o Valheim a partir do que o jogo já tem carregado num mundo: ObjectDB (itens e receitas), ZNetScene
    /// (criaturas, construções, recursos), EnvMan (climas), SpawnSystem e RandEventSystem (surgimento e ataques)
    /// e ZoneSystem (vegetação, locais e masmorras). Ids são os nomes de prefab, os mesmos do jogo e da wiki.
    /// </summary>
    internal sealed class ValheimDataMiner : IDataMiner
    {
        public string DefaultGameId => "valheim";
        public string GameName => "Valheim";

        public bool CanMine(out string reason)
        {
            if (ObjectDB.instance == null || ObjectDB.instance.m_items.Count == 0 || ZNetScene.instance == null ||
                ZoneSystem.instance == null)
            {
                reason = "Entre num mundo antes de minerar: itens, criaturas e o mundo só são carregados dentro do jogo.";
                return false;
            }
            reason = null;
            return true;
        }

        public IEnumerator Mine(MinedDataset dataset, MiningContext context)
        {
            var kit = new MiningKit(dataset, context);

            // Entidades primeiro: surgimento, vegetação e locais só citam o que existe.
            context.Status("Minerando itens...");
            yield return ItemMiner.Mine(kit);

            context.Status("Minerando construções e bancadas...");
            yield return PieceMiner.Mine(kit);

            context.Status("Minerando criaturas...");
            yield return CreatureMiner.Mine(kit);

            context.Status("Minerando coletáveis, tesouros e recursos do mundo...");
            yield return WorldResourceMiner.Mine(kit);

            context.Status("Minerando mapa, biomas e climas...");
            yield return WorldMapMiner.Mine(kit);

            context.Status("Minerando surgimento de criaturas e ataques...");
            yield return SpawnSystemMiner.Mine(kit);

            context.Status("Minerando vegetação dos biomas...");
            yield return VegetationMiner.Mine(kit);

            context.Status("Minerando locais e masmorras (carrega cada prefab)...");
            yield return LocationMiner.Mine(kit);

            context.Status("Minerando receitas...");
            yield return RecipeMiner.Mine(kit);

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

        public readonly MinedDataset Dataset;
        public readonly MiningContext Context;
        public readonly ValheimCategories Categories;
        public readonly SpriteImageCollector Images;
        public readonly ValheimWorld World;

        private readonly Stopwatch _frame = Stopwatch.StartNew();

        public MiningKit(MinedDataset dataset, MiningContext context)
        {
            Dataset = dataset;
            Context = context;
            Categories = new ValheimCategories(dataset);
            Images = new SpriteImageCollector(dataset, context);
            World = new ValheimWorld();
        }

        /// <summary>true quando o frame estourou o orçamento: o minerador dá yield return null.</summary>
        public bool ShouldYield()
        {
            if (_frame.ElapsedMilliseconds < FrameBudgetMilliseconds) return false;
            _frame.Restart();
            Images.ResetYieldCounter();
            return true;
        }

        /// <summary>Referência a entidade só quando ela foi minerada, para não criar referência pendente.</summary>
        public Reference EntityIfKnown(string id) =>
            id != null && Dataset.Contains("entities", id) ? Reference.Entity(id) : null;
    }
}
