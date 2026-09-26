using System;
using System.ComponentModel;
using System.IO;
using GamePlanner.Core.UI;
using GamePlanner.Core.Upload;
using GamePlannerTerraria.Mining;
using Terraria;
using Terraria.ModLoader;
using Terraria.ModLoader.Config;

namespace GamePlannerTerraria
{
    /// <summary>
    /// Opções do lado do cliente (Configurações de Mods). A senha não está aqui de propósito: config de mod
    /// fica em arquivo, legível por qualquer mod, e senha em arquivo é senha vazada. Use "/gp senha".
    /// </summary>
    public class GamePlannerConfig : ModConfig
    {
        public override ConfigScope Mode => ConfigScope.ClientSide;

        public static GamePlannerConfig Instance => ModContent.GetInstance<GamePlannerConfig>();

        [DefaultValue("http://localhost:8080")]
        public string EnderecoDaApi;

        [DefaultValue("")]
        public string Usuario;

        [DefaultValue(TerrariaMiner.DefaultGame)]
        public string IdDoJogo;

        [DefaultValue(true)]
        public bool SomenteConteudoDoTerraria;

        [DefaultValue(true)]
        public bool EnviarImagens;

        [Range(32, 1024)]
        [Increment(32)]
        [DefaultValue(256)]
        [Slider]
        public int TamanhoMaximoDaImagem;

        [Range(1, DatasetUploader.MaxParallelism)]
        [DefaultValue(4)]
        public int EnviosSimultaneos;

        /// <summary>Preenche o formulário do Core com a config atual. A senha vem do <see cref="Credenciais"/>.</summary>
        public AccountForm Formulario(bool somenteExportar)
        {
            return new AccountForm
            {
                ApiUrl = (EnderecoDaApi ?? "").Trim(),
                Username = (Usuario ?? "").Trim(),
                Password = Credenciais.Senha ?? "",
                GameId = string.IsNullOrWhiteSpace(IdDoJogo) ? TerrariaMiner.DefaultGame : IdDoJogo.Trim(),
                IncludeImages = EnviarImagens,
                ExportOnly = somenteExportar,
            };
        }
    }

    /// <summary>
    /// Senha da conta, só em memória. Vem de "/gp senha", da variável de ambiente GAMEPLANNER_SENHA ou de um
    /// arquivo fora do mod (tModLoader\GamePlanner\senha.txt), nessa ordem. Some quando o jogo fecha.
    /// </summary>
    internal static class Credenciais
    {
        public const string VariavelDeAmbiente = "GAMEPLANNER_SENHA";

        private static string _senha;

        /// <summary>Pasta do Game Planner dentro do tModLoader: cache de mídia, exportações e senha.txt.</summary>
        public static string Pasta => Path.Combine(Main.SavePath, "GamePlanner");

        public static string ArquivoDeSenha => Path.Combine(Pasta, "senha.txt");

        public static string Senha
        {
            get
            {
                if (!string.IsNullOrEmpty(_senha)) return _senha;
                string ambiente = SafeEnvironment();
                if (!string.IsNullOrEmpty(ambiente)) return ambiente;
                return SafeFile();
            }
        }

        /// <summary>De onde saiu a senha em uso, para o comando dizer sem mostrar a senha.</summary>
        public static string Origem
        {
            get
            {
                if (!string.IsNullOrEmpty(_senha)) return "digitada nesta sessão";
                if (!string.IsNullOrEmpty(SafeEnvironment())) return "variável de ambiente " + VariavelDeAmbiente;
                if (!string.IsNullOrEmpty(SafeFile())) return ArquivoDeSenha;
                return null;
            }
        }

        public static void Guardar(string senha) => _senha = senha;

        public static void Esquecer() => _senha = null;

        private static string SafeEnvironment()
        {
            try
            {
                return Environment.GetEnvironmentVariable(VariavelDeAmbiente);
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static string SafeFile()
        {
            try
            {
                return File.Exists(ArquivoDeSenha) ? File.ReadAllText(ArquivoDeSenha).Trim() : null;
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
