$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$NginxDir = 'E:\Environment\Nginx\nginx-1.30.2\nginx-1.30.2'
$NginxConfigTemplate = Join-Path $PSScriptRoot 'nginx-prod.conf'
$NginxConfig = Join-Path $NginxDir 'conf\nginx.conf'
$NginxConfigBackup = Join-Path $NginxDir 'conf\nginx.conf.default'
$FrontendDist = (Join-Path $Root 'v1_f\dist') -replace '\\', '/'

if (-not (Test-Path $NginxConfigTemplate -PathType Leaf)) {
    throw "Nginx config template was not found: $NginxConfigTemplate"
}

$RenderedConfig = (Get-Content -LiteralPath $NginxConfigTemplate -Raw).Replace(
    '__YAOZHER_FRONTEND_DIST__',
    $FrontendDist
)

function Test-NginxConfigCurrent {
    if (-not (Test-Path $NginxConfig -PathType Leaf)) {
        return $false
    }

    return (Get-Content -LiteralPath $NginxConfig -Raw) -eq $RenderedConfig
}

if (Test-NginxConfigCurrent) {
    return
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$isAdministrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdministrator) {
    $command = "& `"$PSCommandPath`""
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    $process = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-EncodedCommand',
        $encodedCommand
    )
    if ($process.ExitCode -ne 0) {
        throw "Elevated Nginx config sync failed with exit code $($process.ExitCode)."
    }
    return
}

if (-not (Test-Path $NginxConfigBackup -PathType Leaf)) {
    Copy-Item -LiteralPath $NginxConfig -Destination $NginxConfigBackup
}
[IO.File]::WriteAllText($NginxConfig, $RenderedConfig, [Text.UTF8Encoding]::new($false))
Write-Host "Nginx production config installed: $NginxConfig"
