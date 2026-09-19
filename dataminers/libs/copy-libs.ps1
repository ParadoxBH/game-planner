<#
  Copia para libs\ as DLLs que os projetos referenciam. Elas são dos jogos (e do BepInEx), então não vão
  para o git: rode este script depois de clonar ou quando um jogo atualizar.

    libs\Common     BepInEx 5 + Harmony e os módulos da Unity usados pelo GamePlannerCore.
    libs\Valheim    assemblies do Valheim e da Unity dele.
    libs\HowToFish  assemblies do How to Fish e da Unity 6 dele.

  Common e Valheim saem da pasta libs do repositório de mods do Valheim, e não da instalação do jogo: os
  módulos da Unity que o Valheim instala hoje referenciam netstandard 2.1 e não compilam em net48. O Core
  compilado contra esses módulos mais antigos roda em qualquer Unity mais nova (inclusive a 6 do How to Fish).

  Exemplo:
    .\copy-libs.ps1 -ValheimLibs "C:\Users\guilh\source\repos\ModsValheim\libs" -HowToFish "F:\SteamLibrary\steamapps\common\How to Fish\How to Fish"
#>
param(
    [string]$ValheimLibs = "C:\Users\guilh\source\repos\ModsValheim\libs",
    [string]$HowToFish = "F:\SteamLibrary\steamapps\common\How to Fish\How to Fish"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Copy-Dlls([string]$from, [string]$to, [string[]]$names) {
    New-Item -ItemType Directory -Force $to | Out-Null
    foreach ($name in $names) {
        $source = Join-Path $from "$name.dll"
        if (Test-Path $source) {
            Copy-Item $source $to -Force
        } else {
            Write-Warning "Não encontrado: $source"
        }
    }
}

$howToFishManaged = Join-Path $HowToFish "How to Fish_Data\Managed"

Copy-Dlls $ValheimLibs (Join-Path $root "Common") @(
    "BepInEx", "0Harmony",
    "UnityEngine.CoreModule", "UnityEngine.ImageConversionModule", "UnityEngine.IMGUIModule", "UnityEngine.TextRenderingModule")

Copy-Dlls $ValheimLibs (Join-Path $root "Valheim") @(
    "assembly_valheim", "assembly_utils", "assembly_guiutils", "gui_framework", "Splatform", "SoftReferenceableAssets",
    "UnityEngine", "UnityEngine.CoreModule", "UnityEngine.IMGUIModule", "UnityEngine.UI", "UnityEngine.UIModule",
    "Unity.TextMeshPro")

Copy-Dlls $howToFishManaged (Join-Path $root "HowToFish") @(
    "Assembly-CSharp", "Assembly-CSharp-firstpass", "FishNet.Runtime", "Unity.Localization", "Unity.InputSystem",
    "Unity.TextMeshPro", "UnityEngine", "UnityEngine.CoreModule", "UnityEngine.IMGUIModule", "UnityEngine.InputLegacyModule",
    "UnityEngine.PhysicsModule", "UnityEngine.AnimationModule", "UnityEngine.UI", "UnityEngine.UIModule",
    "UnityEngine.UIElementsModule")

Write-Host "DLLs copiadas para $root"
