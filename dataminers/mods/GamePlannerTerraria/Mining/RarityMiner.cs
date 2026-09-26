using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using Microsoft.Xna.Framework;
using Terraria.GameContent.UI;
using Terraria.ID;
using Terraria.ModLoader;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Raridades do jogo, com a cor que o próprio Terraria usa no nome do item. É o que faz o rarityCode dos
    /// itens virar nome e cor no site.
    /// </summary>
    internal static class RarityMiner
    {
        /// <summary>Na ordem em que o jogo as trata, da mais comum para a mais rara.</summary>
        private static readonly int[] Vanilla =
        {
            ItemRarityID.Gray, ItemRarityID.White, ItemRarityID.Blue, ItemRarityID.Green, ItemRarityID.Orange,
            ItemRarityID.LightRed, ItemRarityID.Pink, ItemRarityID.LightPurple, ItemRarityID.Lime,
            ItemRarityID.Yellow, ItemRarityID.Cyan, ItemRarityID.Red, ItemRarityID.Purple,
            ItemRarityID.Quest, ItemRarityID.Expert, ItemRarityID.Master,
        };

        private static readonly Dictionary<int, string> Nomes = new Dictionary<int, string>
        {
            { ItemRarityID.Gray, "Cinza" },
            { ItemRarityID.White, "Branco" },
            { ItemRarityID.Blue, "Azul" },
            { ItemRarityID.Green, "Verde" },
            { ItemRarityID.Orange, "Laranja" },
            { ItemRarityID.LightRed, "Vermelho claro" },
            { ItemRarityID.Pink, "Rosa" },
            { ItemRarityID.LightPurple, "Roxo claro" },
            { ItemRarityID.Lime, "Verde-limão" },
            { ItemRarityID.Yellow, "Amarelo" },
            { ItemRarityID.Cyan, "Ciano" },
            { ItemRarityID.Red, "Vermelho" },
            { ItemRarityID.Purple, "Roxo" },
            { ItemRarityID.Quest, "Missão" },
            { ItemRarityID.Expert, "Especialista" },
            { ItemRarityID.Master, "Mestre" },
        };

        private static readonly Dictionary<int, string> Codigos = new Dictionary<int, string>
        {
            { ItemRarityID.Gray, "gray" },
            { ItemRarityID.White, "white" },
            { ItemRarityID.Blue, "blue" },
            { ItemRarityID.Green, "green" },
            { ItemRarityID.Orange, "orange" },
            { ItemRarityID.LightRed, "light_red" },
            { ItemRarityID.Pink, "pink" },
            { ItemRarityID.LightPurple, "light_purple" },
            { ItemRarityID.Lime, "lime" },
            { ItemRarityID.Yellow, "yellow" },
            { ItemRarityID.Cyan, "cyan" },
            { ItemRarityID.Red, "red" },
            { ItemRarityID.Purple, "purple" },
            { ItemRarityID.Quest, "quest" },
            { ItemRarityID.Expert, "expert" },
            { ItemRarityID.Master, "master" },
        };

        /// <summary>
        /// Missão, especialista e mestre piscam no jogo (ItemRarity.GetColor devolve a cor do quadro atual),
        /// então valem uma cor fixa — senão cada mineração mandaria uma cor diferente para a API.
        /// </summary>
        private static readonly Dictionary<int, string> CoresFixas = new Dictionary<int, string>
        {
            { ItemRarityID.Quest, "#FFAF00" },
            { ItemRarityID.Expert, "#FF00FF" },
            { ItemRarityID.Master, "#FF3030" },
        };

        public static void Mine(MiningKit kit)
        {
            for (int i = 0; i < Vanilla.Length; i++) Registrar(kit, Vanilla[i], i);
        }

        /// <summary>Código da raridade do item, cadastrando-a se for de mod.</summary>
        public static string Code(MiningKit kit, int rare)
        {
            if (Codigos.TryGetValue(rare, out string codigo)) return codigo;

            ModRarity modded = RarityLoader.GetRarity(rare);
            if (modded == null) return null;

            string id = ExtId.Sanitize(ExtId.SnakeCase(modded.FullName.Replace('/', '_')));
            if (kit.Dataset.Add(new RarityDoc(id, modded.Name, Hex(modded.RarityColor), Vanilla.Length + rare)))
                kit.Context.Log.Info("Raridade de mod cadastrada: " + id);
            return id;
        }

        private static void Registrar(MiningKit kit, int rare, int ordem)
        {
            string codigo = Codigos[rare];
            string cor = CoresFixas.TryGetValue(rare, out string fixa) ? fixa : Hex(ItemRarity.GetColor(rare));
            kit.Dataset.Add(new RarityDoc(codigo, Nomes[rare], cor, ordem));
        }

        private static string Hex(Color cor) => "#" + cor.R.ToString("X2") + cor.G.ToString("X2") + cor.B.ToString("X2");
    }
}
