# Wormifi sanctioned deploy wrapper.
#
# App Platform pulls this repo from a plain git clone URL, so there is no
# deploy-on-push: every release is an explicit spec update plus a deployment.
# This script is that single path. It patches the live spec from source of
# truth, deploys, waits for ACTIVE, then proves the result against the public
# domain rather than trusting the deployment phase alone.
#
# Usage: pwsh -File deploy\deploy.ps1 [-DryRun]

param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$AppId = '209351f3-4440-4e23-9dd1-93dd9274ec26'
$Ga4MeasurementId = 'G-Q25PXEXCHE'
$IndexNowKey = '2044364f28c79a5e5416aaacff424b26'

function Step($msg) { Write-Host "[wormifi-deploy] $msg" }

# --- 1. Read the live spec ------------------------------------------------
Step 'reading live app spec'
$specJson = doctl apps spec get $AppId --format json
if ($LASTEXITCODE -ne 0) { throw 'could not read the live app spec' }
$liveSpec = $specJson | ConvertFrom-Json
$spec = $specJson | ConvertFrom-Json

# --- 2. GA4 measurement id as a build-time env on the static site ---------
# The id is public (it ships inside the client bundle); it belongs in the
# deployment environment, never committed as a repo secret.
$web = $spec.static_sites | Where-Object { $_.name -eq 'web' }
if (-not $web) { throw 'static site "web" not found in the spec' }

$envs = @($web.envs | Where-Object { $_.key -ne 'VITE_GA4_MEASUREMENT_ID' })
$envs += [pscustomobject]@{ key = 'VITE_GA4_MEASUREMENT_ID'; scope = 'BUILD_TIME'; value = $Ga4MeasurementId }
$web.envs = $envs
Step "set VITE_GA4_MEASUREMENT_ID=$Ga4MeasurementId (BUILD_TIME, static site 'web')"

# Keep the live service on the same spatial profile as the reviewed source
# spec. Reading and rewriting the live spec preserves DigitalOcean-owned fields
# while making these product-critical values impossible to silently skip.
$arena = $spec.services | Where-Object { $_.name -eq 'arena' }
if (-not $arena) { throw 'service "arena" not found in the spec' }
$liveArena = $liveSpec.services | Where-Object { $_.name -eq 'arena' }
$desiredArenaRuntime = [ordered]@{
  TARGET_POPULATION = '32'
  TARGET_DROP_COUNT = '600'
  SNAPSHOT_HZ = '15'
  ARENA_RADIUS = '1450'
}
$arenaRuntimeAlready = $true
foreach ($entry in $desiredArenaRuntime.GetEnumerator()) {
  $existing = @($liveArena.envs | Where-Object { $_.key -eq $entry.Key })
  if ($existing.Count -ne 1 -or $existing[0].value -ne $entry.Value) {
    $arenaRuntimeAlready = $false
  }
  $arena.envs = @($arena.envs | Where-Object { $_.key -ne $entry.Key }) +
    [pscustomobject]@{
      key = $entry.Key
      scope = 'RUN_TIME'
      type = 'GENERAL'
      value = $entry.Value
    }
  Step "set $($entry.Key)=$($entry.Value) (RUN_TIME, service 'arena')"
}

# --- 3. Real 404s instead of a catch-all homepage -------------------------
# catchall_document answered 200 with index.html for every unknown path, which
# is a soft 404: search engines index each typo as a duplicate arena. There is
# no client-side router in this app, so nothing depends on the catch-all.
$hadCatchall = $web.PSObject.Properties.Name -contains 'catchall_document'
if ($hadCatchall) {
  $web.PSObject.Properties.Remove('catchall_document')
  Step 'removed catchall_document (soft-404 source)'
}
$web | Add-Member -NotePropertyName error_document -NotePropertyValue '404.html' -Force
Step 'set error_document=404.html'

# --- 4a. The hard-locked legacy store service ------------------------------
# This component keeps old public routes explicitly unavailable while the
# ordered Captain Passport foundation is built. It must have no payment key,
# signing secret, origin switch, or environment-based enable path.
$store = $spec.services | Where-Object { $_.name -eq 'store' }
$storeAlready = @($store).Count -gt 0
if (-not $storeAlready) {
  $storeService = [pscustomobject]@{
    name             = 'store'
    git              = [pscustomobject]@{
      repo_clone_url = 'https://github.com/emailonly613-web/wormifi.git'
      branch         = 'main'
    }
    source_dir       = '/store'
    environment_slug = 'node-js'
    run_command      = 'node src/server.mjs'
    http_port        = 8090
    instance_count   = 1
    instance_size_slug = 'basic-xxs'
    health_check     = [pscustomobject]@{
      http_path             = '/store/healthz'
      port                  = 8090
      initial_delay_seconds = 5
      period_seconds        = 10
      timeout_seconds       = 3
      success_threshold     = 1
      failure_threshold     = 3
    }
    envs             = @(
      [pscustomobject]@{ key = 'PORT'; scope = 'RUN_TIME'; value = '8090' }
    )
  }
  $spec.services = @($spec.services) + $storeService
  Step 'added the hard-locked store service with no payment secrets'
} else {
  $legacyStoreKeys = @('STRIPE_SECRET_KEY', 'WORMIFI_UNLOCK_SECRET', 'WORMIFI_PUBLIC_ORIGIN', 'WORMIFI_CHECKOUT_ENABLED')
  $store.envs = @($store.envs | Where-Object { $_.key -notin $legacyStoreKeys })
  Step 'removed every legacy payment binding from the hard-locked store service'
}

