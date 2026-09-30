using System;
using System.Diagnostics;

namespace GamePlanner.HeartopiaOffline.Safety
{
    /// <summary>
    /// Recusa rodar com o jogo aberto. Só enumera os processos pelo nome: não abre handle, não lê memória, não
    /// encosta no xdt.exe — o anti-cheat (themis) vive dentro dele e é justamente com ele que não se mexe.
    /// </summary>
    public static class GameProcessGuard
    {
        // xdt = o jogo; XDLauncher = o lançador, que baixa os hotfixes para o LocalLow enquanto está aberto.
        // O UnityCrashHandler64 fica de fora: ele só existe junto do xdt e tem o mesmo nome em todo jogo Unity.
        private static readonly string[] ProcessNames = { "xdt", "XDLauncher" };

        public static int Checks { get; private set; }

        /// <summary>Lança <see cref="GameRunningException"/> se o jogo ou o lançador estiverem abertos.</summary>
        public static void Check(string stage)
        {
            Checks++;
            string running = FindRunning();
            if (running != null) throw new GameRunningException(running, stage);
        }

        private static string FindRunning()
        {
            foreach (string name in ProcessNames)
            {
                Process[] processes = Process.GetProcessesByName(name);
                try
                {
                    if (processes.Length > 0) return name + ".exe";
                }
                finally
                {
                    foreach (Process process in processes) process.Dispose();
                }
            }
            return null;
        }
    }

    public sealed class GameRunningException : Exception
    {
        public GameRunningException(string process, string stage)
            : base($"{process} está aberto ({stage}). Feche o jogo e o lançador e rode de novo.")
        {
        }
    }
}
