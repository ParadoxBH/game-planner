namespace GamePlanner.Core.Diagnostics
{
    /// <summary>
    /// Log sem depender do loader (BepInEx, MelonLoader...). O mod do jogo passa um adaptador.
    /// Pode ser chamado de qualquer thread: o envio roda fora da thread principal.
    /// </summary>
    public interface IGpLog
    {
        void Info(string message);
        void Warn(string message);
        void Error(string message);
    }

    /// <summary>Descarta tudo. Padrão quando ninguém informa um log.</summary>
    public sealed class NullLog : IGpLog
    {
        public static readonly NullLog Instance = new NullLog();

        public void Info(string message) { }
        public void Warn(string message) { }
        public void Error(string message) { }
    }
}
