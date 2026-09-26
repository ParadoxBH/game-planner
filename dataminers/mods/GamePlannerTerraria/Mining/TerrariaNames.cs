using System;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using GamePlanner.Core.Text;
using Terraria;
using Terraria.ID;
using Terraria.Localization;
using Terraria.Map;
using Terraria.ModLoader;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Ids, nomes e textos do Terraria no formato da API.
    ///
    /// O id de conteúdo é o nome interno ("CopperShortsword", "BlueSlime"), não o número: número muda entre
    /// versões e não diz nada a quem lê o site. Conteúdo de mod usa o nome completo dele ("MeuMod/Espada"),
    /// com a barra virando sublinhado, que é o que a API aceita.
    /// </summary>
    internal static class TerrariaNames
    {
        /// <summary>[i:17], [c/FF0000:texto], [g:3]: marcações do chat que não são texto.</summary>
        private static readonly Regex Icones = new Regex(@"\[[a-zA-Z]{1,8}(?:/[^:\]]{0,32})?:(?<texto>[^\]]*)\]", RegexOptions.Compiled);

        private static readonly Regex Espacos = new Regex("[ \\t]{2,}", RegexOptions.Compiled);

        // ------------------------------------------------------------------ ids

        public static string ItemId(int type)
        {
            if (type <= 0) return null;
            ModItem modded = ItemLoader.GetItem(type);
            if (modded != null) return ExtId.Sanitize(modded.FullName);
            return ExtId.Sanitize(ItemID.Search.TryGetName(type, out string nome) ? nome : "Item" + type);
        }

        /// <summary>
        /// Net id negativo é variante do mesmo NPC (lesma azul, esqueleto fantasiado): recebe o nome do tipo
        /// com o número da variante no fim, para não brigar com o id do NPC base.
        /// </summary>
        public static string NpcId(int netId)
        {
            if (netId == 0) return null;
            int type = netId;
            if (netId < 0 && ContentSamples.NpcsByNetId.TryGetValue(netId, out NPC amostra)) type = amostra.type;

            ModNPC modded = NPCLoader.GetNPC(type);
            string nome = modded != null ? modded.FullName : NPCID.Search.TryGetName(type, out string interno) ? interno : "NPC" + type;
            return ExtId.Sanitize(netId < 0 ? nome + "_" + -netId : nome);
        }

        /// <summary>Bancadas são entidades e vivem num espaço de ids próprio, para não colidir com NPC.</summary>
        public static string StationId(int tileType)
        {
            if (tileType < 0) return null;
            ModTile modded = TileLoader.GetTile(tileType);
            string nome = modded != null ? modded.FullName : TileID.Search.TryGetName(tileType, out string interno) ? interno : "Tile" + tileType;
            return ExtId.Sanitize("station_" + nome);
        }

        public static bool IsVanillaItem(int type) => type > 0 && type < ItemID.Count;

        public static bool IsVanillaNpc(int netId) => netId < NPCID.Count && netId > -NPCID.NegativeIDCount;

        public static bool IsVanillaTile(int tileType) => tileType >= 0 && tileType < TileID.Count;

        // ------------------------------------------------------------------ nomes

        public static string ItemName(int type) => Clean(Lang.GetItemNameValue(type)) ?? Humanize(ItemId(type));

        public static string NpcName(int netId) => Clean(Lang.GetNPCNameValue(netId)) ?? Humanize(NpcId(netId));

        /// <summary>Nome do que o jogador vê no mapa ao apontar a bancada; é o nome do bloco colocado.</summary>
        public static string TileName(int tileType, int estilo = 0)
        {
            try
            {
                int chave = MapHelper.TileToLookup(tileType, estilo);
                string nome = Clean(Lang.GetMapObjectName(chave));
                if (nome != null) return nome;
            }
            catch (Exception)
            {
                // Bloco sem entrada no mapa: cai no nome interno.
            }
            return Humanize(StationId(tileType)?.Substring("station_".Length));
        }

        // ------------------------------------------------------------------ texto

        /// <summary>Tira as marcações do chat e os espaços repetidos. Vazio vira null.</summary>
        public static string Clean(string valor)
        {
            if (string.IsNullOrWhiteSpace(valor)) return null;
            string texto = Icones.Replace(valor, m => m.Groups["texto"].Value);
            texto = Espacos.Replace(texto.Replace('\n', ' ').Replace('\r', ' '), " ").Trim();
            return texto.Length == 0 ? null : texto;
        }

        /// <summary>Texto traduzido do jogo. Chave que não existe vira null, não o nome da chave.</summary>
        public static string Text(string chave)
        {
            if (string.IsNullOrEmpty(chave)) return null;
            try
            {
                return Language.Exists(chave) ? Clean(Language.GetTextValue(chave)) : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>Texto do próprio mod (Localization/*.hjson), com os argumentos do formato.</summary>
        public static string Own(string chave, params object[] argumentos)
        {
            string completa = "Mods.GamePlannerTerraria." + chave;
            try
            {
                if (!Language.Exists(completa)) return null;
                return Clean(argumentos.Length == 0
                    ? Language.GetTextValue(completa)
                    : Language.GetTextValue(completa, argumentos));
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>"CopperShortsword" / "copper_shortsword" -> "Copper Shortsword". Último recurso de nome.</summary>
        public static string Humanize(string id)
        {
            if (string.IsNullOrEmpty(id)) return id;
            string[] palavras = ExtId.SnakeCase(id).Split(new[] { '_' }, StringSplitOptions.RemoveEmptyEntries);
            var sb = new StringBuilder(id.Length + 4);
            foreach (string palavra in palavras)
            {
                if (sb.Length > 0) sb.Append(' ');
                sb.Append(char.ToUpper(palavra[0], CultureInfo.InvariantCulture)).Append(palavra, 1, palavra.Length - 1);
            }
            return sb.ToString();
        }

        /// <summary>Primeiro texto não vazio.</summary>
        public static string First(params string[] valores)
        {
            foreach (string valor in valores)
                if (!string.IsNullOrWhiteSpace(valor)) return valor.Trim();
            return null;
        }
    }
}
