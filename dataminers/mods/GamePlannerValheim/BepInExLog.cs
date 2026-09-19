using BepInEx.Logging;
using GamePlanner.Core.Diagnostics;

namespace GamePlanner.Valheim
{
    /// <summary>Liga o log genérico do Core ao log do BepInEx. ManualLogSource aceita chamada de qualquer thread.</summary>
    internal sealed class BepInExLog : IGpLog
    {
        private readonly ManualLogSource _source;

        public BepInExLog(ManualLogSource source) => _source = source;

        public void Info(string message) => _source.LogInfo(message);
        public void Warn(string message) => _source.LogWarning(message);
        public void Error(string message) => _source.LogError(message);
    }
}
