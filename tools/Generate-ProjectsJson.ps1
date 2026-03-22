# ============================================================
# Generate-ProjectsJson.ps1
# Genera assets/data/{lang}/projects.json
# ============================================================

param(
    [string]$Lang = "es",
    [string]$RootPath
)

if (-not $RootPath) {
    $RootPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

Write-Host "=== Generando projects.json ($Lang) ===" -ForegroundColor Cyan
Write-Host "RootPath: $RootPath" -ForegroundColor DarkCyan

# ------------------------------------------------------------
# Rutas
# ------------------------------------------------------------
$projectsPath = Join-Path $RootPath "$Lang/projects"
$outputPath   = Join-Path $RootPath "assets/data/$Lang"
$outputFile   = Join-Path $outputPath "projects.json"

if (!(Test-Path $projectsPath)) {
    throw "No existe la ruta de proyectos: $projectsPath"
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

function Get-MetaDescription {
    param([string]$Content)

    $pattern = '<meta\s+name\s*=\s*"description"\s+content\s*=\s*"([^"]*)"'
    $match = [regex]::Match(
        $Content,
        $pattern,
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return ""
}

function Parse-CsvList {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }

    return $Value -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

function To-Bool {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    return $Value.Trim().ToLower() -in @("true", "1", "yes", "y", "si", "sí")
}

function Is-PlaceholderProject {
    param($Project)

    if ([string]::IsNullOrWhiteSpace($Project.slug)) { return $true }
    if ([string]::IsNullOrWhiteSpace($Project.title)) { return $true }
    if ($Project.slug -match "base") { return $true }
    if ($Project.title -match "\[.*\]") { return $true }

    return $false
}

function Resolve-DemoUrl {
    param(
        [string]$FileFullName,
        [string]$ProjectsPath,
        [string]$Lang
    )

    $relative = $FileFullName.Substring($ProjectsPath.Length).TrimStart("\", "/")
    $relative = $relative -replace "\\", "/"
    return "/$Lang/projects/$relative"
}

# ------------------------------------------------------------
# Descubrimiento de archivos
# ------------------------------------------------------------
$items = @()

Get-ChildItem -Path $projectsPath -Recurse -Filter "*.html" | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw

    # Solo proyectos válidos
    if ($content -notmatch "data-project-demo") {
        Write-Host "Omitido (sin data-project-demo): $($file.FullName)" -ForegroundColor DarkYellow
        return
    }

    $title       = Get-AttributeValue $content "data-project-title"
    $type        = Get-AttributeValue $content "data-project-type"
    $status      = Get-AttributeValue $content "data-project-status"
    $category    = Get-AttributeValue $content "data-project-category"
    $date        = Get-AttributeValue $content "data-project-date"
    $tagsRaw     = Get-AttributeValue $content "data-project-tags"
    $featuredRaw = Get-AttributeValue $content "data-project-featured"
    $repoUrl     = Get-AttributeValue $content "data-project-repo"
    $engUrl      = Get-AttributeValue $content "data-project-engineering"
    $stackRaw    = Get-AttributeValue $content "data-project-stack"

    # Slug por carpeta del proyecto, no por nombre de archivo
    $slug = Split-Path $file.DirectoryName -Leaf

    $desc = Get-MetaDescription $content

    if (-not $desc) {
        $ledeMatch = [regex]::Match(
            $content,
            '<p class="project-demo-lede">(.*?)</p>',
            [System.Text.RegularExpressions.RegexOptions]::Singleline
        )

        if ($ledeMatch.Success) {
            $desc = ($ledeMatch.Groups[1].Value -replace "<.*?>", "").Trim()
        }
    }

    $project = [PSCustomObject]@{
        title          = $title
        slug           = $slug
        description    = $desc
        category       = $category
        type           = if ($type) { $type.ToLower() } else { "project" }
        status         = if ($status) { $status.ToLower() } else { "stable" }
        featured       = To-Bool $featuredRaw
        demoMode       = "iframe"
        demoUrl        = Resolve-DemoUrl -FileFullName $file.FullName -ProjectsPath $projectsPath -Lang $Lang
        repoUrl        = $repoUrl
        engineeringUrl = $engUrl
        tags           = Parse-CsvList $tagsRaw
        stack          = Parse-CsvList $stackRaw
        date           = $date
    }

    if (-not (Is-PlaceholderProject $project)) {
        $items += $project
        Write-Host "OK -> $($project.slug)" -ForegroundColor DarkGray
    }
    else {
        Write-Host "Omitido (placeholder): $($file.FullName)" -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# Validar slugs duplicados
# ------------------------------------------------------------
$duplicateSlugs = $items |
    Group-Object slug |
    Where-Object { $_.Count -gt 1 }

if ($duplicateSlugs) {
    Write-Host "ERROR: Se detectaron slugs duplicados en projects.json" -ForegroundColor Red

    foreach ($dup in $duplicateSlugs) {
        Write-Host (" - slug duplicado: " + $dup.Name) -ForegroundColor Yellow
    }

    throw "Abortado por slugs duplicados."
}

# ------------------------------------------------------------
# Ordenación
# ------------------------------------------------------------
$items = $items | Sort-Object `
    @{ Expression = "featured"; Descending = $true }, `
    @{ Expression = "type"; Descending = $false }, `
    @{ Expression = "title"; Descending = $false }

# ------------------------------------------------------------
# Exportar JSON
# ------------------------------------------------------------
$json = $items | ConvertTo-Json -Depth 6
$json | Set-Content -Path $outputFile -Encoding UTF8

Write-Host "----------------------------------------" -ForegroundColor DarkCyan
Write-Host "projects.json generado en:" -ForegroundColor Green
Write-Host $outputFile -ForegroundColor Green
Write-Host "Total proyectos: $($items.Count)" -ForegroundColor Cyan