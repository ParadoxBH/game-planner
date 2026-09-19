using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using UnityEngine;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// Melhorias que não são de arma: bolsos extras do inventário (custos no prefab do jogador) e o barco,
    /// com motores, radar e skins. O barco e as quantidades vêm do prefab; nome e preço de motor e radar só
    /// existem nos balcões da ilha carregada (MotorPurchasable, BoatRadarPurchasable).
    /// </summary>
    internal static class PlayerUpgradeMiner
    {
        public const string BoatId = "boat";
        public const string RadarId = "upgrade_boat_radar";

        public static IEnumerator Mine(MiningKit kit)
        {
            AddPockets(kit);
            if (kit.ShouldYield()) yield return null;

            Boat boat = BoatManager.Boat != null ? BoatManager.Boat : FirstLoaded<Boat>(false);
            AddBoat(kit, boat);
            if (boat == null)
            {
                kit.Dataset.Warn("Barco não encontrado: motores e skins do barco ficaram de fora");
                yield break;
            }
            if (kit.ShouldYield()) yield return null;

            AddMotors(kit, boat);
            AddRadar(kit);
            AddBoatSkins(kit, boat);
        }

        private static void AddPockets(MiningKit kit)
        {
            PlayerInventory inventory = Player.LocalPlayer != null ? Player.LocalPlayer.Inventory : null;
            if (inventory == null && GameInfo.PlayerPrefab != null) inventory = GameInfo.PlayerPrefab.Inventory;
            int[] costs = HtfFields.ExtraSlotCosts.Get(inventory);
            if (costs == null || costs.Length == 0) return;

            int starting = HtfFields.StartingSlots.Get(inventory);
            string label = HtfNames.Text(SafeLabel()) ?? "Bolso extra";
            string previous = null;
            for (int n = 1; n <= costs.Length; n++)
            {
                string id = "upgrade_pocket_" + n;
                var doc = new ItemDoc { ExtId = id, Name = label + " " + n, Level = n };
                MiningKit.Price(doc, costs[n - 1]);
                kit.Categories.Apply(doc, HtfCategories.UpgradePocket, HtfCategories.Upgrade);
                if (starting > 0) doc.Attributes["inventory_slots"] = starting + n;
                kit.Dataset.Add(doc);
                kit.Dataset.Add(LevelRecipe(id, doc.Name, costs[n - 1], null, previous, n));
                previous = id;
            }
        }

        private static UnityEngine.Localization.LocalizedString SafeLabel()
        {
            try
            {
                return LocalizationManager.ExtraInventorySlotLocalized;
            }
            catch (System.Exception)
            {
                return null;
            }
        }

        private static void AddBoat(MiningKit kit, Boat boat)
        {
            kit.ItemNames[BoatId] = "Barco";
            var doc = new ItemDoc { ExtId = BoatId, Name = "Barco", Summary = "Liberado por missão; recebe motores, radar e skins." };
            kit.Categories.Apply(doc, HtfCategories.Boat, HtfCategories.Unlockable);
            List<BoatMotor> motors = HtfFields.BoatMotors.Get(boat);
            if (motors != null && motors.Count > 0)
            {
                doc.Attributes["motors"] = motors.Count;
                if (motors[0] != null) doc.Attributes["motor_force"] = motors[0].Force;
            }
            kit.Dataset.Add(doc);
        }

        private static void AddMotors(MiningKit kit, Boat boat)
        {
            List<BoatMotor> motors = HtfFields.BoatMotors.Get(boat);
            if (motors == null || motors.Count < 2) return;

            var shop = new Dictionary<int, MotorPurchasable>();
            foreach (MotorPurchasable counter in Resources.FindObjectsOfTypeAll<MotorPurchasable>())
                if (counter != null && counter.gameObject.scene.IsValid()) shop[HtfFields.MotorIndex.Get(counter)] = counter;

            float baseForce = motors[0] != null ? motors[0].Force : 0;
            string previous = null;
            for (int i = 1; i < motors.Count; i++)
            {
                // O PUT substitui o documento inteiro: motor sem balcão carregado sairia sem nome e preço por cima
                // do que outra ilha já enviou. Fica de fora; a receita do próximo nível o cita mesmo assim.
                string id = "upgrade_boat_motor_" + i;
                if (!shop.TryGetValue(i, out MotorPurchasable counter))
                {
                    previous = id;
                    continue;
                }
                int cost = Cost(counter) ?? 0;
                var doc = new ItemDoc
                {
                    ExtId = id,
                    Name = HtfNames.First(HtfNames.Text(HtfFields.MotorName.Get(counter)), "Motor " + i),
                    Level = i,
                };
                MiningKit.Price(doc, cost);
                kit.Categories.Apply(doc, HtfCategories.UpgradeBoat, HtfCategories.Upgrade);
                if (motors[i] != null)
                {
                    doc.Attributes["motor_force"] = motors[i].Force;
                    if (baseForce > 0) doc.Attributes["force_multiplier"] = System.Math.Round(motors[i].Force / baseForce, 2);
                }
                kit.Dataset.Add(doc);
                kit.Dataset.Add(LevelRecipe(id, doc.Name, cost, BoatId, previous, i));
                previous = id;
            }
            if (shop.Count < motors.Count - 1) kit.Dataset.Warn("Balcão de motor ausente nesta ilha: esses motores ficaram de fora (minere na ilha da loja do barco)");
        }

        private static void AddRadar(MiningKit kit)
        {
            BoatRadarPurchasable counter = FirstLoaded<BoatRadarPurchasable>(true);
            if (counter == null)
            {
                kit.Dataset.Warn("Balcão do radar ausente nesta ilha: radar ficou de fora (minere na ilha da loja do barco)");
                return;
            }
            int cost = Cost(counter) ?? 0;
            var doc = new ItemDoc
            {
                ExtId = RadarId,
                Name = HtfNames.First(HtfNames.Text(HtfFields.RadarName.Get(counter)), "Radar do barco"),
            };
            MiningKit.Price(doc, cost);
            kit.Categories.Apply(doc, HtfCategories.UpgradeBoat, HtfCategories.Upgrade);
            kit.Dataset.Add(doc);
            kit.Dataset.Add(LevelRecipe(RadarId, doc.Name, cost, BoatId, null, null));
        }

        private static void AddBoatSkins(MiningKit kit, Boat boat)
        {
            SkinPreset preset = boat.SkinPreset;
            if (preset == null || preset.Skins == null) return;
            var used = new HashSet<string>();
            for (int i = 0; i < preset.Skins.Count; i++)
                if (preset.Skins[i].Rarity != Rarity.Default)
                    kit.Dataset.Add(ItemMiner.SkinDoc(kit, BoatId, preset.Skins[i], i, used));
        }

        /// <summary>Preço do balcão: null quando não há balcão carregado, 0 quando é de graça.</summary>
        private static int? Cost(Purchasable counter)
        {
            if (counter == null) return null;
            return HtfFields.PurchasableFree.Get(counter) ? 0 : HtfFields.PurchasableCost.Get(counter);
        }

        /// <summary>Receita de melhoria: dinheiro, o dono (não consumido) e o nível anterior como requisito.</summary>
        private static RecipeDoc LevelRecipe(string id, string name, int cost, string ownerId, string previous, int? level)
        {
            var recipe = new RecipeDoc { ExtId = id, Name = name };
            if (cost > 0) recipe.Inputs.Add(new Requirement(MiningKit.Money, cost));
            if (ownerId != null) recipe.Inputs.Add(new Requirement(Reference.Item(ownerId), 1, notConsumed: true));
            if (previous != null)
            {
                recipe.Inputs.Add(new Requirement(Reference.Item(previous), 1, notConsumed: true));
                recipe.Unlock.Add(new RecipeUnlock("item", Reference.Item(previous)));
            }
            recipe.Outputs.Add(new RecipeOutput(Reference.Item(id), 1, level));
            return recipe;
        }

        /// <summary>Primeiro objeto carregado do tipo. inScene: só instâncias de cena (não prefabs).</summary>
        public static T FirstLoaded<T>(bool inScene) where T : Object
        {
            foreach (T found in Resources.FindObjectsOfTypeAll<T>())
            {
                if (found == null) continue;
                if (!inScene) return found;
                if (found is Component component && component.gameObject.scene.IsValid()) return found;
            }
            return null;
        }
    }
}
