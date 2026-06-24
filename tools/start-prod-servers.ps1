$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root 'v1'
$FrontendDir = Join-Path $Root 'v1_f'
$NginxDir = 'E:\Environment\Nginx\nginx-1.30.2\nginx-1.30.2'
$Nginx = Join-Path $NginxDir 'nginx.exe'
$NginxConfig = Join-Path $NginxDir 'conf\nginx.conf'
$NginxConfigTemplate = Join-Path $PSScriptRoot 'nginx-prod.conf'
$NginxConfigSyncScript = Join-Path $PSScriptRoot 'sync-nginx-config.ps1'
$MySqlStartScript = Join-Path $PSScriptRoot 'start-mysql.ps1'
$RedisStartScript = Join-Path $PSScriptRoot 'start-redis.ps1'
$MavenSettings = Join-Path $BackendDir '.mvn\codex-settings.xml'
$Maven = Get-Command mvn.cmd -ErrorAction SilentlyContinue
$Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
$BackendPort = 37631
$NginxHttpPort = 38200
$RedisPort = 46379

if (-not $Maven) {
    throw 'mvn.cmd was not found in PATH. Install Maven or add it to PATH.'
}
if (-not $Npm) {
    throw 'npm.cmd was not found in PATH. Install Node.js or add it to PATH.'
}
if (-not (Test-Path $Nginx -PathType Leaf)) {
    throw "nginx.exe was not found: $Nginx"
}
if (-not (Test-Path $NginxConfig -PathType Leaf)) {
    throw "Nginx config was not found: $NginxConfig"
}
if (-not (Test-Path $NginxConfigTemplate -PathType Leaf)) {
    throw "Nginx production config template was not found: $NginxConfigTemplate"
}
if (-not (Test-Path $NginxConfigSyncScript -PathType Leaf)) {
    throw "Nginx config sync script was not found: $NginxConfigSyncScript"
}
if (-not (Test-Path $MySqlStartScript -PathType Leaf)) {
    throw "MySQL startup script was not found: $MySqlStartScript"
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

function Wait-TcpPort {
    param(
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutSeconds = 90
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort -HostName $HostName -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

& $MySqlStartScript

if (-not (Test-TcpPort -HostName '127.0.0.1' -Port $RedisPort)) {
    if (Test-Path $RedisStartScript -PathType Leaf) {
        try {
            & $RedisStartScript
        } catch {
            Write-Warning $_.Exception.Message
        }
    }
    if (-not (Test-TcpPort -HostName '127.0.0.1' -Port $RedisPort)) {
        Write-Warning "Redis is not running on port $RedisPort. Verification-code APIs will be unavailable."
    }
}

& $NginxConfigSyncScript

Write-Host 'Building production frontend...'
Push-Location $FrontendDir
try {
    & $Npm.Source run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}

$nginxPrefix = ($NginxDir -replace '\\', '/') + '/'

Write-Host "Validating Nginx config: $NginxConfig"
& $Nginx -p $nginxPrefix -c conf/nginx.conf -t
if ($LASTEXITCODE -ne 0) {
    throw "Nginx config validation failed with exit code $LASTEXITCODE."
}

if (-not (Test-TcpPort -HostName '127.0.0.1' -Port $BackendPort)) {
    $backendCommand = "& `"$($Maven.Source)`" -s `"$MavenSettings`" spring-boot:run `"-Dspring-boot.run.profiles=prod`""
    Start-ServerWindow -Title "Yaozher Backend :$BackendPort" -WorkingDirectory $BackendDir -Command $backendCommand
} else {
    Write-Host "Backend already listens on port $BackendPort; reusing it."
}

$nginxPidPath = Join-Path $NginxDir 'logs\nginx.pid'
$nginxRunning = $false
if (Test-Path $nginxPidPath -PathType Leaf) {
    $nginxPidText = Get-Content $nginxPidPath -ErrorAction SilentlyContinue | Select-Object -First 1
    $nginxPidValue = 0
    if ([int]::TryParse($nginxPidText, [ref]$nginxPidValue)) {
        $nginxProcess = Get-Process -Id $nginxPidValue -ErrorAction SilentlyContinue
        if ($nginxProcess -and $nginxProcess.ProcessName -eq 'nginx') {
            try {
                $nginxRunning = [IO.Path]::GetFullPath($nginxProcess.Path) -ieq [IO.Path]::GetFullPath($Nginx)
            } catch {
                $nginxRunning = $true
            }
        }
    }

    if (-not $nginxRunning) {
        Write-Warning "Ignoring stale Nginx pid file: $nginxPidPath"
        Remove-Item -LiteralPath $nginxPidPath -Force -ErrorAction SilentlyContinue
    }
}

if ($nginxRunning) {
    Write-Host 'Reloading Nginx...'
    & $Nginx -p $nginxPrefix -c conf/nginx.conf -s reload
    if ($LASTEXITCODE -ne 0) {
        throw "Nginx reload failed with exit code $LASTEXITCODE."
    }
} else {
    Write-Host "Starting Nginx on port $NginxHttpPort..."
    Start-Process $Nginx -WorkingDirectory $NginxDir -ArgumentList @(
        '-p',
        $nginxPrefix,
        '-c',
        'conf/nginx.conf'
    ) -WindowStyle Hidden
}

if (-not (Wait-TcpPort -HostName '127.0.0.1' -Port $NginxHttpPort -TimeoutSeconds 15)) {
    throw "Nginx did not start listening on port $NginxHttpPort."
}

if (-not (Wait-TcpPort -HostName '127.0.0.1' -Port $BackendPort -TimeoutSeconds 90)) {
    Write-Warning "Nginx is running, but the backend did not start on local port $BackendPort. Check the backend window."
}

Write-Host ''
Write-Host 'Yaozher production site is ready:'
Write-Host "  http://localhost:$NginxHttpPort"
Write-Host "  http://yaozher.com:$NginxHttpPort"
Write-Host "  http://222.210.25.53:$NginxHttpPort"
Start-Process "http://localhost:$NginxHttpPort"
