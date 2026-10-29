# Checks that the PREL40 lab VM is ready and prints a Markdown table.
# Output is ASCII only: Windows PowerShell 5.1 garbles emoji in console output.
# Exit code: 0 when every check passes, 1 when at least one check fails.

param(
    [string]$LabRoot = $(if ($env:PREL40_LABFILES) { $env:PREL40_LABFILES } else { 'C:\LabFiles' })
)

$results = New-Object System.Collections.Generic.List[object]

function Add-Check([string]$Name, [string]$Status, [string]$Details) {
    $results.Add([pscustomobject]@{ Check = $Name; Status = $Status; Details = $Details })
}

function Get-ToolVersion([string]$Name) {
    $cmd = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $cmd) { return $null }
    try {
        $out = @(& $cmd.Source --version 2>$null)
        if ($LASTEXITCODE -eq 0 -and $out.Count -gt 0) { return "$($out[0])".Trim() }
    } catch { }
    return $null
}

function Test-LabFiles([string]$Name, [string]$Folder, [string[]]$Files, [string]$Hint) {
    $missing = @($Files | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Folder $_) -PathType Leaf) })
    if ($missing.Count -eq 0) {
        Add-Check $Name 'PASS' $Folder
    } else {
        Add-Check $Name 'FAIL' ("Missing in ${Folder}: " + ($missing -join ', ') + ". $Hint")
    }
}

$onWindows = $env:OS -eq 'Windows_NT'
$updateHint = 'Run the lab files update on the VM.'

Add-Check 'GitHub Copilot app' 'PASS' 'Signed in: the app ran this check.'

$node = Get-ToolVersion 'node'
if (-not $node) {
    Add-Check 'Node.js' 'FAIL' 'Not found. Install Node.js 24.'
} elseif ($node -match '^v?(\d+)\.' -and @(20, 22, 24) -contains [int]$Matches[1]) {
    Add-Check 'Node.js' 'PASS' $node
} else {
    Add-Check 'Node.js' 'FAIL' "$node. Rayfin needs Node.js 20, 22, or 24."
}

# npm.cmd, not npm: in PowerShell, npm resolves to npm.ps1, which the execution policy can block.
$npm = Get-ToolVersion $(if ($onWindows) { 'npm.cmd' } else { 'npm' })
if ($npm) { Add-Check 'npm' 'PASS' $npm } else { Add-Check 'npm' 'FAIL' 'Not found. It ships with Node.js.' }

$git = Get-ToolVersion 'git'
if ($git) { Add-Check 'Git' 'PASS' $git } else { Add-Check 'Git' 'FAIL' 'Not found. Install Git for Windows.' }

$dataDir = Join-Path $LabRoot 'data'
Test-LabFiles 'Rayfin template' ([IO.Path]::Combine($LabRoot, 'template', 'home-loan-desk')) @('rayfin-template.yml', 'package.json') $updateHint
Test-LabFiles 'SQL seed' $dataDir @('portfolio-seed.sql') $updateHint
Test-LabFiles 'Sample files' (Join-Path $dataDir 'samples') @('HL-1042-floor-plan.pdf', 'HL-1042-kitchen-current.jpg') $updateHint

$versionFile = Join-Path $LabRoot 'lab-files.json'
try {
    $version = Get-Content -LiteralPath $versionFile -Raw -ErrorAction Stop | ConvertFrom-Json
    $suffix = if ($version.dirty) { ' with local changes' } else { '' }
    Add-Check 'Lab files version' 'INFO' ("$($version.shortCommit)$suffix, built $($version.builtAt)")
} catch {
    Add-Check 'Lab files version' 'INFO' "Unknown: $versionFile not found."
}

$failed = @($results | Where-Object { $_.Status -eq 'FAIL' }).Count

$lines = @('| Check | Status | Details |', '| --- | --- | --- |')
$lines += $results | ForEach-Object { "| $($_.Check) | $($_.Status) | $($_.Details) |" }
$lines += ''
$lines += $(if ($failed -eq 0) { 'Result: READY' } else { "Result: NOT READY ($failed failed)" })
$lines -join [Environment]::NewLine | Write-Output

if ($failed -gt 0) { exit 1 }
