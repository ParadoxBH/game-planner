using System;
using System.Collections.Generic;
using System.Reflection;
using Terraria.GameContent.Bestiary;
using Terraria.GameContent.UI;

namespace GamePlannerTerraria.Mining
{
    /// <summary>
    /// Campo privado de um tipo do jogo, lido por reflection e guardado em cache. Se uma atualização do
    /// Terraria renomear o campo, a leitura devolve o valor padrão e o nome vai para
    /// <see cref="TerrariaFields.Missing"/>, que vira aviso no dataset, em vez de derrubar a mineração.
    /// </summary>
    internal sealed class Campo<T, F> where T : class
    {
        private readonly string _nome;
        private FieldInfo _campo;
        private bool _procurado;

        public Campo(string nome) => _nome = nome;

        public F Get(T dono, F padrao = default)
        {
            if (dono == null) return padrao;
            if (!_procurado)
            {
                _procurado = true;
                _campo = typeof(T).GetField(_nome, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
                if (_campo == null || !typeof(F).IsAssignableFrom(_campo.FieldType))
                {
                    _campo = null;
                    TerrariaFields.Missing.Add(typeof(T).Name + "." + _nome);
                }
            }
            if (_campo == null) return padrao;
            try
            {
                return _campo.GetValue(dono) is F valor ? valor : padrao;
            }
            catch (Exception)
            {
                return padrao;
            }
        }
    }

    /// <summary>
    /// O pouco que o Terraria não expõe em API pública e que o minerador ainda quer: o texto de ambientação do
    /// bestiário e a moeda especial de algumas lojas. Tudo o mais sai de campo público ou de ContentSamples.
    /// </summary>
    internal static class TerrariaFields
    {
        public static readonly HashSet<string> Missing = new HashSet<string>();

        /// <summary>Chave de tradução do texto de ambientação ("A slime that...").</summary>
        public static readonly Campo<FlavorTextBestiaryInfoElement, string> FlavorKey =
            new Campo<FlavorTextBestiaryInfoElement, string>("_key");

        /// <summary>Item que vale como moeda -> quanto vale cada um (medalha do defensor, ficha...).</summary>
        public static readonly Campo<CustomCurrencySystem, Dictionary<int, int>> CurrencyUnits =
            new Campo<CustomCurrencySystem, Dictionary<int, int>>("_valuePerUnit");
    }
}
