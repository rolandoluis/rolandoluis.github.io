$root = Resolve-Path "$PSScriptRoot/.."
$esPath = Join-Path $root "es"
$enPath = Join-Path $root "en"
$outFile = Join-Path $root "assets/data/search.json"

$pages = @()

function Extract-Content($file, $lang){

    $html = Get-Content $file -Raw

    $title = ""
    $desc = ""

    if($html -match "<title>(.*?)</title>"){
        $title = $matches[1]
    }

    if($html -match '<meta name="description" content="(.*?)"'){
        $desc = $matches[1]
    }

    if(!$desc){
        $text = $html -replace "<.*?>"," "
        $text = $text -replace "\s+"," "
        $desc = $text.Substring(0,[Math]::Min(140,$text.Length))
    }

    $url = $file.FullName.Replace($root,"").Replace("\","/").Replace("/$lang/","")

    return @{
        title = $title
        url = $url.TrimStart("/")
        lang = $lang
        excerpt = $desc
        tags = @()
    }
}

Get-ChildItem $esPath -Recurse -Filter *.html | ForEach-Object {
    $pages += Extract-Content $_ "es"
}

Get-ChildItem $enPath -Recurse -Filter *.html | ForEach-Object {
    $pages += Extract-Content $_ "en"
}

$json = $pages | ConvertTo-Json -Depth 5

$json | Set-Content $outFile -Encoding UTF8

Write-Host "Search index generated:" $outFile