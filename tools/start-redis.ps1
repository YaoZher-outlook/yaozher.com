$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$ComposeFile = Join-Path $Root 'deploy\redis\compose.yaml'
$LocalProperties = Join-Path $Root 'v1\.env.local.properties'
$RedisPort = '46379'
$RedisInsightPort = '45540'
$Docker = Get-Command docker.exe -ErrorAction SilentlyContinue

if (-not $Docker) {
    $knownDockerPaths = @(
        'E:\Environment\Docker\DockerDesktop\resources\bin\docker.exe',
        'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
    )
    $Docker = $knownDockerPaths |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
        Select-Object -First 1
}

if (-not $Docker) {
    throw 'docker.exe was not found. Install Docker Desktop, then run this script again.'
}
if (-not (Test-Path $ComposeFile -PathType Leaf)) {
    throw "Redis compose file was not found: $ComposeFile"
}
if (-not (Test-Path $LocalProperties -PathType Leaf)) {
    throw "Local secrets file was not found: $LocalProperties"
}

$passwordLine = Get-Content $LocalProperties |
    Where-Object { $_ -match '^YAOZHER_REDIS_PASSWORD=' } |
    Select-Object -First 1
$insightEncryptionKeyLine = Get-Content $LocalProperties |
    Where-Object { $_ -match '^YAOZHER_REDISINSIGHT_ENCRYPTION_KEY=' } |
    Select-Object -First 1

if (-not $passwordLine) {
    throw 'YAOZHER_REDIS_PASSWORD is not configured in v1/.env.local.properties.'
}
if (-not $insightEncryptionKeyLine) {
    throw 'YAOZHER_REDISINSIGHT_ENCRYPTION_KEY is not configured in v1/.env.local.properties.'
}

$env:YAOZHER_REDIS_PASSWORD = $passwordLine.Substring($passwordLine.IndexOf('=') + 1)
$env:YAOZHER_REDISINSIGHT_ENCRYPTION_KEY = $insightEncryptionKeyLine.Substring($insightEncryptionKeyLine.IndexOf('=') + 1)
$env:YAOZHER_REDIS_PORT = $RedisPort
$env:YAOZHER_REDISINSIGHT_PORT = $RedisInsightPort

if ([string]::IsNullOrWhiteSpace($env:YAOZHER_REDIS_PASSWORD)) {
    throw 'YAOZHER_REDIS_PASSWORD must not be blank.'
}
if ([string]::IsNullOrWhiteSpace($env:YAOZHER_REDISINSIGHT_ENCRYPTION_KEY)) {
    throw 'YAOZHER_REDISINSIGHT_ENCRYPTION_KEY must not be blank.'
}

try {
    $dockerExecutable = if ($Docker -is [System.Management.Automation.CommandInfo]) {
        $Docker.Source
    } else {
        $Docker
    }
    $originalPath = $env:PATH
    $env:PATH = "$(Split-Path -Parent $dockerExecutable);$env:PATH"

    & $dockerExecutable info *> $null
    if ($LASTEXITCODE -ne 0) {
        $desktopCandidates = @(
            'E:\Environment\Docker\DockerDesktop\Docker Desktop.exe',
            'C:\Program Files\Docker\Docker\Docker Desktop.exe'
        )
        $desktop = $desktopCandidates |
            Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
            Select-Object -First 1
        if (-not $desktop) {
            throw 'Docker Desktop is installed but could not be started automatically.'
        }

        Write-Host 'Starting Docker Desktop...'
        Start-Process -FilePath $desktop -WindowStyle Hidden
        $deadline = (Get-Date).AddMinutes(5)
        do {
            Start-Sleep -Seconds 5
            & $dockerExecutable info *> $null
            if ($LASTEXITCODE -eq 0) {
                break
            }
        } while ((Get-Date) -lt $deadline)

        if ($LASTEXITCODE -ne 0) {
            throw 'Docker Desktop did not become ready within 5 minutes.'
        }
    }

    & $dockerExecutable compose -f $ComposeFile up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Redis compose start failed with exit code $LASTEXITCODE."
    }

    Write-Host "Yaozher Redis is running on 127.0.0.1:$RedisPort."
    Write-Host "RedisInsight is available at http://127.0.0.1:$RedisInsightPort."
} finally {
    if ($null -ne $originalPath) {
        $env:PATH = $originalPath
    }
    Remove-Item Env:YAOZHER_REDIS_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:YAOZHER_REDISINSIGHT_ENCRYPTION_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:YAOZHER_REDIS_PORT -ErrorAction SilentlyContinue
    Remove-Item Env:YAOZHER_REDISINSIGHT_PORT -ErrorAction SilentlyContinue
}
