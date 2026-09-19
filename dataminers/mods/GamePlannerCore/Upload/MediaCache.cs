using System;
using System.Collections.Generic;
using System.IO;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Upload
{
    /// <summary>
    /// Hash do PNG enviado -> id da mídia no servidor, num arquivo por servidor. O id do servidor é o hash do
    /// WebP convertido, então sem este cache não dá para saber se a imagem já foi enviada sem reenviar.
    /// </summary>
    public sealed class MediaCache
    {
        private readonly string _path;
        private readonly Dictionary<string, string> _ids = new Dictionary<string, string>();
        private readonly object _lock = new object();
        private readonly object _fileLock = new object();

        public MediaCache(string directory, string apiOrigin)
        {
            string host;
            try { host = new Uri(apiOrigin).Authority; } catch (UriFormatException) { host = "api"; }
            _path = Path.Combine(directory, "media-" + host.Replace(':', '_') + ".json");
            Load();
        }

        public bool TryGet(string hash, out string mediaId)
        {
            lock (_lock) return _ids.TryGetValue(hash, out mediaId);
        }

        public void Put(string hash, string mediaId)
        {
            lock (_lock) _ids[hash] = mediaId;
        }

        public void Remove(string hash)
        {
            lock (_lock) _ids.Remove(hash);
        }

        /// <summary>
        /// Grava num temporário e troca, para não deixar o cache pela metade se o jogo fechar. Os workers de envio
        /// chamam em paralelo: um de cada vez escreve o arquivo.
        /// </summary>
        public void Save()
        {
            lock (_fileLock)
            {
                string json;
                lock (_lock) json = JsonWriter.Serialize(_ids);
                Directory.CreateDirectory(Path.GetDirectoryName(_path));
                string temporary = _path + ".tmp";
                File.WriteAllText(temporary, json);
                if (File.Exists(_path)) File.Delete(_path);
                File.Move(temporary, _path);
            }
        }

        private void Load()
        {
            if (!File.Exists(_path)) return;
            try
            {
                Dictionary<string, object> stored = JsonReader.ParseObject(File.ReadAllText(_path));
                if (stored == null) return;
                foreach (KeyValuePair<string, object> entry in stored)
                    if (entry.Value is string id) _ids[entry.Key] = id;
            }
            catch (Exception)
            {
                // Cache corrompido só custa reenviar: o servidor devolve o mesmo id para a mesma imagem.
            }
        }
    }
}
