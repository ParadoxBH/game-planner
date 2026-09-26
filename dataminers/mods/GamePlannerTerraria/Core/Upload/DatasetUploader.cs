using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.ExceptionServices;
using System.Threading;
using GamePlanner.Core.Api;
using GamePlanner.Core.Diagnostics;
using GamePlanner.Core.Hashing;
using GamePlanner.Core.Json;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;
using GamePlanner.Core.UI;

namespace GamePlanner.Core.Upload
{
    /// <summary>
    /// Envia um MinedDataset para a API, na mesma ordem do importador do acervo: login, jogo, imagens e
    /// lotes por recurso. Reenviar o mesmo documento não cria revisão, então repetir é seguro.
    ///
    /// As imagens vão em paralelo por um pool fixo de Parallelism threads: cada uma pega a próxima da fila
    /// assim que termina a sua, então o servidor nunca recebe mais que Parallelism envios ao mesmo tempo.
    /// Bloqueante: rode em thread de fundo (Start faz isso).
    /// </summary>
    public sealed class DatasetUploader
    {
        public const int MaxBatch = 1000;
        public const int MaxImageBytes = 8 * 1024 * 1024;
        public const int MaxParallelism = 16;

        private readonly IGpLog _log;
        private readonly UploadProgress _progress;
        private readonly string _cacheDirectory;
        private readonly List<string> _failures = new List<string>();

        public int BatchSize = 500;

        /// <summary>Envios de imagem simultâneos. O servidor converte cada uma com ffmpeg, então não exagere.</summary>
        public int Parallelism = 4;

        public DatasetUploader(IGpLog log, UploadProgress progress, string cacheDirectory)
        {
            _log = log ?? NullLog.Instance;
            _progress = progress;
            _cacheDirectory = cacheDirectory;
        }

        /// <summary>Roda Run numa thread de fundo. O painel acompanha pelo UploadProgress.</summary>
        public Thread Start(MinedDataset dataset, AccountForm form, CancellationToken cancel)
        {
            var thread = new Thread(() => Run(dataset, form, cancel)) { IsBackground = true, Name = "GamePlanner upload" };
            thread.Start();
            return thread;
        }

        public void Run(MinedDataset dataset, AccountForm form, CancellationToken cancel)
        {
            lock (_failures) _failures.Clear();
            _progress.SetState(UploadState.Uploading, "Conectando em " + form.ApiUrl + "...");
            try
            {
                int workers = Math.Max(1, Math.Min(Parallelism, MaxParallelism));
                using (var client = new GamePlannerClient(form.ApiUrl, workers + 2))
                {
                    client.OnBackoff = seconds => Report("Servidor pediu para esperar (429): nova tentativa em " + seconds + " s...");

                    client.Login(form.Username, form.Password, cancel);
                    Dictionary<string, object> me = client.Me(cancel);
                    Report("Conectado como " + (me.GetString("username") ?? form.Username));
                    if (form.IncludeImages && !me.GetBool("verified"))
                        Report("Aviso: conta sem vínculo verificado; o servidor pode recusar o envio de imagens.");

                    EnsureGame(client, dataset, cancel);
                    SendRarities(client, dataset, cancel);

                    Dictionary<string, string> mediaIds = form.IncludeImages ? UploadImages(client, dataset, workers, cancel) : null;
                    foreach (IReadOnlyList<ContentDoc> documents in dataset.Resources())
                        SendResource(client, dataset.GameId, documents, mediaIds, cancel);

                    ReportServerCounts(client, dataset.GameId, cancel);
                }

                List<string> failures;
                lock (_failures) failures = new List<string>(_failures);
                if (failures.Count == 0)
                {
                    _progress.SetState(UploadState.Done, "Envio concluído sem falhas.");
                }
                else
                {
                    foreach (string failure in failures) Report("  " + failure);
                    _progress.SetState(UploadState.Done, "Envio concluído com " + failures.Count + " falha(s); detalhes acima e no log.");
                }
            }
            catch (OperationCanceledException)
            {
                _progress.SetState(UploadState.Cancelled, "Envio cancelado.");
            }
            catch (ApiException e)
            {
                _log.Error(e.ToString());
                _progress.SetState(UploadState.Failed, "Falhou: " + FriendlyMessage(e));
            }
            catch (Exception e)
            {
                _log.Error(e.ToString());
                _progress.SetState(UploadState.Failed, "Falhou: " + e.Message);
            }
        }

        // ------------------------------------------------------------------ jogo

        private void EnsureGame(GamePlannerClient client, MinedDataset dataset, CancellationToken cancel)
        {
            string path = GamePlannerClient.ApiPrefix + "/games/" + GamePlannerClient.Segment(dataset.GameId);
            try
            {
                client.Get(path, cancel);
                Report("Jogo " + dataset.GameId + " encontrado");
            }
            catch (ApiException e) when (e.Status == 404)
            {
                Report("Jogo " + dataset.GameId + " não existe; criando (precisa de platform_admin)...");
                string body = JsonWriter.Serialize(new Dictionary<string, object>
                {
                    { "id", dataset.GameId },
                    { "name", dataset.GameName },
                });
                client.Write("POST", GamePlannerClient.ApiPrefix + "/games", body, cancel);
                Report("Jogo " + dataset.GameId + " criado");
            }
        }

