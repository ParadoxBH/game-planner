using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace GamePlanner.ArcRaiders.Source
{
    /// <summary>
    /// Os dados do ARC Raiders, já lidos. Duas origens:
    /// <list type="bullet">
    /// <item>a API pública do arctracker (<see cref="ArcApi"/>) para itens, módulos da oficina e missões, que é a
    /// versão em dia do jogo;</item>
    /// <item>o clone local do RaidTheory/arcraiders-data para o resto: arctracker-ui/pt-BR.json (nomes dos tipos,
    /// locais e raridades, que nos itens vêm só em inglês), skillNodes.json e as imagens.</item>
    /// </list>
    /// Sem API (modo offline, ou rede fora e sem cópia local), itens, módulos e missões também vêm do clone, que
    /// parou antes da atualização 2.0. Só leitura: a ferramenta nunca escreve no clone.
    /// </summary>
    public sealed class ArcSource
    {
        public readonly string Root;

        public readonly List<JsonObject> Items;
        public readonly Dictionary<string, JsonObject> ItemsById;

        /// <summary>Módulos da oficina, na ordem do id.</summary>
        public readonly List<JsonObject> Hideout;

        public readonly Dictionary<string, JsonObject> Quests;
        public readonly Dictionary<string, JsonObject> SkillNodes;

        /// <summary>De onde veio cada parte, para o console e o relatório.</summary>
        public readonly List<string> Origins = new List<string>();

        private readonly JsonObject _ui;
        private readonly string _imageCache;

        private ArcSource(string root, ArcApi api)
        {
            Root = root;
            _imageCache = api?.ImageCache;

            Items = List(FromApi(api, "items", "items")) ?? RepoFolder("items");
            ItemsById = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
            foreach (JsonObject item in Items)
                if (Fields(item, "id") is string id) ItemsById[id] = item;

            Hideout = List(FromApi(api, "hideout", "hideoutModules")) ?? RepoFolder("hideout");
            Hideout.Sort((a, b) => string.CompareOrdinal(Fields(a, "id"), Fields(b, "id")));

            Quests = ById(List(FromApi(api, "quests", "quests")) ?? RepoFolder("quests"));
            SkillNodes = ById((ReadRepoFile("skillNodes.json") as JsonArray)?.OfType<JsonObject>().ToList());
            _ui = ReadRepoFile(Path.Combine("arctracker-ui", "pt-BR.json")) as JsonObject;

            if (api != null) DownloadMissingImages(api);
        }

        /// <summary>Null quando a pasta não parece o repositório (sem items/ ou hideout/). api null é modo offline.</summary>
        public static ArcSource Load(string root, ArcApi api) => IsRepository(root) ? new ArcSource(root, api) : null;

        /// <summary>A pasta tem cara de clone do RaidTheory/arcraiders-data.</summary>
        public static bool IsRepository(string root) =>
            Directory.Exists(Path.Combine(root, "items")) && Directory.Exists(Path.Combine(root, "hideout"));

        public bool HasUiTexts => _ui != null;

        /// <summary>
        /// Texto da interface do arctracker em pt-BR, ex.: ("ItemTypes", "Assault Rifle"). A seção pode ser um
        /// caminho com pontos ("StashPage.currencies"); a chave não, porque tem tipo com ponto no nome.
        /// </summary>
        public string UiText(string section, string key)
        {
            JsonNode group = _ui;
            foreach (string part in section.Split('.'))
                group = (group as JsonObject)?[part];
            return group is JsonObject map && map[key] is JsonValue value && value.TryGetValue(out string text) ? text : null;
        }

        /// <summary>PNG em images/{folder} do clone ou, se não está lá, no cache de imagens baixadas. Null se nenhum.</summary>
        public byte[] Image(string folder, string name)
        {
            string repo = Path.Combine(Root, "images", folder, name + ".png");
            if (File.Exists(repo)) return File.ReadAllBytes(repo);
            if (_imageCache == null) return null;
            string cached = Path.Combine(_imageCache, folder, name + ".png");
            return File.Exists(cached) ? File.ReadAllBytes(cached) : null;
        }

        // ------------------------------------------------------------------ leitura

        private JsonNode FromApi(ArcApi api, string resource, string property)
        {
            if (api == null)
            {
                Origins.Add(resource + ": clone local (modo offline)");
                return null;
            }
            JsonObject response = api.Fetch(resource, out string origin);
            JsonNode list = response?[property];
            Origins.Add(resource + ": " + (list != null ? origin : origin + "; usado o clone local, que pode estar desatualizado"));
            return list;
        }

        /// <summary>A API devolve lista (itens, missões) ou mapa pelo id (módulos da oficina).</summary>
        private static List<JsonObject> List(JsonNode node) => node switch
        {
            JsonArray array => array.OfType<JsonObject>().ToList(),
            JsonObject map => map.Select(entry => entry.Value).OfType<JsonObject>().ToList(),
            _ => null,
        };

        private static Dictionary<string, JsonObject> ById(List<JsonObject> nodes)
        {
            var result = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
            foreach (JsonObject node in nodes ?? new List<JsonObject>())
                if (Fields(node, "id") is string id) result[id] = node;
            return result;
        }

        private static string Fields(JsonObject node, string name) =>
            node[name] is JsonValue value && value.TryGetValue(out string text) && text.Length > 0 ? text : null;

        private List<JsonObject> RepoFolder(string folder)
        {
            string path = Path.Combine(Root, folder);
            if (!Directory.Exists(path)) return new List<JsonObject>();
            return Directory.GetFiles(path, "*.json")
                .OrderBy(file => file, StringComparer.Ordinal)
                .Select(file => Parse(file) as JsonObject)
                .Where(node => node != null)
                .ToList();
        }

        private JsonNode ReadRepoFile(string relative)
        {
            string path = Path.Combine(Root, relative);
            return File.Exists(path) ? Parse(path) : null;
        }

        private static JsonNode Parse(string path)
        {
            try
            {
                return JsonNode.Parse(File.ReadAllText(path));
            }
            catch (JsonException e)
            {
                throw new InvalidDataException("JSON inválido em " + path + ": " + e.Message, e);
            }
        }

        // ------------------------------------------------------------------ imagens do CDN

        /// <summary>
        /// Ícone de item que o clone não tem (os itens da 2.0 não têm nenhum lá) e imagem de módulo da oficina sem
        /// equivalente em images/workshop: baixa do arctracker para o cache, uma vez.
        /// </summary>
        private void DownloadMissingImages(ArcApi api)
        {
            var wanted = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (JsonObject item in Items)
            {
                string id = Fields(item, "id");
                string url = Fields(item, "imageFilename");
                if (id == null || url == null || !url.StartsWith("http", StringComparison.OrdinalIgnoreCase)) continue;
                string name = Path.GetFileNameWithoutExtension(new Uri(url).AbsolutePath);
                if (RepoHasImage("items", id) || RepoHasImage("items", name)) continue;
                wanted["items/" + name + ".png"] = url;
            }
            foreach (JsonObject module in Hideout)
            {
                string id = Fields(module, "id");
                string path = (module["levels"] as JsonArray)?.OfType<JsonObject>()
                    .Select(level => Fields(level, "image")).FirstOrDefault(image => image != null);
                if (id != null && path != null) wanted["hideout/" + id + ".png"] = ArcApi.Origin + path;
            }

            int pending = wanted.Count(image => !File.Exists(Path.Combine(api.ImageCache, image.Key)));
            if (pending == 0) return;
            Console.WriteLine("Baixando " + pending + " imagens do arctracker que o repositório não tem...");
            (int downloaded, List<string> failed) = api.DownloadImages(wanted);
            Origins.Add("imagens: " + downloaded + " baixadas do arctracker para " + api.ImageCache +
                        (failed.Count > 0 ? "; " + failed.Count + " falharam: " + string.Join(", ", failed.Take(5)) : ""));
        }

        private bool RepoHasImage(string folder, string name) => File.Exists(Path.Combine(Root, "images", folder, name + ".png"));
    }
}
