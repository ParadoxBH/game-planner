using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Api
{
    /// <summary>
    /// Cliente da API do Game Planner: chamadas bloqueantes, feitas para rodar em threads de fundo. Pode ser
    /// usado por várias threads ao mesmo tempo: o envio de imagens faz isso. Renova o token em 401 e, se o
    /// servidor ainda responder 429, recua por alguns segundos e tenta de novo.
    ///
    /// Diferença para a versão do GamePlannerCore: lá o transporte é HttpWebRequest, que no .NET Framework do
    /// BepInEx é o que existe. Aqui (tModLoader, .NET 8) HttpWebRequest está obsoleto e ignora o limite de
    /// conexões por servidor — com envio paralelo isso importa —, então o transporte é HttpClient síncrono.
    /// </summary>
    public sealed class GamePlannerClient : IDisposable
    {
        public const string ApiPrefix = "/api/v1";

        /// <summary>Espera máxima entre tentativas depois de 429.</summary>
        public const int MaxBackoffSeconds = 30;

        private readonly string _origin;
        private readonly HttpClient _http;
        private readonly object _tokenLock = new object();
        private volatile string _accessToken;
        private volatile string _refreshToken;

        public int TimeoutMilliseconds = 120_000;

        /// <summary>Chamado antes de esperar por causa de 429, com os segundos da espera.</summary>
        public Action<int> OnBackoff;

        public string Origin => _origin;

        /// <param name="origin">Origem do backend, ex.: http://localhost:8080 (sem /api/v1).</param>
        /// <param name="maxConnections">Conexões simultâneas com o servidor.</param>
        public GamePlannerClient(string origin, int maxConnections = 8)
        {
            if (string.IsNullOrWhiteSpace(origin)) throw new ArgumentException("Informe o endereço da API", nameof(origin));
            _origin = origin.Trim().TrimEnd('/');
            if (_origin.EndsWith(ApiPrefix, StringComparison.OrdinalIgnoreCase))
                _origin = _origin.Substring(0, _origin.Length - ApiPrefix.Length);

            var handler = new SocketsHttpHandler
            {
                MaxConnectionsPerServer = Math.Max(2, maxConnections),
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
                PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            };
            // O timeout de cada chamada é controlado em Execute, que é quem sabe se é JSON ou imagem.
            _http = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("GamePlanner.Core");
            _http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
        }

        public bool IsAuthenticated => _accessToken != null;

        public static string Segment(string value) => Uri.EscapeDataString(value ?? "");

        public void Dispose() => _http.Dispose();

        // ------------------------------------------------------------------ autenticação

        public void Login(string username, string password, CancellationToken cancel)
        {
            var body = JsonWriter.Serialize(new Dictionary<string, object> { { "username", username }, { "password", password } });
            StoreTokens(Send("POST", ApiPrefix + "/auth/login", body, auth: false, cancel: cancel));
        }

        /// <summary>GET /auth/me: usuário, se está verificado e o status da conta.</summary>
        public Dictionary<string, object> Me(CancellationToken cancel) => Get(ApiPrefix + "/auth/me", cancel);

        // ------------------------------------------------------------------ JSON

        public Dictionary<string, object> Get(string path, CancellationToken cancel) =>
            JsonReader.ParseObject(Send("GET", path, null, auth: true, cancel: cancel));

        /// <summary>POST, PUT, PATCH ou DELETE com corpo JSON já serializado (ou null).</summary>
        public Dictionary<string, object> Write(string method, string path, string jsonBody, CancellationToken cancel) =>
            JsonReader.ParseObject(Send(method, path, jsonBody, auth: true, cancel: cancel));

        // ------------------------------------------------------------------ mídia

        public sealed class UploadResult
        {
            public string MediaId;
            /// <summary>false quando a mesma imagem já existia no servidor.</summary>
            public bool Created;
        }

        public UploadResult UploadImage(byte[] content, string fileName, string mimeType, CancellationToken cancel)
        {
            MultipartBody body = MultipartBody.SingleFile("file", fileName, mimeType, content);
            string raw = Send("POST", ApiPrefix + "/media", body.Bytes, body.ContentType, auth: true, cancel: cancel, timeout: 300_000);
            Dictionary<string, object> result = JsonReader.ParseObject(raw);
            return new UploadResult
            {
                MediaId = result.GetObject("media").GetString("id"),
                Created = result.GetBool("created"),
            };
        }

        public bool MediaExists(string mediaId, CancellationToken cancel)
        {
            try
            {
                Get(ApiPrefix + "/media/" + Segment(mediaId), cancel);
                return true;
            }
            catch (ApiException e) when (e.Status == 404)
            {
                return false;
            }
        }

        // ------------------------------------------------------------------ transporte

        private string Send(string method, string path, string jsonBody, bool auth, CancellationToken cancel)
        {
            byte[] bytes = jsonBody == null ? null : Encoding.UTF8.GetBytes(jsonBody);
            return Send(method, path, bytes, "application/json", auth, cancel, TimeoutMilliseconds);
        }

        private string Send(string method, string path, byte[] body, string contentType, bool auth, CancellationToken cancel, int timeout)
        {
            bool refreshed = false;
            int rejections = 0;
            while (true)
            {
                cancel.ThrowIfCancellationRequested();
                string token = auth ? _accessToken : null;
                try
                {
                    return Execute(method, path, body, contentType, token, timeout, cancel);
                }
                catch (ApiException e) when (e.Status == 429)
                {
                    // 2, 4, 8, 16, 30, 30... segundos: sai assim que a janela do servidor abrir de novo.
                    int seconds = Math.Min(MaxBackoffSeconds, 1 << Math.Min(++rejections, 5));
                    OnBackoff?.Invoke(seconds);
                    if (cancel.WaitHandle.WaitOne(TimeSpan.FromSeconds(seconds))) cancel.ThrowIfCancellationRequested();
                }
                catch (ApiException e) when (e.Status == 401 && auth && _refreshToken != null && !refreshed)
                {
                    refreshed = true;
                    RefreshIfStale(token, cancel);
                }
            }
        }

        /// <summary>Várias threads podem tomar 401 juntas: só a primeira renova, as outras usam o token novo.</summary>
        private void RefreshIfStale(string rejectedToken, CancellationToken cancel)
        {
            lock (_tokenLock)
            {
                if (!ReferenceEquals(_accessToken, rejectedToken)) return;
                var body = JsonWriter.Serialize(new Dictionary<string, object> { { "refreshToken", _refreshToken } });
                StoreTokens(Send("POST", ApiPrefix + "/auth/refresh", body, auth: false, cancel: cancel));
            }
        }

        private void StoreTokens(string raw)
        {
            Dictionary<string, object> tokens = JsonReader.ParseObject(raw);
            string access = tokens.GetString("accessToken");
            if (access == null) throw new ApiException(0, null, "POST", "auth", "Resposta sem accessToken");
            _refreshToken = tokens.GetString("refreshToken");
            _accessToken = access;
        }

        private string Execute(string method, string path, byte[] body, string contentType, string token, int timeout, CancellationToken cancel)
        {
            using (var timer = CancellationTokenSource.CreateLinkedTokenSource(cancel))
            {
                timer.CancelAfter(timeout);
                var request = new HttpRequestMessage(new HttpMethod(method), _origin + path);
                if (token != null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                if (body != null)
                {
                    request.Content = new ByteArrayContent(body);
                    request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
                }

                try
                {
                    using (request)
                    using (HttpResponseMessage response = _http.Send(request, HttpCompletionOption.ResponseContentRead, timer.Token))
                    {
                        string raw = ReadBody(response);
                        if (response.IsSuccessStatusCode) return raw;

                        Dictionary<string, object> problem = null;
                        try { problem = JsonReader.ParseObject(raw); } catch (FormatException) { }
                        throw new ApiException((int)response.StatusCode, problem, method, path, raw);
                    }
                }
                catch (OperationCanceledException) when (!cancel.IsCancellationRequested)
                {
                    throw new ApiException(0, null, method, path, "tempo esgotado depois de " + timeout / 1000 + " s");
                }
                catch (HttpRequestException e)
                {
                    throw new ApiException(0, null, method, path, Reason(e));
                }
                catch (IOException e)
                {
                    throw new ApiException(0, null, method, path, e.Message);
                }
            }
        }

        private static string Reason(HttpRequestException e)
        {
            // A mensagem de fora é genérica ("An error occurred while sending the request"): a causa é útil.
            Exception cause = e.InnerException ?? e;
            return cause.Message;
        }

        private static string ReadBody(HttpResponseMessage response)
        {
            using (Stream stream = response.Content.ReadAsStream())
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            {
                string text = reader.ReadToEnd();
                return text.Length == 0 ? null : text;
            }
        }
    }
}
