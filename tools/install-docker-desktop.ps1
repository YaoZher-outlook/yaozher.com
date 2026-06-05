$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$DownloadDir = Join-Path $Root '.downloads'
$Installer = Join-Path $DownloadDir 'Docker Desktop Installer.exe'
$InstallDir = 'E:\Environment\Docker\DockerDesktop'
$DataDir = 'E:\Environment\Docker\wsl-data'
$DownloadUrl = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe'

$existing = @(
    (Get-Command docker.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    (Join-Path $InstallDir 'resources\bin\docker.exe'),
    'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1

if ($existing) {
    Write-Host "Docker CLI is already installed: $existing"
    exit 0
}

New-Item -ItemType Directory -Path $DownloadDir -Force | Out-Null
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

if (-not (Test-Path -LiteralPath $Installer -PathType Leaf)) {
    Write-Host 'Downloading the official Docker Desktop installer...'
    Invoke-WebRequest -UseBasicParsing -Uri $DownloadUrl -OutFile $Installer
}

Write-Host "Installing Docker Desktop to $InstallDir ..."
$arguments = @(
    'install',
    '--quiet',
    '--accept-license',
    '--backend=wsl-2',
    "--installation-dir=$InstallDir",
    "--wsl-default-data-root=$DataDir"
)
$process = Start-Process -FilePath $Installer -ArgumentList $arguments -Wait -PassThru
if ($process.ExitCode -ne 0) {
    throw "Docker Desktop installer failed with exit code $($process.ExitCode)."
}

$docker = Join-Path $InstallDir 'resources\bin\docker.exe'
if (-not (Test-Path -LiteralPath $docker -PathType Leaf)) {
    throw "Docker Desktop installation completed, but docker.exe was not found at $docker."
}

$dockerBin = Split-Path -Parent $docker
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$pathParts = @($userPath -split ';' | Where-Object { $_ })
if ($pathParts -notcontains $dockerBin) {
    [Environment]::SetEnvironmentVariable(
        'Path',
        ((@($pathParts) + $dockerBin) -join ';'),
        'User'
    )
}

Write-Host "Docker Desktop installed successfully: $InstallDir"
Write-Host "Docker WSL data directory: $DataDir"
Write-Host "Docker CLI was added to the current user's PATH: $dockerBin"
