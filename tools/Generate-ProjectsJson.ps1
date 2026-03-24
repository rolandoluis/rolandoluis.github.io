# ============================================================
# Generate-ProjectsJson.ps1
# Genera assets/data/{lang}/projects.json
# Basado en carpetas de proyecto + contrato app/demo/preview
# ============================================================

param(
    [string]$Lang = "es",
    [string]$RootPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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
$assetsProjectsPath = Join-Path $RootPath "assets/projects"

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

    $patterns = @(
        '<meta\s+name\s*=\s*"description"\s+content\s*=\s*"([^"]*)"',
        '<meta\s+content\s*=\s*"([^"]*)"\s+name\s*=\s*"description"'
    )

    foreach ($pattern in $patterns) {
        $match = [regex]::Match(
            $Content,
            $pattern,
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        if ($match.Success) {
            return $match.Groups[1].Value.Trim()
        }
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

    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }

    return $Value.Trim().ToLower() -in @("true", "1", "yes", "y", "si", "sí")
}

function Is-PlaceholderProject {
    param($Project)

    if ([string]::IsNullOrWhiteSpace($Project.slug)) { return $true }
    if ([string]::IsNullOrWhiteSpace($Project.title)) { return $true }
    if ($Project.slug -match "^_") { return $true }
    if ($Project.slug -match "base") { return $true }
    if ($Project.title -match "\[.*\]") { return $true }

    return $false
}

function Resolve-ProjectUrl {
    param(
        [string]$FileFullName,
        [string]$RootPath,
        [string]$Lang
    )

    $langRoot = Join-Path $RootPath $Lang
    $relative = $FileFullName.Substring($langRoot.Length).TrimStart("\", "/")
    $relative = $relative -replace "\\", "/"
    return "/$Lang/$relative"
}

function Resolve-AssetUrl {
    param(
        [string]$FileFullName,
        [string]$RootPath
    )

    $assetsRoot = Join-Path $RootPath "assets"
    $relative = $FileFullName.Substring($assetsRoot.Length).TrimStart("\", "/")
    $relative = $relative -replace "\\", "/"
    return "/assets/$relative"
}

function Get-PreferredProjectEntryFile {
    param(
        [string]$ProjectDir
    )

    $candidates = @("app.html", "demo.html", "index.html")

    foreach ($name in $candidates) {
        $path = Join-Path $ProjectDir $name
        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

function Get-PreviewFile {
    param(
        [string]$ProjectDir
    )

    $path = Join-Path $ProjectDir "preview.html"
    if (Test-Path $path) {
        return $path
    }

    return $null
}

function Get-ThumbsAndGallery {
    param(
        [string]$Slug,
        [string]$AssetsProjectsPath,
        [string]$RootPath
    )

    $result = [PSCustomObject]@{
        Thumb   = ""
        Gallery = @()
    }

    $projectAssetsDir = Join-Path $AssetsProjectsPath $Slug
    if (!(Test-Path $projectAssetsDir)) {
        return $result
    }

    $images = Get-ChildItem -Path $projectAssetsDir -File |
        Where-Object { $_.Extension.ToLower() -in @(".webp", ".png", ".jpg", ".jpeg") } |
        Sort-Object Name

    if (-not $images) {
        return $result
    }

    $gallery = @()
    foreach ($img in $images) {
        $gallery += (Resolve-AssetUrl -FileFullName $img.FullName -RootPath $RootPath)
    }

    $result.Thumb = $gallery[0]
    $result.Gallery = $gallery

    return $result
}

# ------------------------------------------------------------
# Descubrimiento de proyectos (por carpeta)
# ------------------------------------------------------------
$items = @()

$projectDirs = Get-ChildItem -Path $projectsPath -Directory | Sort-Object Name

foreach ($dir in $projectDirs) {
    $slug = $dir.Name

    # Ignorar carpetas privadas/base
    if ($slug -match "^_" -or $slug -match "base") {
        Write-Host "Omitido (carpeta base/privada): $slug" -ForegroundColor DarkYellow
        continue
    }

    $entryFile = Get-PreferredProjectEntryFile -ProjectDir $dir.FullName
    if (-not $entryFile) {
        Write-Host "Omitido (sin app/demo/index): $slug" -ForegroundColor DarkYellow
        continue
    }

    $previewFile = Get-PreviewFile -ProjectDir $dir.FullName

    $content = Get-Content $entryFile -Raw

    if ($content -notmatch "data-project-demo") {
        Write-Host "Omitido (sin data-project-demo): $slug" -ForegroundColor DarkYellow
        continue
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

    $demoUrl = Resolve-ProjectUrl -FileFullName $entryFile -RootPath $RootPath -Lang $Lang
    $previewUrl = ""

    if ($previewFile) {
        $previewUrl = Resolve-ProjectUrl -FileFullName $previewFile -RootPath $RootPath -Lang $Lang
    }

    $media = Get-ThumbsAndGallery -Slug $slug -AssetsProjectsPath $AssetsProjectsPath -RootPath $RootPath

    $project = [PSCustomObject]@{
        title          = $title
        slug           = $slug
        description    = $desc
        category       = $category
        type           = if ($type) { $type.ToLower() } else { "project" }
        status         = if ($status) { $status.ToLower() } else { "stable" }
        featured       = To-Bool $featuredRaw

        thumb          = $media.Thumb
        gallery        = $media.Gallery

        previewUrl     = $previewUrl
        previewMode    = if ($previewUrl) { "iframe" } else { "" }

        demoUrl        = $demoUrl
        demoMode       = "iframe"

        repoUrl        = $repoUrl
        engineeringUrl = $engUrl

        tags           = Parse-CsvList $tagsRaw
        stack          = Parse-CsvList $stackRaw
        date           = $date
    }

    if (-not (Is-PlaceholderProject $project)) {
        $items += $project
        Write-Host "OK -> $slug" -ForegroundColor DarkGray
    }
    else {
        Write-Host "Omitido (placeholder): $slug" -ForegroundColor Yellow
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
$json = $items | ConvertTo-Json -Depth 8
$json | Set-Content -Path $outputFile -Encoding UTF8

Write-Host "----------------------------------------" -ForegroundColor DarkCyan
Write-Host "projects.json generado en:" -ForegroundColor Green
Write-Host $outputFile -ForegroundColor Green
Write-Host "Total proyectos: $($items.Count)" -ForegroundColor Cyan