        /// <summary>
        /// Raridades antes do conteúdo: uma por vez, que é como a API expõe (PUT por código). Sem elas o
        /// rarityCode dos itens fica sem nome e sem cor no site.
        /// </summary>
        private void SendRarities(GamePlannerClient client, MinedDataset dataset, CancellationToken cancel)
        {
            if (dataset.Rarities.Count == 0) return;
            string path = GamePlannerClient.ApiPrefix + "/games/" + GamePlannerClient.Segment(dataset.GameId) + "/rarities/";
            int sent = 0;
            foreach (RarityDoc rarity in dataset.Rarities)
            {
                cancel.ThrowIfCancellationRequested();
                try
                {
                    client.Write("PUT", path + GamePlannerClient.Segment(rarity.Code), JsonWriter.Serialize(rarity), cancel);
                    sent++;
                }
                catch (ApiException e) when (e.Status >= 400 && e.Status < 500 && e.Status != 401)
                {
                    Fail("raridade '" + rarity.Code + "': " + e.Detail());
                }
            }
            Report("raridades: " + sent + " de " + dataset.Rarities.Count + " cadastradas");
        }

        // ------------------------------------------------------------------ imagens

        /// <summary>Um envio por conteúdo: Keys são todas as chaves do dataset com os mesmos bytes.</summary>
        private sealed class ImageJob
        {
            public readonly List<string> Keys = new List<string>();
            public string Hash;
            public string Key => Keys[0];
        }

        /// <summary>
        /// Chave da imagem no dataset -> id da mídia, só das imagens citadas por algum documento. Cada worker
        /// confere o cache (um GET para ver se a mídia ainda existe) e envia o que falta. Imagens idênticas
        /// (sprite repetido, modelo igual em duas variantes) viram um envio só: mandar o mesmo conteúdo em
        /// paralelo só faz o servidor disputar o mesmo arquivo.
        /// </summary>
        private Dictionary<string, string> UploadImages(GamePlannerClient client, MinedDataset dataset, int workers, CancellationToken cancel)
        {
            var cache = new MediaCache(_cacheDirectory, client.Origin);
            var byHash = new Dictionary<string, ImageJob>();
            foreach (string key in dataset.Resources().SelectMany(list => list).Select(doc => doc.IconImage)
                         .Where(key => key != null && dataset.Images.ContainsKey(key)).Distinct())
            {
                byte[] png = dataset.Images[key];
                if (png.Length > MaxImageBytes)
                {
                    Fail("imagem " + key + " acima de 8 MB, não enviada");
                    continue;
                }
                string hash = Sha256Hex.Of(png);
                if (!byHash.TryGetValue(hash, out ImageJob job)) byHash[hash] = job = new ImageJob { Hash = hash };
                job.Keys.Add(key);
            }
            var queue = new ConcurrentQueue<ImageJob>(byHash.Values);

            int total = queue.Count;
            var result = new ConcurrentDictionary<string, string>();
            var verified = new ConcurrentDictionary<string, bool>();
            int finished = 0, uploaded = 0, reused = 0;
            Exception fatal = null;

            Report("Imagens: " + total + " para conferir e enviar, " + workers + " envios simultâneos");
            _progress.SetCount(0, total);

            using (var stop = CancellationTokenSource.CreateLinkedTokenSource(cancel))
            {
                void Worker()
                {
                    while (!stop.IsCancellationRequested && queue.TryDequeue(out ImageJob job))
                    {
                        try
                        {
                            if (cache.TryGet(job.Hash, out string cached) &&
                                verified.GetOrAdd(cached, id => client.MediaExists(id, stop.Token)))
                            {
                                foreach (string key in job.Keys) result[key] = cached;
                                Interlocked.Increment(ref reused);
                            }
                            else
                            {
                                GamePlannerClient.UploadResult upload = client.UploadImage(dataset.Images[job.Key], FileName(job.Key), "image/png", stop.Token);
                                foreach (string key in job.Keys) result[key] = upload.MediaId;
                                cache.Put(job.Hash, upload.MediaId);
                                verified[upload.MediaId] = true;
                                Interlocked.Increment(ref uploaded);
                            }
                        }
                        catch (ApiException e) when (e.Status >= 400 && e.Status < 500 && e.Status != 401 && e.Status != 403)
                        {
                            Fail("imagem " + job.Key + ": " + e.Detail());
                        }
                        catch (OperationCanceledException)
                        {
                            return;
                        }
                        catch (Exception e)
                        {
                            // Login, permissão ou servidor fora: não adianta continuar com as outras.
                            Interlocked.CompareExchange(ref fatal, e, null);
                            stop.Cancel();
                            return;
                        }

                        int done = Interlocked.Increment(ref finished);
                        _progress.SetCount(done, total);
                        if (done % 25 == 0)
                        {
                            _progress.SetStatus("Imagens: " + done + "/" + total + " (" + uploaded + " enviadas, " + reused + " já no servidor)");
                            cache.Save();
                        }
                    }
                }

                var threads = new List<Thread>();
                for (int i = 0; i < Math.Min(workers, Math.Max(1, total)); i++)
                {
                    var thread = new Thread(Worker) { IsBackground = true, Name = "GamePlanner image " + (i + 1) };
                    threads.Add(thread);
                    thread.Start();
                }
                foreach (Thread thread in threads) thread.Join();
            }

            cache.Save();
            if (fatal != null) ExceptionDispatchInfo.Capture(fatal).Throw();
            cancel.ThrowIfCancellationRequested();

            Report("Imagens: " + uploaded + " enviadas, " + reused + " já estavam no servidor, " + (total - uploaded - reused) + " com falha");
            return new Dictionary<string, string>(result);
        }

