using HarmonyLib;
using UnityEngine;

namespace GamePlanner.Valheim
{
    /// <summary>
    /// Enquanto o painel está aberto o jogo não pode reagir ao teclado: digitar a senha com "E", "Tab" ou
    /// "M" interagiria, abriria o inventário ou o mapa. Também solta o cursor para clicar nos campos.
    /// </summary>
    [HarmonyPatch]
    internal static class InputBlockPatches
    {
        private static bool Open => GamePlannerValheim.PanelOpen;

        [HarmonyPostfix]
        [HarmonyPatch(typeof(Player), "TakeInput")]
        private static void PlayerTakeInput(ref bool __result)
        {
            if (Open) __result = false;
        }

        /// <summary>Movimento e olhar da câmera passam pelo PlayerController, não pelo Player.</summary>
        [HarmonyPostfix]
        [HarmonyPatch(typeof(PlayerController), "TakeInput")]
        private static void PlayerControllerTakeInput(ref bool __result)
        {
            if (Open) __result = false;
        }

        [HarmonyPostfix]
        [HarmonyPatch(typeof(GameCamera), "UpdateMouseCapture")]
        private static void ReleaseCursor()
        {
            if (!Open) return;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        [HarmonyPrefix]
        [HarmonyPatch(typeof(Chat), "Update")]
        private static bool ChatUpdate() => !Open;

        [HarmonyPrefix]
        [HarmonyPatch(typeof(InventoryGui), "Update")]
        private static bool InventoryUpdate() => !Open;

        [HarmonyPrefix]
        [HarmonyPatch(typeof(Minimap), "Update")]
        private static bool MinimapUpdate() => !Open;

        /// <summary>Esc fecha o painel em vez de abrir o menu do jogo.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(Menu), "Update")]
        private static bool MenuUpdate() => !Open;
    }
}
