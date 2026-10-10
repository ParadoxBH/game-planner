using System;
using GamePlanner.Core.Diagnostics;

namespace GamePlanner.ArcRaiders
{
    /// <summary>Log do envio no console. O envio chama de várias threads, então cada linha sai inteira.</summary>
    public sealed class ConsoleLog : IGpLog
    {
        private readonly object _lock = new object();

        public void Info(string message) => Write(message, null);
        public void Warn(string message) => Write(message, ConsoleColor.Yellow);
        public void Error(string message) => Write(message, ConsoleColor.Red);

        private void Write(string message, ConsoleColor? color)
        {
            lock (_lock)
            {
                if (color.HasValue) Console.ForegroundColor = color.Value;
                Console.WriteLine(message);
                if (color.HasValue) Console.ResetColor();
            }
        }
    }
}
