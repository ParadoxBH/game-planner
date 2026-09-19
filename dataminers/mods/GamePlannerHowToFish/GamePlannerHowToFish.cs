using System;
using System.Collections;
using System.IO;
using System.Reflection;
using System.Threading;
using BepInEx;
using BepInEx.Configuration;
using GamePlanner.Core.Diagnostics;
using GamePlanner.Core.Mining;
using GamePlanner.Core.UI;
using GamePlanner.Core.Upload;
using GamePlanner.HowToFish.Mining;
using HarmonyLib;
using UnityEngine;

namespace GamePlanner.HowToFish
{
    /// <summary>
    /// Minerador do How to Fish para o Game Planner. Dentro de uma partida, a tecla (F7 por padrão) abre o
    /// painel da conta; "Minerar e enviar" lê os dados do jogo na thread principal e envia numa thread de fundo.
    ///
    /// URL, usuário e jogo ficam no .cfg do BepInEx. A senha fica só na memória enquanto o jogo está aberto.
    /// O cache das imagens já enviadas e as exportações ficam em BepInEx\GamePlanner.
    /// </summary>
    [BepInProcess("How to Fish.exe")]
    [BepInPlugin(PluginGuid, "GamePlanner DataMiner", "1.0.0")]
    public class GamePlannerHowToFish : BaseUnityPlugin
    {
        public const string PluginGuid = "paradoxbh.gameplanner.howtofish";

        /// <summary>Lido pelos patches de input.</summary>
        internal static bool PanelOpen;

        private ConfigEntry<KeyboardShortcut> _hotkey;
        private ConfigEntry<string> _apiUrl;
        private ConfigEntry<string> _username;
        private ConfigEntry<string> _gameId;
        private ConfigEntry<bool> _includeImages;
        private ConfigEntry<int> _maxImageSize;
        private ConfigEntry<int> _parallelUploads;

        private readonly UploadProgress _progress = new UploadProgress();
        private readonly HowToFishDataMiner _miner = new HowToFishDataMiner();
        private IGpLog _log;
        private AccountPanel _panel;
        private CancellationTokenSource _cancel;
        private string _dataDirectory;

        private void Awake()
        {
            _log = new BepInExLog(Logger);
            _dataDirectory = Path.Combine(Paths.BepInExRootPath, "GamePlanner");

            _hotkey = Config.Bind("Geral", "Hotkey", new KeyboardShortcut(KeyCode.F7), "Abre e fecha o painel do Game Planner.");
            _apiUrl = Config.Bind("Conta", "ApiUrl", "http://localhost:8080", "Origem do backend do Game Planner (sem /api/v1).");
            _username = Config.Bind("Conta", "Username", "", "Último usuário usado. A senha nunca é salva.");
            _gameId = Config.Bind("Conta", "GameId", _miner.DefaultGameId, "Id do jogo na API.");
            _includeImages = Config.Bind("Mineração", "IncludeImages", true, "Renderiza e envia os ícones (os modelos 3D dos itens).");
            _maxImageSize = Config.Bind("Mineração", "MaxImageSize", 256,
                new ConfigDescription("Lado dos ícones renderizados, em pixels.", new AcceptableValueRange<int>(32, 1024)));
            _parallelUploads = Config.Bind("Envio", "ParallelUploads", 4,
                new ConfigDescription("Imagens enviadas ao mesmo tempo. Cada uma que termina libera a próxima da fila.",
                    new AcceptableValueRange<int>(1, DatasetUploader.MaxParallelism)));

            var form = new AccountForm
            {
                ApiUrl = _apiUrl.Value,
                Username = _username.Value,
                GameId = _gameId.Value,
                IncludeImages = _includeImages.Value,
            };
            _panel = new AccountPanel("Game Planner — How to Fish", form, _progress);
            _panel.Submitted += OnSubmitted;
            _panel.CancelRequested += () => _cancel?.Cancel();
            _panel.Closed += () => SaveForm(_panel.Form);

            Harmony.CreateAndPatchAll(Assembly.GetExecutingAssembly(), PluginGuid);
        }

        private void Update()
        {
            if (_hotkey.Value.IsDown()) _panel.Toggle();
            PanelOpen = _panel.Visible;
        }

        /// <summary>O jogo trava o cursor em vários pontos; com o painel aberto ele fica sempre solto.</summary>
        private void LateUpdate()
        {
            if (!PanelOpen) return;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        private void OnGUI()
        {
            _panel.Draw();
            PanelOpen = _panel.Visible;
        }

        private void OnDestroy()
        {
            _cancel?.Cancel();
            PanelOpen = false;
        }

        private void OnSubmitted(AccountForm form)
        {
            SaveForm(form);
            if (_progress.Snapshot().Busy) return;

            _progress.Reset(UploadState.Idle);
            if (!_miner.CanMine(out string reason))
            {
                _progress.SetState(UploadState.Failed, reason);
                return;
            }

            _cancel?.Dispose();
            _cancel = new CancellationTokenSource();
            _progress.SetState(UploadState.Mining, "Iniciando mineração...");
            StartCoroutine(MineThenSend(form, _cancel.Token));
        }

        private IEnumerator MineThenSend(AccountForm form, CancellationToken cancel)
        {
            var dataset = new MinedDataset(form.GameId, _miner.GameName);
            var context = new MiningContext(_log, _progress, form.IncludeImages, _maxImageSize.Value);
            bool failed = false;

            yield return StartCoroutine(SafeCoroutine.Run(_miner.Mine(dataset, context), error =>
            {
                failed = true;
                _log.Error(error.ToString());
                _progress.SetState(UploadState.Failed, "Mineração falhou: " + error.Message);
            }, () => cancel.IsCancellationRequested));

            if (cancel.IsCancellationRequested)
            {
                _progress.SetState(UploadState.Cancelled, "Mineração cancelada.");
                yield break;
            }
            if (failed) yield break;

            if (form.ExportOnly)
            {
                _progress.SetState(UploadState.Uploading, "Exportando...");
                new Thread(() => Export(dataset)) { IsBackground = true, Name = "GamePlanner export" }.Start();
                yield break;
            }

            var uploader = new DatasetUploader(_log, _progress, _dataDirectory) { Parallelism = _parallelUploads.Value };
            _progress.SetState(UploadState.Uploading, "Enviando...");
            uploader.Start(dataset, form, cancel);
        }

        private void Export(MinedDataset dataset)
        {
            try
            {
                string path = DatasetExporter.Export(dataset, Path.Combine(_dataDirectory, "export"));
                _progress.SetState(UploadState.Done, "Exportado em " + path);
            }
            catch (Exception e)
            {
                _log.Error(e.ToString());
                _progress.SetState(UploadState.Failed, "Exportação falhou: " + e.Message);
            }
        }

        private void SaveForm(AccountForm form)
        {
            _apiUrl.Value = form.ApiUrl;
            _username.Value = form.Username;
            _gameId.Value = form.GameId;
            _includeImages.Value = form.IncludeImages;
        }
    }
}
