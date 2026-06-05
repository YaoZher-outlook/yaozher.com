$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root 'v1'
$FrontendDir = Join-Path $Root 'v1_f'
$RedisStartScript = Join-Path $PSScriptRoot 'start-redis.ps1'
$MavenSettings = Join-Path $BackendDir '.mvn\codex-settings.xml'
$Maven = Get-Command mvn.cmd -ErrorAction SilentlyContinue

if (-not $Maven) {
    Write-Host 'mvn.cmd was not found in PATH. Install Maven or add it to PATH, then run this script again.'
    Read-Host 'Press Enter to close'
    exit 1
}

function Test-TcpPort {
    param(
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutMilliseconds = 500
    )

    $client = [Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync($HostName, $Port)
        return $task.Wait($TimeoutMilliseconds) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Start-ServerWindow {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Command
    )

    $wrappedCommand = "[Console]::InputEncoding = [Text.Encoding]::UTF8; [Console]::OutputEncoding = [Text.Encoding]::UTF8; `$OutputEncoding = [Text.Encoding]::UTF8; `$Host.UI.RawUI.WindowTitle = '$Title'; $Command"
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($wrappedCommand))
    Start-Process powershell.exe -WorkingDirectory $WorkingDirectory -ArgumentList @(
        '-NoExit',
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-EncodedCommand',
        $encodedCommand
    )
}

if (-not (Test-TcpPort -HostName '127.0.0.1' -Port 6379)) {
    if (Test-Path $RedisStartScript -PathType Leaf) {
        try {
        & $RedisStartScript
        } catch {
            Write-Warning $_.Exception.Message
        }
    }
    if (-not (Test-TcpPort -HostName '127.0.0.1' -Port 6379)) {
        Write-Warning 'Redis is not running on port 6379. Verification-code APIs will be unavailable.'
    }
}

$backendCommand = "& `"$($Maven.Source)`" -s `"$MavenSettings`" spring-boot:run `"-Dspring-boot.run.profiles=dev`""
$frontendCommand = "npm.cmd run dev"

if (Test-TcpPort -HostName '127.0.0.1' -Port 1004) {
    Write-Host 'Backend already listens on port 1004; reusing it.'
} else {
    Start-ServerWindow -Title 'Yaozher Backend :1004' -WorkingDirectory $BackendDir -Command $backendCommand
}

Start-Sleep -Seconds 2

if (Test-TcpPort -HostName '127.0.0.1' -Port 8020) {
    Write-Host 'Frontend already listens on port 8020; reusing it.'
} else {
    Start-ServerWindow -Title 'Yaozher Frontend :8020' -WorkingDirectory $FrontendDir -Command $frontendCommand
}

$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    if ((Test-TcpPort -HostName '127.0.0.1' -Port 1004) -and (Test-TcpPort -HostName '127.0.0.1' -Port 8020)) {
        Write-Host ''
        Write-Host 'Yaozher development site is ready:'
        Write-Host '  http://localhost:8020'
        Start-Process 'http://localhost:8020'
        exit 0
    }
    Start-Sleep -Seconds 1
}

Write-Warning 'Dev servers were launched, but one or more ports did not become ready in time. Check the server windows.'
