using System.Collections;
using System.Collections.Generic;
using System.Text;
using GamePlanner.Core.Model;
using UnityEngine;
using UnityEngine.Localization;
using UnityEngine.SceneManagement;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// O que se desbloqueia jogando: roupas do personagem (cada conjunto sai de uma conquista), ilhas, a grelha,
    /// o chefe final e as missões dos NPCs, que viram receitas "entregue X, receba Y". Missões só existem na
    /// cena da ilha carregada.
    /// </summary>
    internal static class UnlockableMiner
    {
        /// <summary>SaveManager.ServerSave.MaxIsland começa em 2: as duas primeiras ilhas já vêm liberadas.</summary>
        private const int IslandsUnlockedAtStart = 2;

        private const string GrillId = "feature_grill";
        private const string FinalBossId = "feature_final_boss";

        /// <summary>Campo do SkinManager -> (conquista, como liberar), copiado do AchievementManager.</summary>
        private static readonly (string Field, string Achievement, string Condition)[] OutfitUnlocks =
        {
            ("_lighthouseKeeper", "A03_Boss1", "Derrote o 1º chefe."),
            ("_swampMan", "A07_BoatUpgrade", "Compre um motor novo para o barco."),
            ("_swampLady", "A08_Boss2", "Derrote o 2º chefe."),
            ("_kioskLady", "A09_BurntCreature", "Coma uma criatura queimada."),
            ("_tourist", "A13_Boss3", "Derrote o 3º chefe."),
            ("_grillmaster", "A14_GrillMaster", "Libere a grelha."),
            ("_andrei", "A17_Roulette", "Acerte o verde na roleta."),
            ("_jacob", "A18_LegendarySkin", "Tire uma skin lendária no caça-níquel."),
            ("_gunStoreClerc", "A19_AllAttachments", "Monte mira, cano, laser, pente estendido e munição melhorada na mesma arma."),
            ("_scaredGuyInShorts", "A20_Boss4", "Derrote o 4º chefe."),
            ("_storeGrandma", "A24_MaxBoat", "Compre o último motor do barco."),
            ("_military", "A21_Boss5", "Derrote o 5º chefe."),
            ("_scientist", "A25_FinishGame", "Termine o jogo."),
        };

        public static IEnumerator Mine(MiningKit kit)
        {
            AddOutfits(kit);
            if (kit.ShouldYield()) yield return null;
            AddIslands(kit);
            AddQuests(kit);
        }

        public static string IslandId(int number) => "island_" + number;

        private static void AddOutfits(MiningKit kit)
        {
            SkinManager manager = PlayerUpgradeMiner.FirstLoaded<SkinManager>(true);
            var clothes = new List<Clothes>();
            Clothes[] listed = HtfFields.AllClothes.Get(manager);
            if (listed != null) foreach (Clothes c in listed) if (c != null && !clothes.Contains(c)) clothes.Add(c);
            foreach (Clothes c in Resources.FindObjectsOfTypeAll<Clothes>()) if (c != null && !clothes.Contains(c)) clothes.Add(c);

            var unlocks = new Dictionary<Clothes, (string Achievement, string Condition)>();
            foreach (var unlock in OutfitUnlocks)
            {
                Clothes target = HtfFields.Named<Clothes>(manager, unlock.Field);
                if (target != null) unlocks[target] = (unlock.Achievement, unlock.Condition);
            }

            foreach (Clothes outfit in clothes)
            {
                string id = HtfNames.Id("outfit_", outfit);
                if (id == null) continue;
                var doc = new ItemDoc { ExtId = id, Name = HtfNames.Humanize(outfit.name) };
                kit.Categories.Apply(doc, HtfCategories.Outfit, HtfCategories.Unlockable);
                doc.Attributes["default_unlocked"] = outfit.DefaultUnlocked;
                if (outfit.HatMesh != null) doc.Attributes["has_hat"] = true;
                if (outfit.OutfitMesh != null) doc.Attributes["has_outfit"] = true;
                if (outfit.AccessoryMesh != null) doc.Attributes["has_accessory"] = true;
                if (unlocks.TryGetValue(outfit, out var unlock))
                {
                    doc.Summary = unlock.Condition;
                    doc.Attributes["achievement"] = unlock.Achievement;
                }
                else if (outfit.DefaultUnlocked) doc.Summary = "Liberada desde o início.";

                Mesh mesh = outfit.OutfitMesh != null ? outfit.OutfitMesh : outfit.HatMesh != null ? outfit.HatMesh : outfit.AccessoryMesh;
                doc.IconImage = kit.MeshIcon(id, mesh, new Vector3(0, 180, 0));
                kit.Dataset.Add(doc);
            }
            if (clothes.Count == 0) kit.Dataset.Warn("Nenhuma roupa carregada: SkinManager não encontrado");
        }

        /// <summary>
        /// Cena 0 é o menu/base; as ilhas vêm depois dela. O jogo só navega até TotalIslands - 1
        /// (OnlineIslandManager.NextIslandInBuild): a última cena do build não é ilha.
        /// </summary>
        private static void AddIslands(MiningKit kit)
        {
            int islands = SceneManager.sceneCountInBuildSettings - 2;
            for (int n = 1; n <= islands; n++)
            {
                string scene = System.IO.Path.GetFileNameWithoutExtension(SceneUtility.GetScenePathByBuildIndex(n));
                var doc = new ItemDoc { ExtId = IslandId(n), Name = "Ilha " + n, Level = n };
                kit.Categories.Apply(doc, HtfCategories.Island, HtfCategories.Unlockable);
                doc.Attributes["scene"] = scene;
                doc.Attributes["default_unlocked"] = n <= IslandsUnlockedAtStart;
                doc.Summary = n <= IslandsUnlockedAtStart ? "Liberada desde o início." : "Liberada por missão de NPC.";
                kit.Dataset.Add(doc);
            }
        }

        private static void AddQuests(MiningKit kit)
        {
            var owners = new Dictionary<NPCQuest, NPC>();
            foreach (NPC npc in Resources.FindObjectsOfTypeAll<NPC>())
            {
                if (npc == null || !npc.gameObject.scene.IsValid()) continue;
                List<NPCQuest> quests = HtfFields.NpcQuests.Get(npc);
                if (quests != null) foreach (NPCQuest quest in quests) if (quest != null && !owners.ContainsKey(quest)) owners[quest] = npc;
            }

            foreach (NPCQuest quest in Resources.FindObjectsOfTypeAll<NPCQuest>())
            {
                if (quest == null) continue;
                Reference reward = Reward(kit, quest);
                if (reward == null) continue;

                owners.TryGetValue(quest, out NPC npc);
                var recipe = new RecipeDoc
                {
                    ExtId = HtfNames.Id("quest_", quest),
                    Name = "Missão: " + HtfNames.Humanize(quest.name),
                    Summary = Summary(quest, npc),
                    Description = Dialog(quest.Lines),
                };
                if (recipe.ExtId == null) continue;

                if (quest.QuestItems != null)
                    foreach (Item item in quest.QuestItems)
                    {
                        string itemId = kit.ItemId(item);
                        if (itemId != null) recipe.Inputs.Add(new Requirement(Reference.Item(itemId), System.Math.Max(1, (int)quest.TotalItems)));
                    }
                recipe.Outputs.Add(new RecipeOutput(reward, 1));

                int island = npc != null ? npc.gameObject.scene.buildIndex : -1;
                if (island >= 1) recipe.Unlock.Add(new RecipeUnlock("island", Reference.Item(IslandId(island))));
                kit.Dataset.Add(recipe);
            }
        }

        /// <summary>O que a missão entrega. Missão de dinheiro (NPC que compra peixe) e "nada" não viram receita.</summary>
        private static Reference Reward(MiningKit kit, NPCQuest quest)
        {
            switch (quest.Type)
            {
                case QuestType.GiveBait:
                    string bait = BaitMiner.Id(quest.BaitToReceive);
                    return bait != null ? Reference.Item(bait) : null;
                case QuestType.UnlockIsland:
                    return quest.IslandToUnlock > 0 ? Reference.Item(IslandId(quest.IslandToUnlock)) : null;
                case QuestType.UnlockBoat:
                    return Reference.Item(PlayerUpgradeMiner.BoatId);
                case QuestType.UnlockGrill:
                    return Feature(kit, GrillId, "Grelha", "Cozinha o que se pesca.");
                case QuestType.FinalBoss:
                    return Feature(kit, FinalBossId, "Chefe final", "Libera a luta contra o chefe final.");
                default:
                    return null;
            }
        }

        private static Reference Feature(MiningKit kit, string id, string name, string summary)
        {
            if (!kit.Dataset.Contains("items", id))
            {
                var doc = new ItemDoc { ExtId = id, Name = name, Summary = summary };
                kit.Categories.Apply(doc, HtfCategories.Feature, HtfCategories.Unlockable);
                kit.Dataset.Add(doc);
            }
            return Reference.Item(id);
        }

        private static string Summary(NPCQuest quest, NPC npc)
        {
            var sb = new StringBuilder();
            if (npc != null) sb.Append("NPC: ").Append(HtfNames.Humanize(HtfNames.Id(npc))).Append(". ");
            if (quest.QuestItems != null && quest.QuestItems.Count > 1)
                sb.Append("Serve qualquer um dos itens, ").Append(quest.TotalItems).Append(" no total. ");
            else if (quest.OnlyCreatures && (quest.QuestItems == null || quest.QuestItems.Count == 0))
                sb.Append("Aceita qualquer criatura, ").Append(quest.TotalItems).Append(" no total. ");
            return sb.Length == 0 ? null : sb.ToString().Trim();
        }

        private static string Dialog(LocalizedString[] lines)
        {
            if (lines == null) return null;
            var sb = new StringBuilder();
            foreach (LocalizedString line in lines)
            {
                string text = HtfNames.Text(line);
                if (text == null) continue;
                if (sb.Length > 0) sb.Append('\n');
                sb.Append(text);
            }
            return sb.Length == 0 ? null : sb.ToString();
        }
    }
}