# --- 4. www -> apex, one permanent redirect -------------------------------
# Both hosts served 200 with identical bytes. The canonical tag alone leaves
# two crawlable copies; a 301 collapses them before a crawler has to guess.
$rules = @($spec.ingress.rules | Where-Object { -not $_.redirect -and $_.component.name -ne 'store' })
$wwwRedirect = [pscustomobject]@{
  match    = [pscustomobject]@{
    authority = [pscustomobject]@{ exact = 'www.wormifi.com' }
    path      = [pscustomobject]@{ prefix = '/' }
  }
  redirect = [pscustomobject]@{ authority = 'wormifi.com'; redirect_code = 301 }
}
# The store rule must precede the "/" catch-all that feeds the static site.
$storeRule = [pscustomobject]@{
  match     = [pscustomobject]@{ path = [pscustomobject]@{ prefix = '/store' } }
  component = [pscustomobject]@{ name = 'store'; preserve_path_prefix = $true }
}
$spec.ingress.rules = @($wwwRedirect, $storeRule) + $rules
Step 'prepended the www 301 and /store ingress rules'

# --- 5. Apply -------------------------------------------------------------
$specFile = Join-Path $env:TEMP "wormifi-spec-$(Get-Random).json"
$spec | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $specFile -Encoding UTF8

if ($DryRun) {
  Step "DRY-RUN: spec written to $specFile, nothing applied"
  Get-Content $specFile
  exit 0
}

# Whether the live spec already carries every setting this script owns. When it
# does, the spec step is skipped entirely: a spec-triggered deployment builds
# the commit PINNED on the app (the last attempt), not the branch tip, so a
# needless spec update after a broken push can only rebuild the broken pin.
$liveWeb = $liveSpec.static_sites | Where-Object { $_.name -eq 'web' }
$liveStore = $liveSpec.services | Where-Object { $_.name -eq 'store' }
$legacyStoreKeys = @('STRIPE_SECRET_KEY', 'WORMIFI_UNLOCK_SECRET', 'WORMIFI_PUBLIC_ORIGIN', 'WORMIFI_CHECKOUT_ENABLED')
$storeSecretsAbsent = @($liveStore.envs | Where-Object { $_.key -in $legacyStoreKeys }).Count -eq 0
$gaAlready = @($liveWeb.envs | Where-Object { $_.key -eq 'VITE_GA4_MEASUREMENT_ID' -and $_.value -eq $Ga4MeasurementId }).Count -gt 0
$specUpToDate = $gaAlready -and
  $arenaRuntimeAlready -and
  -not $hadCatchall -and
  $liveWeb.error_document -eq '404.html' -and
  $storeSecretsAbsent -and
  @($liveSpec.ingress.rules | Where-Object { $_.redirect.authority -eq 'wormifi.com' }).Count -gt 0 -and
  @($liveSpec.services | Where-Object { $_.name -eq 'store' }).Count -gt 0 -and
  @($liveSpec.ingress.rules | Where-Object { $_.component.name -eq 'store' }).Count -gt 0

if ($specUpToDate) {
  Step 'live spec already matches; skipping the spec update'
} else {
  Step 'applying spec (this triggers a deployment of the app-pinned commit)'
  doctl apps update $AppId --spec $specFile --wait --format ID,Spec.Name
  if ($LASTEXITCODE -ne 0) {
    # The spec itself applies even when its triggered deployment fails (for
    # example when the pinned commit no longer builds). The branch-tip
    # deployment below is the recovery path, so this is a warning, not a stop.
    Step 'WARNING: the spec-triggered deployment failed; deploying the branch tip instead'
  }
}
Remove-Item $specFile -Force

# Only doctl apps create-deployment re-resolves the branch tip; spec updates
# reuse the pinned commit. Deploy fresh whenever the running build is behind
# origin/main — including after the pinned-commit build above failed.
$originTip = (git -C (Split-Path $PSScriptRoot -Parent) ls-remote origin main).Split()[0]
$running = (Invoke-RestMethod -Uri 'https://wormifi.com/healthz').buildRevision
if ($running -ne $originTip) {
  Step "running build $($running.Substring(0,7)) is behind origin/main $($originTip.Substring(0,7)) - redeploying"
  doctl apps create-deployment $AppId --wait --format ID,Phase
  if ($LASTEXITCODE -ne 0) { throw 'redeploy failed' }
}

# --- 6. Prove it on the public domain -------------------------------------
Step 'verifying against https://wormifi.com'
$fail = @()

