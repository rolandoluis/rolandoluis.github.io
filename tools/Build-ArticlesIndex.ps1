# Build-ArticlesIndex.ps1
# Genera /assets/data/es/articles.json y /assets/data/en/articles.json
# leyendo metadatos de /es/articles/*.html y /en/articles/*.html

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-AttrValue {
  param(
    [Parameter(Mandatory)][string]$Html,
    [Parameter(Mandatory)][string]$AttrName
  )
  # captura data-article-title="..."
  $pattern = [regex]::Escape($AttrName) + '\s*=\s*"([^"]*)"'
  $m = [regex]::Match($Html, $pattern, 'IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value.Trim() }
  return $null
}

function Get-MetaDescription {
  param([Parameter(Mandatory)][string]$Html)

  # <meta name="description" content="...">
  $rx = '<meta\s+[^>]*name\s*=\s*"(?:description)"[^>]*content\s*=\s*"([^"]*)"[^>]*>'
  $m = [regex]::Match($Html, $rx, 'IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value.Trim() }
  return $null
}

function Parse-Tags {
  param([string]$TagsRaw)

  if ([string]::IsNullOrWhiteSpace($TagsRaw)) { return @() }

  # "a,b,c" -> ["a","b","c"]
  $TagsRaw.Split(',') |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ } |
    Select-Object -Unique
}

function Parse-Bool {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
  return @('1','true','yes','y','on') -contains $Value.Trim().ToLowerInvariant()
}

function Build-LangIndex {
  param(
    [Parameter(Mandatory)][ValidateSet('es','en')][string]$Lang,
    [Parameter(Mandatory)][string]$RepoRoot
  )

  $articlesDir = Join-Path $RepoRoot "$Lang/articles"
  if (-not (Test-Path $articlesDir)) {
    Write-Warning "No existe: $articlesDir"
    return @()
  }

  $files = Get-ChildItem -Path $articlesDir -Filter *.html -File | Sort-Object Name

  $out = foreach ($f in $files) {
    $slug = [IO.Path]::GetFileNameWithoutExtension($f.Name)

    $html = Get-Content -Path $f.FullName -Raw -Encoding UTF8

    $title    = Get-AttrValue -Html $html -AttrName 'data-article-title'
    $category = Get-AttrValue -Html $html -AttrName 'data-article-category'
    $date     = Get-AttrValue -Html $html -AttrName 'data-article-date'
    $updated  = Get-AttrValue -Html $html -AttrName 'data-article-updated'
    $tagsRaw  = Get-AttrValue -Html $html -AttrName 'data-article-tags'
    $featRaw  = Get-AttrValue -Html $html -AttrName 'data-article-featured'

    # Fallbacks razonables:
    if (-not $title) {
      # <title>...</title>
      $m = [regex]::Match($html, '<title>\s*(.*?)\s*</title>', 'IgnoreCase')
      if ($m.Success) { $title = $m.Groups[1].Value.Trim() } else { $title = $slug }
    }
    if (-not $category) { $category = ($Lang -eq 'en') ? 'General' : 'General' }

    $description = Get-MetaDescription -Html $html
    if (-not $description) {
      # opcional: permitir data-article-description
      $description = Get-AttrValue -Html $html -AttrName 'data-article-description'
    }
    if (-not $description) { $description = "" }

    $tags = Parse-Tags -TagsRaw $tagsRaw
    $featured = Parse-Bool -Value $featRaw

    # Si updated no existe, lo igualamos a date si date existe
    if (-not $updated -and $date) { $updated = $date }

    [pscustomobject]@{
      title       = $title
      category    = $category
      slug        = $slug
      description = $description
      date        = $date
      updated     = $updated
      tags        = $tags
      featured    = $featured
    }
  }

  return @($out)
}

# -------- Main --------
$RepoRoot = Split-Path -Parent $PSScriptRoot
# si lo guardas en tools/, esto apunta al root del repo. Ajusta si lo pones en otra carpeta.

$assetsData = Join-Path $RepoRoot 'assets/data'
$esOutDir = Join-Path $assetsData 'es'
$enOutDir = Join-Path $assetsData 'en'

New-Item -ItemType Directory -Force -Path $esOutDir, $enOutDir | Out-Null

$esIndex = Build-LangIndex -Lang es -RepoRoot $RepoRoot
$enIndex = Build-LangIndex -Lang en -RepoRoot $RepoRoot

# Orden recomendado: featured primero, luego por date desc, luego title asc
function Sort-Index($arr) {
  $arr | Sort-Object `
    @{ Expression = { -not $_.featured } }, `
    @{ Expression = { if ($_.date) { [datetime]$_.date } else { [datetime]'1900-01-01' } }; Descending = $true }, `
    @{ Expression = { $_.title } }
}

$esIndex = @(Sort-Index $esIndex)
$enIndex = @(Sort-Index $enIndex)

$esPath = Join-Path $esOutDir 'articles.json'
$enPath = Join-Path $enOutDir 'articles.json'

$esIndex | ConvertTo-Json -Depth 6 | Set-Content -Path $esPath -Encoding UTF8
$enIndex | ConvertTo-Json -Depth 6 | Set-Content -Path $enPath -Encoding UTF8

Write-Host "OK -> $esPath ($($esIndex.Count) artículos)"
Write-Host "OK -> $enPath ($($enIndex.Count) artículos)"