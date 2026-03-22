# ============================================================
# Generate-LilianneData.ps1
# Genera el dataset reducido para Lilianne v1
# a partir de periodic-table-lookup.json
# ============================================================

param(
    [string]$InputFile,
    [string]$OutputFile,
    [string]$Language = "es"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Resolver rutas por defecto
# ------------------------------------------------------------
if (-not $InputFile) {
    $InputFile = Join-Path $PSScriptRoot "..\periodic-table-lookup.json"
}

if (-not $OutputFile) {
    $OutputFile = Join-Path $PSScriptRoot "..\es\projects\lilianne\data\elements.es.json"
}

$InputFile = (Resolve-Path $InputFile).Path

$OutputDir = Split-Path $OutputFile -Parent
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "=== Generate-LilianneData.ps1 ===" -ForegroundColor Cyan
Write-Host "Input : $InputFile" -ForegroundColor DarkCyan
Write-Host "Output: $OutputFile" -ForegroundColor DarkCyan
Write-Host "Lang  : $Language" -ForegroundColor DarkCyan

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
function Normalize-Text {
    param([object]$Value)

    if ($null -eq $Value) { return "" }

    $text = [string]$Value
    return $text.Trim()
}

function To-CategoryKey {
    param([string]$Category)

    switch ($Category.ToLowerInvariant()) {
        "diatomic nonmetal"       { return "noMetal" }
        "polyatomic nonmetal"     { return "noMetal" }
        "noble gas"               { return "gasNoble" }
        "alkali metal"            { return "metalAlcalino" }
        "alkaline earth metal"    { return "alcalinoterreo" }
        "transition metal"        { return "metalTransicion" }
        "post-transition metal"   { return "postMetal" }
        "metalloid"               { return "metaloide" }
        "halogen"                 { return "halogeno" }
        "lanthanide"              { return "lantanido" }
        "actinide"                { return "actinido" }
        default                   { return "unknown" }
    }
}

function To-CategoryLabelEs {
    param([string]$Category)

    switch ($Category.ToLowerInvariant()) {
        "diatomic nonmetal"       { return "No metal" }
        "polyatomic nonmetal"     { return "No metal" }
        "noble gas"               { return "Gas noble" }
        "alkali metal"            { return "Metal alcalino" }
        "alkaline earth metal"    { return "Metal alcalinotérreo" }
        "transition metal"        { return "Metal de transición" }
        "post-transition metal"   { return "Metal post-transición" }
        "metalloid"               { return "Metaloide" }
        "halogen"                 { return "Halógeno" }
        "lanthanide"              { return "Lantánido" }
        "actinide"                { return "Actínido" }
        default                   { return "Desconocido" }
    }
}

function To-CategoryLabelEn {
    param([string]$Category)

    switch ($Category.ToLowerInvariant()) {
        "diatomic nonmetal"       { return "Nonmetal" }
        "polyatomic nonmetal"     { return "Nonmetal" }
        "noble gas"               { return "Noble gas" }
        "alkali metal"            { return "Alkali metal" }
        "alkaline earth metal"    { return "Alkaline earth metal" }
        "transition metal"        { return "Transition metal" }
        "post-transition metal"   { return "Post-transition metal" }
        "metalloid"               { return "Metalloid" }
        "halogen"                 { return "Halogen" }
        "lanthanide"              { return "Lanthanide" }
        "actinide"                { return "Actinide" }
        default                   { return "Unknown" }
    }
}

function To-StateKey {
    param([string]$Phase)

    switch ($Phase.ToLowerInvariant()) {
        "gas"     { return "gas" }
        "solid"   { return "solid" }
        "liquid"  { return "liquid" }
        default   { return "unknown" }
    }
}

function To-StateLabelEs {
    param([string]$Phase)

    switch ($Phase.ToLowerInvariant()) {
        "gas"     { return "Gas" }
        "solid"   { return "Sólido" }
        "liquid"  { return "Líquido" }
        default   { return "Desconocido" }
    }
}

function To-StateLabelEn {
    param([string]$Phase)

    switch ($Phase.ToLowerInvariant()) {
        "gas"     { return "Gas" }
        "solid"   { return "Solid" }
        "liquid"  { return "Liquid" }
        default   { return "Unknown" }
    }
}

function Get-Label {
    param(
        [string]$Type,
        [string]$Value,
        [string]$Lang
    )

    switch ($Type) {
        "category" {
            if ($Lang -eq "es") { return To-CategoryLabelEs $Value }
            else                { return To-CategoryLabelEn $Value }
        }
        "state" {
            if ($Lang -eq "es") { return To-StateLabelEs $Value }
            else                { return To-StateLabelEn $Value }
        }
        default { return $Value }
    }
}

# ------------------------------------------------------------
# Cargar dataset maestro
# ------------------------------------------------------------
$raw = Get-Content $InputFile -Raw | ConvertFrom-Json

$elements = @()

# Caso 1: array plano (por si usas otro dataset en el futuro)
if ($raw -is [System.Collections.IEnumerable] -and $raw -isnot [string] -and $raw.Count -gt 0 -and $raw[0].symbol) {
    foreach ($item in $raw) {
        if ($item.symbol -and $item.number) {
            $elements += $item
        }
    }
}
# Caso 2: lookup plano con "order" + propiedades en raíz
elseif ($raw.PSObject.Properties.Name -contains "order") {

    foreach ($symbol in $raw.order) {
        $item = $raw.$symbol

        if ($null -ne $item -and $item.symbol -and $item.number) {
            $elements += $item
        }
    }
}
else {
    throw "El JSON de entrada no tiene un formato soportado."
}

if (-not $elements -or $elements.Count -eq 0) {
    throw "No se pudieron extraer elementos válidos del dataset maestro."
}

# ------------------------------------------------------------
# Transformación
# ------------------------------------------------------------
$result = foreach ($el in $elements) {
    $category = Normalize-Text $el.category
    $phase    = Normalize-Text $el.phase
    $summary  = Normalize-Text $el.summary
    $source   = Normalize-Text $el.source

    # Limpieza: no usar imagen, bohr, espectros, etc. en v1
    [PSCustomObject]@{
        symbol        = Normalize-Text $el.symbol
        name          = Normalize-Text $el.name
        number        = [int]$el.number
        mass          = $el.atomic_mass
        category      = $category
        categoryKey   = To-CategoryKey $category
        categoryLabel = Get-Label -Type "category" -Value $category -Lang $Language
        group         = if ($null -ne $el.group) { [int]$el.group } else { $null }
        period        = if ($null -ne $el.period) { [int]$el.period } else { $null }
        state         = To-StateKey $phase
        stateLabel    = Get-Label -Type "state" -Value $phase -Lang $Language
        summary       = $summary
        wiki          = $source
        x             = if ($null -ne $el.xpos) { [int]$el.xpos } else { $null }
        y             = if ($null -ne $el.ypos) { [int]$el.ypos } else { $null }
    }
}

# ------------------------------------------------------------
# Validaciones mínimas
# ------------------------------------------------------------
$duplicateNumbers = $result | Group-Object number | Where-Object { $_.Count -gt 1 }
if ($duplicateNumbers) {
    Write-Host "ERROR: números atómicos duplicados detectados." -ForegroundColor Red
    foreach ($dup in $duplicateNumbers) {
        Write-Host (" - number duplicado: " + $dup.Name) -ForegroundColor Yellow
    }
    throw "Abortado por duplicados."
}

$duplicateSymbols = $result | Group-Object symbol | Where-Object { $_.Count -gt 1 }
if ($duplicateSymbols) {
    Write-Host "ERROR: símbolos duplicados detectados." -ForegroundColor Red
    foreach ($dup in $duplicateSymbols) {
        Write-Host (" - symbol duplicado: " + $dup.Name) -ForegroundColor Yellow
    }
    throw "Abortado por duplicados."
}

# Orden por número atómico
$result = $result | Sort-Object number

# ------------------------------------------------------------
# Exportar
# ------------------------------------------------------------
$result | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputFile -Encoding UTF8

Write-Host "----------------------------------------" -ForegroundColor DarkCyan
Write-Host "Dataset Lilianne generado correctamente." -ForegroundColor Green
Write-Host "Total elementos: $($result.Count)" -ForegroundColor Cyan
Write-Host "Archivo: $OutputFile" -ForegroundColor Green