namespace GamePlanner.Core.UI
{
    /// <summary>
    /// Dados preenchidos no painel. A senha vive só em memória: o mod pode guardar os outros campos na
    /// configuração, nunca a senha.
    /// </summary>
    public sealed class AccountForm
    {
        public string ApiUrl = "http://localhost:8080";
        public string Username = "";
        public string Password = "";
        public string GameId = "";

        /// <summary>Extrai e envia os ícones. Desligado, os documentos vão sem media e as imagens já ligadas ficam.</summary>
        public bool IncludeImages = true;

        /// <summary>Só grava em disco, sem chamar a API. Não precisa de usuário e senha.</summary>
        public bool ExportOnly;

        public AccountForm Clone() => (AccountForm)MemberwiseClone();

        /// <summary>Mensagem do primeiro problema, ou null se dá para começar.</summary>
        public string Validate()
        {
            if (string.IsNullOrWhiteSpace(GameId)) return "Informe o id do jogo.";
            foreach (char c in GameId)
                if (!(c >= 'a' && c <= 'z') && !(c >= '0' && c <= '9') && c != '-' && c != '_')
                    return "Id do jogo: só minúsculas, números, hífen e sublinhado.";
            if (ExportOnly) return null;
            if (string.IsNullOrWhiteSpace(ApiUrl) || !(ApiUrl.StartsWith("http://") || ApiUrl.StartsWith("https://")))
                return "Endereço da API precisa começar com http:// ou https://.";
            if (string.IsNullOrWhiteSpace(Username)) return "Informe o usuário.";
            if (string.IsNullOrEmpty(Password)) return "Informe a senha.";
            return null;
        }
    }
}
