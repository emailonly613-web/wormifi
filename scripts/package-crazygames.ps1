$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$packageRoot = (Resolve-Path -LiteralPath (Join-Path $repoRoot "Wormifi_CrazyGames_Ready")).Path
$zipPath = Join-Path $repoRoot "Wormifi_CrazyGames_Ready.zip"
$proofRoot = Join-Path $repoRoot "proof\crazygames"

if (-not $packageRoot.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to package a folder outside the Wormifi repository."
}
if ((Split-Path -Leaf $packageRoot) -ne "Wormifi_CrazyGames_Ready") {
  throw "Unexpected CrazyGames package directory."
}
if (-not (Test-Path -LiteralPath (Join-Path $packageRoot "index.html") -PathType Leaf)) {
  throw "The CrazyGames package does not contain root index.html."
}

New-Item -ItemType Directory -Force -Path $proofRoot | Out-Null
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $packageRoot,
  $zipPath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $rootIndex = $archive.Entries | Where-Object { $_.FullName -eq "index.html" }
  if (-not $rootIndex) { throw "ZIP verification failed: index.html is not at the archive root." }
  $entryCount = $archive.Entries.Count
}
finally {
  $archive.Dispose()
}

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
$hashLine = "$hash  Wormifi_CrazyGames_Ready.zip"
Set-Content -LiteralPath (Join-Path $proofRoot "Wormifi_CrazyGames_Ready.sha256.txt") -Value $hashLine -Encoding utf8

$report = [ordered]@{
  generatedAt = [DateTime]::UtcNow.ToString("o")
  status = "PASS"
  zip = $zipPath
  bytes = $zipItem.Length
  megabytes = [Math]::Round($zipItem.Length / 1MB, 3)
  entries = $entryCount
  rootIndex = $true
  sha256 = $hash
}
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $proofRoot "crazygames-zip-verification.json") -Encoding utf8

Write-Output "CRAZYGAMES_ZIP_OK entries=$entryCount size_mb=$($report.megabytes) sha256=$hash"
