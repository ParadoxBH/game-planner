<#
.SYNOPSIS
    Liga mods\GamePlannerTerraria à pasta ModSources do tModLoader.

.DESCRIPTION
    Mod do tModLoader é compilado pelo próprio jogo, e o jogo só enxerga o que está em
    Documentos\My Games\Terraria\tModLoader\ModSources. Em vez de manter uma cópia lá, este script cria uma
    junção (junction) apontando para a pasta do repositório: edita-se aqui, compila-se no jogo.

    A junção também faz o "..\tModLoader.targets" do .csproj resolver, que é o arquivo que o instalador do
    tModLoader deixa em ModSources com o caminho da instalação.

.PARAMETER ModSources
    Pasta ModSources, quando o tModLoader não está no lugar padrão (parâmetro -savedirectory, por exemplo).

.PARAMETER Remover
    Desfaz a ligação em vez de criá-la.

.EXAMPLE
    .\tools\link-modsources.ps1
#>
[CmdletBinding()]
param(
    [string] $ModSources,
    [switch] $Remover
)

$ErrorActionPreference = 'Stop'

$origem = (Resolve-Path (Join-Path $PSScriptRoot '..\mods\GamePlannerTerraria')).Path
$nome = Split-Path $origem -Leaf

if (-not $ModSources) {
    $documentos = [Environment]::GetFolderPath('MyDocuments')
    $ModSources = Join-Path $documentos 'My Games\Terraria\tModLoader\ModSources'
}

if (-not (Test-Path $ModSources)) {
    throw "ModSources não encontrada em '$ModSources'. Abra o tModLoader uma vez em Workshop -> Desenvolver Mods (ela é criada aí), ou passe -ModSources <caminho>."
}

$destino = Join-Path $ModSources $nome
$existente = Get-Item $destino -ErrorAction SilentlyContinue

if ($Remover) {
    if (-not $existente) {
        Write-Host "Nada para remover: '$destino' não existe."
        return
    }
    if (-not $existente.LinkType) {
        throw "'$destino' é uma pasta de verdade, não uma junção. Apague à mão se for isso mesmo que você quer."
    }
    # Remove só a junção; Delete() de um DirectoryInfo com reparse point não toca no destino.
    $existente.Delete()
    Write-Host "Ligação removida de '$destino'."
    return
}

if ($existente) {
    if (-not $existente.LinkType) {
        throw "Já existe uma pasta de verdade em '$destino'. Mova ou apague antes de ligar o repositório."
    }
    $alvo = @($existente.Target)[0]
    if ($alvo -eq $origem) {
        Write-Host "Já ligada: '$destino' -> '$origem'."
    }
    else {
        throw "'$destino' já aponta para '$alvo'. Rode com -Remover antes."
    }
}
else {
    New-Item -ItemType Junction -Path $destino -Value $origem | Out-Null
    Write-Host "Ligada: '$destino' -> '$origem'."
}

$targets = Join-Path $ModSources 'tModLoader.targets'
if (-not (Test-Path $targets)) {
    Write-Warning "Falta '$targets'. Ele é criado quando o tModLoader abre o menu de desenvolver mods; sem ele o projeto não compila."
}

Write-Host ''
Write-Host 'Agora, no jogo: Workshop -> Desenvolver Mods -> GamePlannerTerraria -> Compilar e recarregar.'