        private static string FileName(string key)
        {
            int slash = key.LastIndexOf('/');
            return (slash >= 0 ? key.Substring(slash + 1) : key) + ".png";
        }

        // ------------------------------------------------------------------ conteúdo

        /// <summary>
        /// PUT na coleção, um lote por vez (transação única). Documento recusado derruba o lote: ele sai,
        /// a falha é registrada e o resto é reenviado.
        /// </summary>
        private void SendResource(GamePlannerClient client, string gameId, IReadOnlyList<ContentDoc> documents,
                                  Dictionary<string, string> mediaIds, CancellationToken cancel)
        {
            if (documents.Count == 0) return;
            string resource = documents[0].Resource;
            string path = GamePlannerClient.ApiPrefix + "/games/" + GamePlannerClient.Segment(gameId) + "/" + resource;
            int size = Math.Max(1, Math.Min(BatchSize, MaxBatch));
            int created = 0, updated = 0, unchanged = 0, rejected = 0;

            foreach (ContentDoc doc in documents) AttachMedia(doc, mediaIds);

            _progress.SetCount(0, documents.Count);
            for (int start = 0; start < documents.Count; start += size)
            {
                List<ContentDoc> batch = documents.Skip(start).Take(size).ToList();
                while (batch.Count > 0)
                {
                    cancel.ThrowIfCancellationRequested();
                    try
                    {
                        Dictionary<string, object> result = client.Write("PUT", path, JsonWriter.Serialize(batch), cancel);
                        created += result.GetInt("created") ?? 0;
                        updated += result.GetInt("updated") ?? 0;
                        unchanged += result.GetInt("unchanged") ?? 0;
                        break;
                    }
                    catch (ApiException e) when ((e.Status == 400 || e.Status == 409 || e.Status == 422)
                                                 && e.RejectedIndex is int index && index >= 0 && index < batch.Count)
                    {
                        Fail(resource + " '" + batch[index].ExtId + "': " + e.Detail());
                        batch.RemoveAt(index);
                        rejected++;
                    }
                }
                _progress.SetCount(Math.Min(start + size, documents.Count), documents.Count);
            }

            Report(resource + ": " + documents.Count + " documentos, " + created + " criados, " + updated + " atualizados, " +
                   unchanged + " sem mudança" + (rejected > 0 ? ", " + rejected + " recusados" : ""));
        }

        /// <summary>Com imagens ligadas, a lista media do documento é substituída pelo ícone enviado.</summary>
        private static void AttachMedia(ContentDoc doc, Dictionary<string, string> mediaIds)
        {
            if (mediaIds == null || doc.IconImage == null) return;
            if (mediaIds.TryGetValue(doc.IconImage, out string mediaId))
                doc.Media = new List<MediaLink> { new MediaLink("icon", mediaId) };
        }

        private void ReportServerCounts(GamePlannerClient client, string gameId, CancellationToken cancel)
        {
            try
            {
                Dictionary<string, object> counts = client.Get(
                    GamePlannerClient.ApiPrefix + "/games/" + GamePlannerClient.Segment(gameId) + "/content-counts", cancel);
                if (counts != null)
                    Report("No servidor: " + string.Join(", ", counts.Select(entry => entry.Key + " " + entry.Value)));
            }
            catch (ApiException e)
            {
                Report("Não foi possível ler o resumo do servidor: " + e.Detail());
            }
        }

        private void Fail(string message)
        {
            lock (_failures) _failures.Add(message);
        }

        private void Report(string message)
        {
            _log.Info(message);
            _progress.SetStatus(message);
        }

        private static string FriendlyMessage(ApiException e)
        {
            switch (e.Status)
            {
                case 0: return "servidor fora do ar ou endereço errado (" + e.Detail() + ")";
                case 401: return "usuário ou senha inválidos";
                case 403: return "sem permissão (" + e.Detail() + ")";
                default: return e.Message;
            }
        }
    }
}
