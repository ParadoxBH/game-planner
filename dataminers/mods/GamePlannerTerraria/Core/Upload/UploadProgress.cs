using System;
using System.Collections.Generic;

namespace GamePlanner.Core.Upload
{
    public enum UploadState
    {
        Idle,
        Mining,
        Uploading,
        Done,
        Failed,
        Cancelled,
    }

    /// <summary>
    /// Progresso lido pelo painel (thread principal) e escrito pela mineração e pelo envio (thread de fundo).
    /// Tudo sob lock; o painel lê uma cópia com Snapshot.
    /// </summary>
    public sealed class UploadProgress
    {
        public const int MaxLines = 200;

        private readonly object _lock = new object();
        private readonly LinkedList<string> _lines = new LinkedList<string>();
        private UploadState _state = UploadState.Idle;
        private string _status = "";
        private int _done;
        private int _total;
        private int _version;

        public sealed class View
        {
            public UploadState State;
            public string Status;
            public int Done;
            public int Total;
            public string[] Lines;
            public int Version;

            public bool Busy => State == UploadState.Mining || State == UploadState.Uploading;
            public float Fraction => Total <= 0 ? 0f : Math.Min(1f, (float)Done / Total);
        }

        public void Reset(UploadState state)
        {
            lock (_lock)
            {
                _state = state;
                _status = "";
                _done = 0;
                _total = 0;
                _lines.Clear();
                _version++;
            }
        }

        public void SetState(UploadState state, string status = null)
        {
            lock (_lock)
            {
                _state = state;
                if (status != null) { _status = status; AddLine(status); }
                _version++;
            }
        }

        public void SetStatus(string status)
        {
            lock (_lock) { _status = status; AddLine(status); _version++; }
        }

        /// <summary>Linha só no histórico, sem trocar o status principal.</summary>
        public void Line(string message)
        {
            lock (_lock) { AddLine(message); _version++; }
        }

        public void SetCount(int done, int total)
        {
            lock (_lock) { _done = done; _total = total; _version++; }
        }

        public View Snapshot()
        {
            lock (_lock)
            {
                var lines = new string[_lines.Count];
                _lines.CopyTo(lines, 0);
                return new View { State = _state, Status = _status, Done = _done, Total = _total, Lines = lines, Version = _version };
            }
        }

        private void AddLine(string message)
        {
            if (string.IsNullOrEmpty(message)) return;
            _lines.AddLast(DateTime.Now.ToString("HH:mm:ss") + "  " + message);
            while (_lines.Count > MaxLines) _lines.RemoveFirst();
        }
    }
}
