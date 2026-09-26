using GamePlanner.Core.Diagnostics;
using log4net;
using Terraria.ModLoader;

namespace GamePlannerTerraria
{
    /// <summary>
    /// Minerador de dados do Terraria para o Game Planner. Não muda nada no jogo: lê o conteúdo carregado
    /// (itens, NPCs, receitas, lojas, bestiário) e envia para a API, ou exporta em JSON.
    ///
    /// Tudo acontece por comando de chat (<see cref="GamePlannerCommand"/>); a conta e as opções ficam em
    /// Configurações de Mods (<see cref="GamePlannerConfig"/>), menos a senha, que só vive na memória.
    /// </summary>
    public class GamePlannerMod : Mod
    {
        public static GamePlannerMod Instance => ModContent.GetInstance<GamePlannerMod>();

        /// <summary>Log do Core apontando para o log do tModLoader. Vale de qualquer thread.</summary>
        internal static IGpLog Log { get; private set; } = NullLog.Instance;

        public override void Load() => Log = new TmlLog(Logger);

        public override void Unload() => Log = NullLog.Instance;
    }

    /// <summary>Liga o log genérico do Core ao log4net do tModLoader, que aceita chamada de qualquer thread.</summary>
    internal sealed class TmlLog : IGpLog
    {
        private readonly ILog _log;

        public TmlLog(ILog log) => _log = log;

        public void Info(string message) => _log.Info(message);
        public void Warn(string message) => _log.Warn(message);
        public void Error(string message) => _log.Error(message);
    }
}
