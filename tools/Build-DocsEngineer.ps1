# ============================================================
# Generate-EngineeringJson.ps1
# Genera assets/data/{lang}/engineering.json
# ============================================================

param(
    [string]$Lang = "es",
    [string]$RootPath
)

if (-not $RootPath) {
    $RootPath = Resolve-Path (Join-Path $PSScriptRoot "..")
}

Write-Host "RootPath: $RootPath" -ForegroundColor DarkCyan

Write-Host "=== Generando engineering.json ($Lang) ===" -ForegroundColor Cyan

# ------------------------------------------------------------
# Rutas
# ------------------------------------------------------------
$engineeringPath = Join-Path $RootPath "$Lang/engineering"
$outputPath = Join-Path $RootPath "assets/data/$Lang"
$outputFile = Join-Path $outputPath "engineering.json"

if (!(Test-Path $engineeringPath)) {
    throw "No existe la ruta: $engineeringPath"
}

if (!(Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
}

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
function Get-AttributeValue {
    param(
        [string]$Content,
        [string]$Attribute
    )

    $pattern = "$Attribute\s*=\s*`"([^`"]*)`""
    $match = [regex]::Match($Content, $pattern)

    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return ""
}

function Parse-Tags {
    param([string]$tags)

    if ([string]::IsNullOrWhiteSpace($tags)) {
        return @()
    }

    return $tags -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

function To-Bool {
    param([string]$value)

    return $value -match "^(true|1|yes)$"
}

function Is-Placeholder {
    param($doc)

    if ([string]::IsNullOrWhiteSpace($doc.slug)) { return $true }
    if ($doc.slug -match "base") { return $true }
    if ($doc.title -match "\[") { return $true }

    return $false
}

# ------------------------------------------------------------
# Procesar archivos
# ------------------------------------------------------------
$docs = @()

Get-ChildItem -Path $engineeringPath -Filter "*.html" | ForEach-Object {

    $file = $_
    $slug = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)

    Write-Host "Procesando: $slug" -ForegroundColor DarkGray

    $content = Get-Content $file.FullName -Raw

    # Solo documentos válidos
    if ($content -notmatch "data-engineering-doc") {
        Write-Host "  -> omitido (no engineering-doc)" -ForegroundColor Yellow
        return
    }

    $title       = Get-AttributeValue $content "data-doc-title"
    $category    = Get-AttributeValue $content "data-doc-category"
    $date        = Get-AttributeValue $content "data-doc-date"
    $updated     = Get-AttributeValue $content "data-doc-updated"
    $tagsRaw     = Get-AttributeValue $content "data-doc-tags"
    $featuredRaw = Get-AttributeValue $content "data-doc-featured"
    $desc        = Get-AttributeValue $content "meta name=`"description`" content"

    if (-not $desc) {
        # fallback: primer párrafo del summary
        $summaryMatch = [regex]::Match($content, '<p class="engineering-doc-summary">(.*?)</p>', 'Singleline')
        if ($summaryMatch.Success) {
            $desc = ($summaryMatch.Groups[1].Value -replace "<.*?>", "").Trim()
        }
    }

    $doc = [PSCustomObject]@{
        title       = $title
        category    = $category
        slug        = $slug
        description = $desc
        date        = $date
        updated     = $updated
        tags        = Parse-Tags $tagsRaw
        featured    = To-Bool $featuredRaw
        btnInHero   = To-Bool (Get-AttributeValue $content "data-doc-hero")
    }

    if (-not (Is-Placeholder $doc)) {
        $docs += $doc
    }
}

# ------------------------------------------------------------
# Ordenar
# ------------------------------------------------------------
$docs = $docs | Sort-Object `
    @{Expression = "featured"; Descending = $true}, `
    @{Expression = "updated"; Descending = $true}, `
    @{Expression = "date"; Descending = $true}, `
    @{Expression = "title"; Descending = $false}

# ------------------------------------------------------------
# Exportar JSON
# ------------------------------------------------------------
$json = $docs | ConvertTo-Json -Depth 4

$json | Set-Content -Path $outputFile -Encoding UTF8

Write-Host "OK → $outputFile" -ForegroundColor Green
Write-Host "Total documentos: $($docs.Count)" -ForegroundColor Cyan