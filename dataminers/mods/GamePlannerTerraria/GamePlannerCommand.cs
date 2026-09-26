using System;
using GamePlanner.Core.Upload;
using GamePlannerTerraria.Mining;
using Microsoft.Xna.Framework;
using Terraria.ModLoader;

namespace GamePlannerTerraria
{
    /// <summary>
    /// "/gp ..." no chat. Comando em vez de painel: o jogo já tem uma tela de configuração para o endereço e o
    /// usuário, e o que sobra (senha, começar, acompanhar, cancelar) cabe em uma linha cada.
    /// </summary>
    public class GamePlannerCommand : ModCommand
    {
        public override CommandType Type => CommandType.Chat;

        public override string Command => "gp";

        public override string Usage => "/gp minerar | exportar | status | senha <senha> | esquecer | cancelar";

        public override string Description => "Minera os dados do jogo para o Game Planner.";

        public override void Action(CommandCaller caller, string input, string[] args)
        {
            string acao = args.Length > 0 ? args[0].ToLowerInvariant() : "ajuda";
            switch (acao)
            {
                case "minerar":
                case "enviar":
                    Comecar(caller, somenteExportar: false);
                    break;
                case "exportar":
                    Comecar(caller, somenteExportar: true);
                    break;
                case "senha":
                    Senha(caller, input);
                    break;
                case "esquecer":
                    Credenciais.Esquecer();
                    Responder(caller, "Senha esquecida.", Color.LightGreen);
                    break;
                case "status":
                    Status(caller);
                    break;
                case "cancelar":
                    GamePlannerSystem.Cancelar();
                    Responder(caller, "Cancelado.", Color.Goldenrod);
                    break;
                default:
                    Ajuda(caller);
                    break;
            }
        }

        private static void Comecar(CommandCaller caller, bool somenteExportar)
        {
            string problema = GamePlannerSystem.Iniciar(somenteExportar);
            if (problema != null) Responder(caller, problema, Color.OrangeRed);
        }

        /// <summary>A senha vem do texto cru: senha com espaço continua valendo.</summary>
        private static void Senha(CommandCaller caller, string input)
        {
            string senha = Resto(input, "senha");
            if (senha.Length == 0)
            {
                Responder(caller, "Use: /gp senha <senha>. Ela fica só na memória, some quando o jogo fecha.", Color.OrangeRed);
                return;
            }
            Credenciais.Guardar(senha);
            Responder(caller, "Senha guardada na memória desta sessão (" + senha.Length + " caracteres).", Color.LightGreen);
        }

        private static void Status(CommandCaller caller)
        {
            GamePlannerConfig config = GamePlannerConfig.Instance;
            UploadProgress.View situacao = GamePlannerSystem.Situacao;

            Responder(caller, "API " + config.EnderecoDaApi + " | usuário " + Ou(config.Usuario, "(vazio)") +
                              " | jogo " + Ou(config.IdDoJogo, TerrariaMiner.DefaultGame), Color.LightSkyBlue);
            Responder(caller, "Senha: " + Ou(Credenciais.Origem, "nenhuma (use /gp senha)") +
                              " | imagens: " + (config.EnviarImagens ? "sim" : "não") +
                              " | só Terraria: " + (config.SomenteConteudoDoTerraria ? "sim" : "não"), Color.LightSkyBlue);

            string andamento = situacao.Total > 0 ? " (" + situacao.Done + "/" + situacao.Total + ")" : "";
            Responder(caller, "Estado: " + situacao.State + andamento + (situacao.Status.Length > 0 ? " — " + situacao.Status : ""),
                GamePlannerSystem.Cor(situacao.State));
        }

        private static void Ajuda(CommandCaller caller)
        {
            Responder(caller, "/gp minerar — minera e envia para a API", Color.LightSkyBlue);
            Responder(caller, "/gp exportar — minera e grava em " + Credenciais.Pasta + "\\export", Color.LightSkyBlue);
            Responder(caller, "/gp senha <senha> — guarda a senha só na memória", Color.LightSkyBlue);
            Responder(caller, "/gp status | /gp cancelar | /gp esquecer", Color.LightSkyBlue);
            Responder(caller, "Endereço, usuário e id do jogo: Configurações de Mods.", Color.LightSkyBlue);
        }

        private static string Resto(string input, string palavra)
        {
            int inicio = input.IndexOf(palavra, StringComparison.OrdinalIgnoreCase);
            return inicio < 0 ? "" : input.Substring(inicio + palavra.Length).Trim();
        }

        private static string Ou(string valor, string padrao) => string.IsNullOrWhiteSpace(valor) ? padrao : valor;

        private static void Responder(CommandCaller caller, string texto, Color cor) => caller.Reply(texto, cor);
    }
}
