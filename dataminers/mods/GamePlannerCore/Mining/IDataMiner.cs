using System.Collections;
using GamePlanner.Core.Diagnostics;
using GamePlanner.Core.Upload;

namespace GamePlanner.Core.Mining
{
    /// <summary>
    /// O que cada jogo implementa. Mine roda como corrotina na thread principal (pode ler qualquer coisa
    /// da Unity) e deve dar yield de tempos em tempos para o jogo não congelar enquanto converte imagens.
    /// </summary>
    public interface IDataMiner
    {
        /// <summary>Id padrão do jogo na API (minúsculas, números, - e _).</summary>
        string DefaultGameId { get; }

        string GameName { get; }

        /// <summary>Se agora dá para minerar (ex.: mundo carregado). Quando não, Reason diz o motivo.</summary>
        bool CanMine(out string reason);

        IEnumerator Mine(MinedDataset dataset, MiningContext context);
    }

    /// <summary>Opções e canal de progresso da mineração.</summary>
    public sealed class MiningContext
    {
        public readonly IGpLog Log;
        public readonly bool IncludeImages;

        /// <summary>Maior lado das imagens extraídas, em pixels. O servidor gera ícone de 128 e miniatura de 512.</summary>
        public readonly int MaxImageSize;

        private readonly UploadProgress _progress;

        public MiningContext(IGpLog log, UploadProgress progress, bool includeImages, int maxImageSize)
        {
            Log = log ?? NullLog.Instance;
            _progress = progress;
            IncludeImages = includeImages;
            MaxImageSize = maxImageSize;
        }

        public void Status(string message)
        {
            _progress?.SetStatus(message);
            Log.Info(message);
        }
    }
}
