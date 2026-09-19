using HarmonyLib;
using UnityEngine;

namespace GamePlanner.HowToFish
{
    /// <summary>
    /// Enquanto o painel está aberto o jogo não pode reagir ao teclado: digitar a senha com WASD, "E" ou Enter
    /// moveria o jogador, interagiria ou abriria o chat. Quase todo input do jogo passa por Player.BlockInputs
    /// (o mesmo que o jogo usa no chat e na pausa), então basta forçá-lo. O cursor é solto pelo plugin.
    /// </summary>
    [HarmonyPatch]
    internal static class InputBlockPatches
    {
        private static bool Open => GamePlannerHowToFish.PanelOpen;

        [HarmonyPostfix]
        [HarmonyPatch(typeof(Player), nameof(Player.BlockInputs), MethodType.Getter)]
        private static void PlayerBlockInputs(ref bool __result)
        {
            if (Open) __result = true;
        }

        /// <summary>Enter abre o chat direto pelo Input antigo, sem olhar BlockInputs.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(ChatManager), "Update")]
        private static bool ChatUpdate() => !Open;

        /// <summary>Esc fecha o painel em vez de abrir a pausa.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(PauseManager), "PauseInput")]
        private static bool PauseInput() => !Open;

        [HarmonyPostfix]
        [HarmonyPatch(typeof(PlayerCamera), nameof(PlayerCamera.ToggleMouse))]
        private static void ToggleMouse()
        {
            if (!Open) return;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
    }
}
