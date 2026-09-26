using System;
using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using Terraria;
using Terraria.GameContent.ItemDropRules;
using Terraria.ID;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// NPCs como entidades: inimigos, chefes, moradores e bichinhos. Os valores saem de ContentSamples, e os
    /// drops da mesma tabela que alimenta o bestiário (ItemDropsDB), já com a chance de cada item.
    ///
    /// Net id negativo é variante (lesma azul, esqueleto fantasiado): entra como entidade própria, marcada com
    /// variantOf apontando para o NPC base.
    /// </summary>
    internal static class NpcMiner
    {
        public static IEnumerator Mine(MiningKit kit)
        {
            var netIds = new List<int>(ContentSamples.NpcsByNetId.Keys);
            netIds.Sort();

            int feitos = 0;
            var usados = new HashSet<string>();
            foreach (int netId in netIds)
            {
                if (netId == 0 || !kit.NpcAceito(netId)) continue;
                if (!ContentSamples.NpcsByNetId.TryGetValue(netId, out NPC npc) || npc == null) continue;

                string id = TerrariaNames.NpcId(netId);
                if (id == null || !usados.Add(id)) continue;

                EntityDoc doc = Construir(kit, npc, netId, id);
                if (kit.Dataset.Add(doc))
                {
                    kit.NpcIds[netId] = id;
                    kit.NpcDocs[netId] = doc;
                }

                if (++feitos % 100 == 0) kit.Context.Status("NPCs: " + feitos + "/" + netIds.Count);
                if (kit.ShouldYield()) yield return null;
            }

            kit.Context.Status("NPCs: " + kit.NpcIds.Count + " minerados");
        }

        private static EntityDoc Construir(MiningKit kit, NPC npc, int netId, string id)
        {
            var doc = new EntityDoc
            {
                ExtId = id,
                Name = TerrariaNames.NpcName(netId),
                IconImage = kit.Icons.Npc(npc.type, id),
            };

            // A variante tem o mesmo tipo do NPC base, que é quem fica com o id sem sufixo.
            if (netId < 0 && npc.type != netId) doc.VariantOf = TerrariaNames.NpcId(npc.type);

            Classificar(kit, doc, npc);
            Atributos(doc.Attributes, npc, netId);
            Drops(kit, doc, npc, netId);
            return doc;
        }

        private static void Classificar(MiningKit kit, EntityDoc doc, NPC npc)
        {
            if (npc.boss) kit.Categories.Apply(doc, TerrariaCategories.Boss);
            if (npc.townNPC) kit.Categories.Apply(doc, TerrariaCategories.TownNpc);
            if (Bichinho(npc)) kit.Categories.Apply(doc, TerrariaCategories.Critter);
            if (!npc.friendly && !npc.townNPC) kit.Categories.Apply(doc, TerrariaCategories.Enemy);
        }

        private static bool Bichinho(NPC npc) =>
            npc.catchItem > 0 || (npc.type < Main.npcCatchable.Length && Main.npcCatchable[npc.type]);

        private static void Atributos(Dictionary<string, object> a, NPC npc, int netId)
        {
            a["npc_id"] = netId;
            if (npc.lifeMax > 0) a["life"] = npc.lifeMax;
            if (npc.damage > 0) a["damage"] = npc.damage;
            if (npc.defense > 0) a["defense"] = npc.defense;
            if (npc.knockBackResist != 1f) a["knockback_resist"] = Math.Round(npc.knockBackResist, 2);
            // value é o dinheiro que o NPC larga, em cobre (o Rei Lesma vale Item.buyPrice(gold: 1) = 10000).
            if (npc.value > 0) a["coins_copper"] = Math.Round(npc.value, 2);
            if (npc.boss) a["boss"] = true;
            if (npc.townNPC) a["town_npc"] = true;
            if (npc.friendly) a["friendly"] = true;
            if (npc.lavaImmune) a["lava_immune"] = true;
            if (npc.noGravity) a["no_gravity"] = true;
            if (npc.rarity > 0) a["rarity_stars"] = npc.rarity;
            if (ContentSamples.NpcBestiaryRarityStars.TryGetValue(netId, out int estrelas) && estrelas > 0)
                a["bestiary_stars"] = estrelas;
        }

        /// <summary>
        /// A tabela de drops é a mesma do bestiário: ReportDroprates devolve item, quantidade e chance já
        /// combinadas com a chance das regras que vieram antes na corrente.
        /// </summary>
        private static void Drops(MiningKit kit, EntityDoc doc, NPC npc, int netId)
        {
            if (npc.catchItem > 0)
            {
                Reference alvo = kit.ItemRef(npc.catchItem);
                if (alvo != null) doc.Drops.Add(new Drop(alvo, 1, chance: 1));
            }

            List<DropRateInfo> relatos = Relatos(kit, netId);
            foreach (DropRateInfo relato in relatos)
            {
                Reference alvo = kit.ItemRef(relato.itemId);
                if (alvo == null || relato.dropRate <= 0) continue;

                int minimo = Math.Max(1, relato.stackMin);
                int maximo = Math.Max(minimo, relato.stackMax);
                doc.Drops.Add(new Drop(alvo, minimo, maximo > minimo ? maximo : (double?)null, Math.Round(relato.dropRate, 6)));
            }
        }

        private static List<DropRateInfo> Relatos(MiningKit kit, int netId)
        {
            var relatos = new List<DropRateInfo>();
            try
            {
                List<IItemDropRule> regras = Main.ItemDropsDB.GetRulesForNPCID(netId, false);
                if (regras == null) return relatos;
                var corrente = new DropRateInfoChainFeed(1f);
                foreach (IItemDropRule regra in regras) regra?.ReportDroprates(relatos, corrente);
            }
            catch (Exception e)
            {
                kit.Dataset.Warn("Drops do NPC " + netId + " não lidos: " + e.Message);
                relatos.Clear();
            }
            return relatos;
        }
    }
}
