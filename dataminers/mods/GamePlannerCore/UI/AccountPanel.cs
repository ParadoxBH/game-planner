using System;
using GamePlanner.Core.Upload;
using UnityEngine;

namespace GamePlanner.Core.UI
{
    /// <summary>
    /// Janela IMGUI com os dados da conta, o botão de minerar e o progresso. IMGUI porque funciona em
    /// qualquer jogo Unity sem assets nem prefab. O mod chama Draw() dentro do OnGUI de um MonoBehaviour
    /// e decide sozinho a tecla que abre (Toggle) e como bloquear o input do jogo enquanto Visible.
    /// </summary>
    public sealed class AccountPanel
    {
        private const int WindowId = 0x6A11E2;

        private readonly UploadProgress _progress;
        private readonly string _title;
        private Rect _window = new Rect(0, 0, 520, 560);
        private bool _positioned;
        private Vector2 _logScroll;
        private int _lastLogVersion = -1;
        private string _validation;

        public readonly AccountForm Form;
        public bool Visible { get; private set; }

        /// <summary>Clicou em minerar com o formulário válido. Recebe uma cópia do formulário.</summary>
        public event Action<AccountForm> Submitted;

        public event Action CancelRequested;

        /// <summary>Janela fechada: bom momento para o mod salvar URL, usuário e jogo.</summary>
        public event Action Closed;

        public AccountPanel(string title, AccountForm initial, UploadProgress progress)
        {
            _title = title;
            Form = initial ?? new AccountForm();
            _progress = progress ?? throw new ArgumentNullException(nameof(progress));
        }

        public void Show() { Visible = true; _validation = null; }

        public void Hide()
        {
            if (!Visible) return;
            Visible = false;
            Form.Password = Form.Password ?? "";
            Closed?.Invoke();
        }

        public void Toggle() { if (Visible) Hide(); else Show(); }

        public void Draw()
        {
            if (!Visible) return;
            if (!_positioned)
            {
                _window.x = (Screen.width - _window.width) / 2f;
                _window.y = (Screen.height - _window.height) / 2f;
                _positioned = true;
            }

            Event current = Event.current;
            if (current.type == EventType.KeyDown && current.keyCode == KeyCode.Escape)
            {
                current.Use();
                Hide();
                return;
            }

            GUI.depth = -1000;
            _window = GUILayout.Window(WindowId, _window, DrawWindow, _title);
            _window.x = Mathf.Clamp(_window.x, 0, Mathf.Max(0, Screen.width - _window.width));
            _window.y = Mathf.Clamp(_window.y, 0, Mathf.Max(0, Screen.height - _window.height));
        }

        private void DrawWindow(int id)
        {
            UploadProgress.View view = _progress.Snapshot();
            bool busy = view.Busy;

            GUI.enabled = !busy;
            Row("Endereço da API", ref Form.ApiUrl);
            Row("Id do jogo", ref Form.GameId);
            Row("Usuário", ref Form.Username);
            GUILayout.BeginHorizontal();
            GUILayout.Label("Senha", GUILayout.Width(120));
            Form.Password = GUILayout.PasswordField(Form.Password ?? "", '*');
            GUILayout.EndHorizontal();

            Form.IncludeImages = GUILayout.Toggle(Form.IncludeImages, " Extrair e enviar ícones (vários envios em paralelo)");
            Form.ExportOnly = GUILayout.Toggle(Form.ExportOnly, " Só exportar para pasta (sem enviar)");
            GUI.enabled = true;

            if (_validation != null)
            {
                GUILayout.Space(4);
                GUILayout.Label("<color=#ff7070>" + _validation + "</color>", RichLabel());
            }

            GUILayout.Space(6);
            GUILayout.BeginHorizontal();
            if (busy)
            {
                if (GUILayout.Button("Cancelar", GUILayout.Height(28))) CancelRequested?.Invoke();
            }
            else if (GUILayout.Button(Form.ExportOnly ? "Minerar e exportar" : "Minerar e enviar", GUILayout.Height(28)))
            {
                _validation = Form.Validate();
                if (_validation == null) Submitted?.Invoke(Form.Clone());
            }
            if (GUILayout.Button("Fechar", GUILayout.Width(90), GUILayout.Height(28))) Hide();
            GUILayout.EndHorizontal();

            GUILayout.Space(6);
            GUILayout.Label(StateLabel(view.State) + (view.Total > 0 ? "  " + view.Done + "/" + view.Total : ""));
            DrawBar(view.Fraction);

            if (view.Version != _lastLogVersion)
            {
                _lastLogVersion = view.Version;
                _logScroll.y = float.MaxValue;
            }
            _logScroll = GUILayout.BeginScrollView(_logScroll, GUILayout.ExpandHeight(true));
            foreach (string line in view.Lines) GUILayout.Label(line);
            GUILayout.EndScrollView();

            GUI.DragWindow(new Rect(0, 0, 10000, 22));
        }

        private static void Row(string label, ref string value)
        {
            GUILayout.BeginHorizontal();
            GUILayout.Label(label, GUILayout.Width(120));
            value = GUILayout.TextField(value ?? "");
            GUILayout.EndHorizontal();
        }

        private static void DrawBar(float fraction)
        {
            Rect rect = GUILayoutUtility.GetRect(1, 8, GUILayout.ExpandWidth(true));
            GUI.Box(rect, GUIContent.none);
            if (fraction > 0f)
                GUI.Box(new Rect(rect.x, rect.y, rect.width * fraction, rect.height), GUIContent.none);
        }

        private static GUIStyle _richLabel;

        private static GUIStyle RichLabel()
        {
            if (_richLabel == null) _richLabel = new GUIStyle(GUI.skin.label) { richText = true, wordWrap = true };
            return _richLabel;
        }

        private static string StateLabel(UploadState state)
        {
            switch (state)
            {
                case UploadState.Mining: return "Minerando...";
                case UploadState.Uploading: return "Enviando...";
                case UploadState.Done: return "Concluído";
                case UploadState.Failed: return "Falhou";
                case UploadState.Cancelled: return "Cancelado";
                default: return "Pronto";
            }
        }
    }
}