$health = Invoke-RestMethod -Uri 'https://wormifi.com/healthz'
if (
  $health.roomProfile.targetPopulation -eq 32 -and
  $health.roomProfile.targetDropCount -eq 600 -and
  $health.roomProfile.snapshotHz -eq 15 -and
  $health.roomProfile.arenaRadius -eq 1450
) {
  Step 'PROVEN: live server reports the 32-player / 600-drop / radius-1450 room profile'
} else {
  $fail += "live room profile mismatch: $($health.roomProfile | ConvertTo-Json -Compress)"
}

$landing = Invoke-WebRequest -Uri 'https://wormifi.com/' -UseBasicParsing
$bundle = ([regex]::Match($landing.Content, 'src="(/assets/[^"]+\.js)"')).Groups[1].Value
if (-not $bundle) { $fail += 'could not locate the entry bundle' }

# The measurement id lands in a lazily-imported analytics chunk, not the entry
# bundle, so follow the entry's chunk names before declaring the tag missing.
$analyticsFound = $false
$entry = (Invoke-WebRequest -Uri "https://wormifi.com$bundle" -UseBasicParsing).Content
if ($entry -match [regex]::Escape($Ga4MeasurementId)) { $analyticsFound = $true }
foreach ($chunk in [regex]::Matches($entry, 'analytics-consent-[A-Za-z0-9_-]+\.js')) {
  $body = (Invoke-WebRequest -Uri "https://wormifi.com/assets/$($chunk.Value)" -UseBasicParsing).Content
  if ($body -match [regex]::Escape($Ga4MeasurementId)) { $analyticsFound = $true }
}
if ($analyticsFound) { Step "PROVEN: $Ga4MeasurementId is in the served bundle" }
else { $fail += "measurement id $Ga4MeasurementId not found in the served bundle" }

try {
  Invoke-WebRequest -Uri 'https://wormifi.com/definitely-not-a-real-page-zz9' -UseBasicParsing | Out-Null
  $fail += 'unknown path still answers 200 (soft 404)'
} catch {
  $code = [int]$_.Exception.Response.StatusCode
  if ($code -eq 404) { Step 'PROVEN: unknown path answers 404' } else { $fail += "unknown path answered $code" }
}

# Windows PowerShell 5 does not reliably expose the response when
# Invoke-WebRequest is told to follow zero redirects. Use the underlying .NET
# request so the verifier can inspect the first hop without following it.
$wwwCode = 0
$wwwResponse = $null
try {
  $wwwRequest = [System.Net.HttpWebRequest]::Create('https://www.wormifi.com/')
  $wwwRequest.AllowAutoRedirect = $false
  $wwwRequest.Method = 'HEAD'
  $wwwResponse = $wwwRequest.GetResponse()
  $wwwCode = [int]$wwwResponse.StatusCode
} catch {
  if ($_.Exception.Response) { $wwwCode = [int]$_.Exception.Response.StatusCode }
} finally {
  if ($wwwResponse) { $wwwResponse.Close() }
}
if ($wwwCode -eq 301) { Step 'PROVEN: www answers 301' } else { $fail += "www answered $wwwCode, expected 301" }

# The store must answer through the public ingress before any buyer can.
try {
  $storeHealth = Invoke-RestMethod -Uri 'https://wormifi.com/store/healthz' -TimeoutSec 20
  if ($storeHealth.ok -and $storeHealth.checkoutEnabled -eq $false -and $storeHealth.purchasable -eq $false) {
    Step "PROVEN: store answers through public ingress with checkout locked ($($storeHealth.mode) mode)"
  } else {
    $fail += 'store healthz did not prove checkoutEnabled:false and purchasable:false'
  }
} catch {
  $fail += "store healthz unreachable: $($_.Exception.Message)"
}

foreach ($p in @('/robots.txt', '/sitemap.xml', '/404.html', "/$IndexNowKey.txt")) {
  $code = 0
  try {
    $code = [int](Invoke-WebRequest -Uri "https://wormifi.com$p" -UseBasicParsing).StatusCode
  } catch {
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    else { $fail += "$p could not be reached: $($_.Exception.Message)" }
  }
  Step "$p -> $code"
  if ($code -ne 200) { $fail += "$p answered $code, expected 200" }
}

# IndexNow is the only push channel Bing and Yandex expose without a console.
Step 'pinging IndexNow'
$payload = @{
  host        = 'wormifi.com'
  key         = $IndexNowKey
  keyLocation = "https://wormifi.com/$IndexNowKey.txt"
  urlList     = @(
    ([xml](Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) 'public/sitemap.xml') -Raw)).urlset.url |
      ForEach-Object { $_.loc }
  )
} | ConvertTo-Json
foreach ($endpoint in @('https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow', 'https://yandex.com/indexnow')) {
  $code = 0
  try {
    $code = [int](Invoke-WebRequest -Uri $endpoint -Method Post -Body $payload -ContentType 'application/json; charset=utf-8' -UseBasicParsing).StatusCode
  } catch {
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    else { Step "  $endpoint -> unreachable: $($_.Exception.Message)"; continue }
  }
  Step "  $endpoint -> $code"
}

if ($fail.Count) {
  Write-Host "[wormifi-deploy] VERIFICATION FAILURES:" -ForegroundColor Red
  $fail | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
Step 'deploy verified on the public domain'
