using System;
using System.Collections;
using System.IO;
using System.Threading;
using GamePlanner.Core.Mining;
using GamePlanner.Core.UI;
using GamePlanner.Core.Upload;
using GamePlannerTerraria.Mining;
using Microsoft.Xna.Framework;
using Terraria;
using Terraria.ModLoader;

namespace GamePlannerTerraria
{
    /// <summary>
    /// Conduz a mineração e o envio. A mineração é uma corrotina: um passo por quadro, com orçamento de tempo
    /// dentro do minerador, porque ler textura é coisa da thread principal e ler tudo de uma vez travaria o
    /// jogo por dezenas de segundos. O envio é bloqueante e roda numa thread de fundo, como nos outros mods.
    ///
    /// O andamento sai no chat: cada status novo vira uma linha. O histórico completo fica no log do
    /// tModLoader (client.log).
    /// </summary>
    public class GamePlannerSystem : ModSystem
    {
        internal static readonly UploadProgress Progress = new UploadProgress();

        private static IEnumerator _mineracao;
        private static MinedDataset _dataset;
        private static AccountForm _formulario;
        private static CancellationTokenSource _cancelamento;
        private static string _ultimoStatus;
        private static int _pulso;

        public static bool Ocupado => Progress.Snapshot().Busy;

        public static UploadProgress.View Situacao => Progress.Snapshot();

        public override void Unload()
        {
            Cancelar();
            _mineracao = null;
            _dataset = null;
        }

        public override void PostUpdateEverything()
        {
            Avancar();
            Publicar();
        }

        /// <summary>Começa a minerar. Devolve a mensagem do problema, ou null quando começou.</summary>
        public static string Iniciar(bool somenteExportar)
        {
            if (Ocupado) return "Já tem uma mineração em andamento. Use /gp status ou /gp cancelar.";

            GamePlannerConfig config = GamePlannerConfig.Instance;
            AccountForm formulario = config.Formulario(somenteExportar);
            string invalido = formulario.Validate();
            if (invalido != null) return invalido + (somenteExportar ? "" : " Senha: /gp senha <senha>.");

            var miner = new TerrariaMiner(config.SomenteConteudoDoTerraria);
            if (!miner.CanMine(out string motivo)) return motivo;

            _cancelamento?.Dispose();
            _cancelamento = new CancellationTokenSource();
            _formulario = formulario;
            _dataset = new MinedDataset(formulario.GameId, miner.GameName);
            _ultimoStatus = null;

            Progress.Reset(UploadState.Mining);
            Progress.SetState(UploadState.Mining, "Minerando " + miner.GameName + " para o jogo '" + formulario.GameId + "'...");

            var contexto = new MiningContext(GamePlannerMod.Log, Progress, formulario.IncludeImages, config.TamanhoMaximoDaImagem);
            _mineracao = SafeCoroutine.Run(miner.Mine(_dataset, contexto), Falhou, () => _cancelamento.IsCancellationRequested);
            return null;
        }

        public static void Cancelar()
        {
            _cancelamento?.Cancel();
            if (_mineracao == null) return;

            // Minerando, ninguem mais vai mexer no progresso: quem cancela e quem fecha o estado.
            _mineracao = null;
            Progress.SetState(UploadState.Cancelled, "Mineração cancelada.");
        }

        // ------------------------------------------------------------------ quadro a quadro

        private static void Avancar()
        {
            if (_mineracao == null) return;

            if (_cancelamento.IsCancellationRequested)
            {
                _mineracao = null;
                Progress.SetState(UploadState.Cancelled, "Mineração cancelada.");
                return;
            }

            if (_mineracao.MoveNext()) return;

            _mineracao = null;
            if (Progress.Snapshot().State == UploadState.Failed) return;
            Enviar();
        }

        private static void Enviar()
        {
            MinedDataset dataset = _dataset;
            AccountForm formulario = _formulario;
            if (dataset == null || formulario == null) return;

            if (formulario.ExportOnly)
            {
                Progress.SetState(UploadState.Uploading, "Exportando...");
                new Thread(() => Exportar(dataset)) { IsBackground = true, Name = "GamePlanner export" }.Start();
                return;
            }

            var uploader = new DatasetUploader(GamePlannerMod.Log, Progress, Credenciais.Pasta)
            {
                Parallelism = GamePlannerConfig.Instance.EnviosSimultaneos,
            };
            Progress.SetState(UploadState.Uploading, "Enviando para " + formulario.ApiUrl + "...");
            uploader.Start(dataset, formulario, _cancelamento.Token);
        }

        private static void Exportar(MinedDataset dataset)
        {
            try
            {
                string caminho = DatasetExporter.Export(dataset, Path.Combine(Credenciais.Pasta, "export"));
                Progress.SetState(UploadState.Done, "Exportado em " + caminho);
            }
            catch (Exception e)
            {
                GamePlannerMod.Log.Error(e.ToString());
                Progress.SetState(UploadState.Failed, "Exportação falhou: " + e.Message);
            }
        }

        private static void Falhou(Exception erro)
        {
            GamePlannerMod.Log.Error(erro.ToString());
            Progress.SetState(UploadState.Failed, "Mineração falhou: " + erro.Message);
            _mineracao = null;
        }

        /// <summary>
        /// Status novo vira linha no chat. Só na thread principal, com o jogo dentro do mundo. Seis vezes por
        /// segundo basta: cada leitura do progresso copia o histórico dele, e isso a 60 fps é lixo à toa.
        /// </summary>
        private static void Publicar()
        {
            if (++_pulso % 10 != 0) return;

            UploadProgress.View situacao = Progress.Snapshot();
            if (situacao.Status == _ultimoStatus || string.IsNullOrEmpty(situacao.Status)) return;
            _ultimoStatus = situacao.Status;
            if (Main.dedServ) return;
            Main.NewText("[Game Planner] " + situacao.Status, Cor(situacao.State));
        }

        internal static Color Cor(UploadState estado)
        {
            switch (estado)
            {
                case UploadState.Failed: return Color.OrangeRed;
                case UploadState.Cancelled: return Color.Goldenrod;
                case UploadState.Done: return Color.LightGreen;
                default: return Color.LightSkyBlue;
            }
        }
    }
}
