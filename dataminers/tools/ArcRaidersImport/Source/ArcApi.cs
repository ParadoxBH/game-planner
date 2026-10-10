using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

namespace GamePlanner.ArcRaiders.Source
{
    /// <summary>
    /// API pública do arctracker.io (https://arctracker.io/developers/docs): itens, módulos da oficina e missões,
    /// sem autenticação, um GET por recurso. É a mesma base do repositório RaidTheory/arcraiders-data, mas em dia
    /// — o repositório parou antes da atualização 2.0 (posto avançado, pesquisa, centenas de itens).
    ///
    /// Cada resposta fica gravada em &lt;cache&gt;/api: sem rede, a ferramenta usa a última cópia. As imagens que o
    /// repositório não tem vêm do CDN (o imageFilename de cada item) e ficam em &lt;cache&gt;/images, baixadas uma vez.
    /// </summary>
    public sealed class ArcApi : IDisposable
    {
        public const string Origin = "https://arctracker.io";
        private const int ImageParallelism = 4;

        private readonly string _cache;
        private readonly HttpClient _http;

        public ArcApi(string cacheDirectory)
        {
            _cache = cacheDirectory;
            _http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("GamePlanner-ArcRaidersImport/1.0");
        }

        public void Dispose() => _http.Dispose();

        public string ImageCache => Path.Combine(_cache, "images");

        /// <summary>
        /// GET /api/{resource}. Falhou a rede, vale a última cópia gravada; sem cópia, null. A mensagem diz de onde
        /// veio, para o relatório.
        /// </summary>
        public JsonObject Fetch(string resource, out string origin)
        {
            string file = Path.Combine(_cache, "api", resource + ".json");
            try
            {
                string json = _http.GetStringAsync(Origin + "/api/" + resource).GetAwaiter().GetResult();
                JsonObject result = JsonNode.Parse(json) as JsonObject ?? throw new JsonException("resposta não é um objeto");
                Directory.CreateDirectory(Path.GetDirectoryName(file));
                File.WriteAllText(file, json);
                origin = "API " + Origin + "/api/" + resource + Generated(result);
                return result;
            }
            catch (Exception e) when (e is HttpRequestException || e is TaskCanceledException || e is JsonException)
            {
                if (!File.Exists(file))
                {
                    origin = "API indisponível (" + e.Message + ") e sem cópia local";
                    return null;
                }
                var cached = JsonNode.Parse(File.ReadAllText(file)) as JsonObject;
                origin = "cópia local de /api/" + resource + Generated(cached) + " — API indisponível: " + e.Message;
                return cached;
            }
        }

        private static string Generated(JsonObject response) =>
            response?["generatedAt"] is JsonValue value && value.TryGetValue(out string when) ? " (gerado em " + when + ")" : "";

        /// <summary>
        /// Baixa para o cache o que ainda não está lá: arquivo -> URL, com o arquivo relativo a ImageCache
        /// ("items/planks.png"). Devolve quantas baixou e as que falharam.
        /// </summary>
        public (int Downloaded, List<string> Failed) DownloadImages(IReadOnlyDictionary<string, string> images)
        {
            var pending = new ConcurrentQueue<KeyValuePair<string, string>>(
                images.Where(image => !File.Exists(Path.Combine(ImageCache, image.Key))));
            int downloaded = 0;
            var failed = new ConcurrentBag<string>();

            void Worker()
            {
                while (pending.TryDequeue(out KeyValuePair<string, string> image))
                {
                    string target = Path.Combine(ImageCache, image.Key);
                    try
                    {
                        byte[] bytes = _http.GetByteArrayAsync(image.Value).GetAwaiter().GetResult();
                        Directory.CreateDirectory(Path.GetDirectoryName(target));
                        File.WriteAllBytes(target + ".part", bytes);
                        File.Move(target + ".part", target, overwrite: true);
                        Interlocked.Increment(ref downloaded);
                    }
                    catch (Exception e) when (e is HttpRequestException || e is TaskCanceledException || e is IOException)
                    {
                        failed.Add(image.Key + " (" + e.Message + ")");
                    }
                }
            }

            Thread[] threads = Enumerable.Range(0, ImageParallelism).Select(_ => new Thread(Worker)).ToArray();
            foreach (Thread thread in threads) thread.Start();
            foreach (Thread thread in threads) thread.Join();
            return (downloaded, failed.OrderBy(name => name, StringComparer.Ordinal).ToList());
        }
    }
}
