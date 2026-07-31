$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$outputRoot = Join-Path $repoRoot "Wormifi_First_50_Distribution_Ready"
$zipPath = Join-Path $repoRoot "Wormifi_First_50_Distribution_Ready.zip"
$proofRoot = Join-Path $repoRoot "proof\first-50"

if (-not $outputRoot.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to package outside the Wormifi repository."
}
if ((Split-Path -Leaf $outputRoot) -ne "Wormifi_First_50_Distribution_Ready") {
  throw "Unexpected first-50 package directory."
}

$crazyGamesZip = Join-Path $repoRoot "Wormifi_CrazyGames_Ready.zip"
if (-not (Test-Path -LiteralPath $crazyGamesZip -PathType Leaf)) {
  throw "Wormifi_CrazyGames_Ready.zip is missing. Run pnpm package:crazygames first."
}

if (Test-Path -LiteralPath $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
New-Item -ItemType Directory -Force -Path $proofRoot | Out-Null

Copy-Item -LiteralPath (Join-Path $repoRoot "docs\FIRST-50-AUTONOMOUS-ACQUISITION.md") -Destination $outputRoot
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\FIRST-50-CAMPAIGN-LINKS.csv") -Destination $outputRoot
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\FIRST-50-EXTERNAL-SUBMISSION-PACK.md") -Destination $outputRoot
Copy-Item -LiteralPath (Join-Path $repoRoot "public\og-wormifi-sea-serpent-v2.png") -Destination (Join-Path $outputRoot "wormifi-key-art-1200x630.png")
Copy-Item -LiteralPath (Join-Path $repoRoot "public\icons\wormifi-512.png") -Destination (Join-Path $outputRoot "wormifi-icon-512.png")
Copy-Item -LiteralPath $crazyGamesZip -Destination $outputRoot

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $outputRoot,
  $zipPath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

$zipItem = Get-Item -LiteralPath $zipPath
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$zipStream = [System.IO.File]::OpenRead($zipPath)
try {
  $hashBytes = $sha256.ComputeHash($zipStream)
  $hash = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
}
finally {
  $zipStream.Dispose()
  $sha256.Dispose()
}
$report = [ordered]@{
  generatedAt = [DateTime]::UtcNow.ToString("o")
  status = "PASS"
  zip = $zipPath
  bytes = $zipItem.Length
  sha256 = $hash
  files = @((Get-ChildItem -LiteralPath $outputRoot -File).Name)
}
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $proofRoot "first-50-kit-verification.json") -Encoding utf8
Write-Output "FIRST_50_KIT_OK files=$($report.files.Count) bytes=$($report.bytes) sha256=$hash"
