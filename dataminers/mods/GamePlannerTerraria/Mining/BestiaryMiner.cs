using System;
using System.Collections;
using System.Collections.Generic;
using GamePlanner.Core.Model;
using GamePlanner.Core.Text;
using Terraria;
using Terraria.GameContent.Bestiary;
using Terraria.Localization;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// O bestiário diz, para cada NPC, o texto de ambientação e em que condições ele aparece. As condições vêm
    /// como chave de tradução e é o prefixo dela que diz o que é:
    ///
    /// | Chave | Vira |
    /// | --- | --- |
    /// | Bestiary_Biomes.* | local (bioma), com um ponto de surgimento ligando o NPC ao bioma |
    /// | Bestiary_Invasions.* | evento do tipo "invasion" no NPC e no ponto |
    /// | Bestiary_Events.* | evento do tipo "event" (lua de sangue, eclipse...) |
    /// | Bestiary_Times.* | atributo active_time do NPC (dia, noite, entardecer) |
    ///
    /// O mundo do Terraria é gerado por semente, então não há mapa nem coordenada: o ponto de surgimento vale
    /// para o bioma inteiro, que é o caso que a API chama de ponto sem position.
    /// </summary>
    internal static class BestiaryMiner
    {
        private const string Biomas = "Bestiary_Biomes.";
        private const string Invasoes = "Bestiary_Invasions.";
        private const string Eventos = "Bestiary_Events.";
        private const string Horarios = "Bestiary_Times.";

        public static IEnumerator Mine(MiningKit kit)
        {
            if (Main.BestiaryDB == null)
            {
                kit.Dataset.Warn("Bestiário não carregado: biomas, eventos e pontos de surgimento ficaram de fora");
                yield break;
            }

            int pontos = 0;
            foreach (KeyValuePair<int, EntityDoc> par in kit.NpcDocs)
            {
                BestiaryEntry entrada = Buscar(kit, par.Key);
                if (entrada?.Info == null) continue;

                var locais = new List<string>();
                var horarios = new List<string>();
                foreach (IBestiaryInfoElement elemento in entrada.Info)
                {
                    if (elemento is FlavorTextBestiaryInfoElement ambientacao) Ambientacao(par.Value, ambientacao);
                    else if (elemento is SpawnConditionBestiaryInfoElement condicao) Condicao(kit, par.Value, condicao, locais, horarios);
                }

                if (horarios.Count > 0) par.Value.Attributes["active_time"] = string.Join(", ", horarios);
                pontos += Pontos(kit, par.Key, par.Value, locais);

                if (kit.ShouldYield()) yield return null;
            }

            kit.Context.Status("Bestiário: " + kit.Dataset.Locations.Count + " bioma(s), " +
                               kit.Dataset.Events.Count + " evento(s), " + pontos + " ponto(s) de surgimento");
        }

        private static BestiaryEntry Buscar(MiningKit kit, int netId)
        {
            try
            {
                return Main.BestiaryDB.FindEntryByNPCID(netId);
            }
            catch (Exception e)
            {
                kit.Dataset.Warn("Bestiário do NPC " + netId + " não lido: " + e.Message);
                return null;
            }
        }

        private static void Ambientacao(EntityDoc doc, FlavorTextBestiaryInfoElement elemento)
        {
            string texto = TerrariaNames.Text(TerrariaFields.FlavorKey.Get(elemento));
            if (texto == null) return;
            doc.Description = texto;
            doc.Summary ??= texto;
        }

        /// <summary>Cada condição de surgimento vira bioma, evento ou horário, conforme o prefixo da chave.</summary>
        private static void Condicao(MiningKit kit, EntityDoc doc, SpawnConditionBestiaryInfoElement elemento,
                                     List<string> locais, List<string> horarios)
        {
            string chave = Chave(elemento);
            if (chave == null) return;

            if (chave.StartsWith(Biomas, StringComparison.Ordinal))
            {
                string id = Local(kit, chave);
                if (id != null && !locais.Contains(id)) locais.Add(id);
            }
            else if (chave.StartsWith(Invasoes, StringComparison.Ordinal) || chave.StartsWith(Eventos, StringComparison.Ordinal))
            {
                string id = Evento(kit, chave, chave.StartsWith(Invasoes, StringComparison.Ordinal) ? "invasion" : "event");
                if (id != null && !doc.Events.Contains(id)) doc.Events.Add(id);
            }
            else if (chave.StartsWith(Horarios, StringComparison.Ordinal))
            {
                string nome = TerrariaNames.Text(chave) ?? Sufixo(chave);
                if (!horarios.Contains(nome)) horarios.Add(nome);
            }
        }

        private static string Chave(SpawnConditionBestiaryInfoElement elemento)
        {
            try
            {
                return elemento.GetDisplayNameKey();
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static string Local(MiningKit kit, string chave)
        {
            string id = ExtId.Sanitize("biome_" + ExtId.SnakeCase(Sufixo(chave)));
            if (id != null && !kit.Dataset.Contains("locations", id))
            {
                kit.Dataset.Add(new LocationDoc
                {
                    ExtId = id,
                    Name = TerrariaNames.Text(chave) ?? TerrariaNames.Humanize(Sufixo(chave)),
                    LocationType = "biome",
                });
            }
            return id;
        }

        private static string Evento(MiningKit kit, string chave, string tipo)
        {
            string id = ExtId.Sanitize("event_" + ExtId.SnakeCase(Sufixo(chave)));
            if (id != null && !kit.Dataset.Contains("events", id))
                kit.Dataset.Add(new EventDoc(id, TerrariaNames.Text(chave) ?? TerrariaNames.Humanize(Sufixo(chave)), tipo));
            return id;
        }

        /// <summary>Um ponto por bioma em que o NPC aparece. Sem bioma não há ponto: a API exige local.</summary>
        private static int Pontos(MiningKit kit, int netId, EntityDoc doc, List<string> locais)
        {
            int feitos = 0;
            foreach (string local in locais)
            {
                var ponto = new SpawnPointDoc
                {
                    ExtId = ExtId.Sanitize("spawn_" + doc.ExtId + "_" + local.Substring("biome_".Length)),
                    Name = doc.Name,
                    Location = local,
                };
                ponto.Occupants.Add(new Occupant(Reference.Entity(doc.ExtId)));
                ponto.Events.AddRange(doc.Events);
                if (kit.Dataset.Add(ponto)) feitos++;
            }
            return feitos;
        }

        private static string Sufixo(string chave)
        {
            int ponto = chave.LastIndexOf('.');
            return ponto >= 0 ? chave.Substring(ponto + 1) : chave;
        }
    }
}
