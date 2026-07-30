param(
    [string]$SpecPath = (Join-Path $PSScriptRoot "..\do-preview.yaml")
)

$ErrorActionPreference = "Stop"
$resolvedSpec = (Resolve-Path -LiteralPath $SpecPath).Path
$spec = Get-Content -LiteralPath $resolvedSpec -Raw

function Assert-SpecPattern {
    param(
        [string]$Pattern,
        [string]$FailureMessage
    )
    if ($spec -notmatch $Pattern) {
        throw $FailureMessage
    }
}

function Assert-SpecAbsent {
    param(
        [string]$Pattern,
        [string]$FailureMessage
    )
    if ($spec -match $Pattern) {
        throw $FailureMessage
    }
}

Assert-SpecPattern '(?m)^name:\s*wormifi-preview\s*$' "Spec must identify the isolated wormifi-preview app."
Assert-SpecPattern '(?m)^\s*repo_clone_url:\s*https://github\.com/emailonly613-web/wormifi\.git\s*$' "Spec must use only the dedicated Wormifi remote."
Assert-SpecPattern '(?m)^\s*prefix:\s*/healthz\s*$' "Spec must expose /healthz through ingress."
Assert-SpecPattern '(?m)^\s*prefix:\s*/arena\s*$' "Spec must route /arena to the authority service."
Assert-SpecPattern '(?m)^\s*catchall_document:\s*index\.html\s*$' "Static Vite site must use the SPA catch-all."
Assert-SpecPattern '(?m)^\s*value:\s*"24\.14\.1"\s*$' "Spec must pin the DigitalOcean-supported Node build version."
Assert-SpecPattern '(?m)^\s*- domain:\s*wormifi\.com\s*$' "Live spec must attach the Wormifi apex only after the starter gate."
Assert-SpecPattern '(?m)^\s*- domain:\s*www\.wormifi\.com\s*$' "Live spec must include the Wormifi www alias."
Assert-SpecPattern '(?m)^\s*- key:\s*WORMIFI_COMMIT_HASH\s*$' "Authority service must publish its deployed Git revision."
Assert-SpecPattern '(?m)^\s*- key:\s*VITE_WORMIFI_BUILD_REVISION\s*$' "Static client must publish its deployed Git revision."
Assert-SpecAbsent '(?i)fireyourcoworkers' "Preview spec must never reference Fire Your Coworkers."

$repoReferences = [regex]::Matches(
    $spec,
    '(?m)^\s*repo_clone_url:\s*https://github\.com/emailonly613-web/wormifi\.git\s*$'
).Count
if ($repoReferences -ne 2) {
    throw "Expected exactly two dedicated Wormifi source references; found $repoReferences."
}

$nodeVersionReferences = [regex]::Matches(
    $spec,
    '(?m)^\s*value:\s*"24\.14\.1"\s*$'
).Count
if ($nodeVersionReferences -ne 2) {
    throw "Expected Node 24.14.1 on both build components; found $nodeVersionReferences references."
}

$serverInstallReferences = [regex]::Matches(
    $spec,
    'corepack pnpm --dir server install --frozen-lockfile'
).Count
if ($serverInstallReferences -ne 2) {
    throw "Both Wormifi components must install the locked server workspace; found $serverInstallReferences references."
}

$commitHashBindings = [regex]::Matches(
    $spec,
    '(?m)^\s*value:\s*\$\{_self\.COMMIT_HASH\}\s*$'
).Count
if ($commitHashBindings -ne 2) {
    throw "Expected exact client and server commit-hash bindings; found $commitHashBindings references."
}

& doctl apps spec validate $resolvedSpec --schema-only
if ($LASTEXITCODE -ne 0) {
    throw "DigitalOcean schema validation failed with exit code $LASTEXITCODE."
}

Write-Output "SPEC_SCHEMA_VALID=YES"
Write-Output "ISOLATED_APP_NAME=YES"
Write-Output "DEDICATED_WORMIFI_REMOTE_ONLY=YES"
Write-Output "FIRE_YOUR_COWORKERS_REFERENCED=NO"
Write-Output "WORMIFI_CUSTOM_DOMAINS_DECLARED=YES"
Write-Output "ARENA_INGRESS_PRESENT=YES"
Write-Output "HEALTH_INGRESS_PRESENT=YES"
Write-Output "DO_SUPPORTED_NODE_PINNED=YES"
Write-Output "SERVER_WORKSPACE_INSTALLED_FOR_BOTH_COMPONENTS=YES"
Write-Output "CLIENT_SERVER_BUILD_IDENTITY_BOUND=YES"
