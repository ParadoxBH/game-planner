using System;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>Tabelas de drop do Valheim para a lista de Drop da API.</summary>
    internal static class ValheimDrops
    {
        /// <summary>Drops de criatura: chance e faixa de quantidade declaradas por drop.</summary>
        public static List<Drop> FromCharacter(CharacterDrop characterDrop)
        {
            var result = new List<Drop>();
            if (characterDrop == null || characterDrop.m_drops == null) return result;
            foreach (CharacterDrop.Drop drop in characterDrop.m_drops)
            {
                string itemId = ValheimNames.PrefabId(drop?.m_prefab);
                if (itemId == null) continue;
                Add(result, itemId, drop.m_amountMin, drop.m_amountMax, drop.m_chance);
            }
            return result;
        }

        /// <summary>
        /// DropTable sorteia de m_dropMin a m_dropMax vezes por peso (depois de passar em m_dropChance). A chance de
        /// cada item é aproximada como "sai ao menos uma vez em n sorteios com reposição", com n na média da faixa.
        /// Com m_oneOfEach todos saem, então a chance é só m_dropChance.
        /// </summary>
        public static List<Drop> FromTable(DropTable table)
        {
            var result = new List<Drop>();
            if (table == null || table.m_drops == null || table.m_drops.Count == 0) return result;

            float totalWeight = 0f;
            foreach (DropTable.DropData data in table.m_drops) totalWeight += Mathf.Max(0f, data.m_weight);
            float draws = Mathf.Max(1f, (table.m_dropMin + table.m_dropMax) / 2f);
            float tableChance = Mathf.Clamp01(table.m_dropChance);

            foreach (DropTable.DropData data in table.m_drops)
            {
                string itemId = ValheimNames.PrefabId(data.m_item);
                if (itemId == null) continue;
                double chance;
                if (table.m_oneOfEach || totalWeight <= 0f || table.m_drops.Count == 1)
                    chance = tableChance;
                else
                    chance = tableChance * (1 - Math.Pow(1 - Mathf.Max(0f, data.m_weight) / totalWeight, draws));
                Add(result, itemId, data.m_stackMin, data.m_stackMax, chance);
            }
            return result;
        }

        /// <summary>Quantidade mínima 1 (a API exige positiva); a máxima só vai quando é maior.</summary>
        public static void Add(List<Drop> list, string itemId, int min, int max, double chance)
        {
            int amount = Math.Max(1, min);
            int top = Math.Max(amount, max);
            double clamped = Math.Round(Math.Max(0, Math.Min(1, chance)), 4);
            list.Add(new Drop(Reference.Item(itemId), amount, top > amount ? top : (double?)null, clamped >= 1 ? (double?)null : clamped));
        }
    }
}
