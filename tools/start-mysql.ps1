param(
    [string]$ServiceName = '',
    [string]$MySqlHome = 'E:\Environment\MySQL',
    [string]$DataDir = 'E:\Data\MySQL\Data',
    [string]$UploadsDir = 'E:\Data\MySQL\Uploads',
    [int]$Port = 43306,
    [int]$MySqlXPort = 43360,
    [int]$TimeoutSeconds = 45
)

$ErrorActionPreference = 'Stop'

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Start-ElevatedSelf {
    $argumentList = @(
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        "`"$PSCommandPath`"",
        '-ServiceName',
        "`"$ServiceName`"",
        '-MySqlHome',
        "`"$MySqlHome`"",
        '-DataDir',
        "`"$DataDir`"",
        '-UploadsDir',
        "`"$UploadsDir`"",
        '-Port',
        $Port,
        '-MySqlXPort',
        $MySqlXPort,
        '-TimeoutSeconds',
        $TimeoutSeconds
    )

    Write-Host 'MySQL service repair requires Administrator privileges. Opening elevated PowerShell...'
    $process = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList $argumentList
    if ($process.ExitCode -ne 0) {
        throw "Elevated MySQL startup failed with exit code $($process.ExitCode)."
    }
}

function Test-TcpPort {
    param(
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutMilliseconds = 1000
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
        [int]$TimeoutSeconds = 45
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

function Set-IniValue {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string[]]$Lines,
        [Parameter(Mandatory = $true)][string]$Section,
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][string]$Value
    )

    $currentSection = ''
    $foundSection = $false
    $updatedKey = $false
    $output = [System.Collections.Generic.List[string]]::new()

    foreach ($line in $Lines) {
        if ($line -match '^\s*\[(.+?)\]\s*$') {
            if ($foundSection -and -not $updatedKey) {
                $output.Add("$Key=$Value")
                $updatedKey = $true
            }

            $currentSection = $matches[1].Trim()
            $foundSection = $currentSection -ieq $Section
            $output.Add($line)
            continue
        }

        if ($foundSection -and $line -match "^\s*$([regex]::Escape($Key))\s*=") {
            $output.Add("$Key=$Value")
            $updatedKey = $true
            continue
        }

        $output.Add($line)
    }

    if ($foundSection -and -not $updatedKey) {
        $output.Add("$Key=$Value")
    }

    return $output.ToArray()
}

function Save-MySqlConfig {
    param(
        [Parameter(Mandatory = $true)][string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return
    }

    $lines = Get-Content -LiteralPath $Path
    $lines = Set-IniValue -Lines $lines -Section 'client' -Key 'port' -Value ([string]$Port)
    $lines = Set-IniValue -Lines $lines -Section 'mysqld' -Key 'port' -Value ([string]$Port)
    $lines = Set-IniValue -Lines $lines -Section 'mysqld' -Key 'mysqlx_port' -Value ([string]$MySqlXPort)
    $lines = Set-IniValue -Lines $lines -Section 'mysqld' -Key 'basedir' -Value ('"' + ($MySqlHome -replace '\\', '/') + '"')
    $lines = Set-IniValue -Lines $lines -Section 'mysqld' -Key 'datadir' -Value ($DataDir -replace '\\', '/')
    $lines = Set-IniValue -Lines $lines -Section 'mysqld' -Key 'secure-file-priv' -Value ('"' + ($UploadsDir -replace '\\', '/') + '"')

    $current = Get-Content -LiteralPath $Path -Raw
    $next = ($lines -join [Environment]::NewLine) + [Environment]::NewLine
    if ($current -ne $next) {
        $backup = "$Path.backup-codex-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -LiteralPath $Path -Destination $backup
        [IO.File]::WriteAllText($Path, $next, [Text.UTF8Encoding]::new($false))
        Write-Host "Updated MySQL config: $Path"
        Write-Host "Backup: $backup"
    }
}

function Get-MySqlServicePath {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceName
    )

    $escapedName = $ServiceName.Replace("'", "''")
    $service = Get-CimInstance Win32_Service -Filter "Name='$escapedName'" -ErrorAction SilentlyContinue
    if ($service) {
        return $service.PathName
    }

    return $null
}

function Resolve-MySqlServiceName {
    param(
        [string]$PreferredName
    )

    $candidates = @($PreferredName, 'MySQL84_1', 'MySQL84', 'MySQL80', 'MySQL') |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique

    foreach ($candidate in $candidates) {
        $escapedName = $candidate.Replace("'", "''")
        $service = Get-CimInstance Win32_Service -Filter "Name='$escapedName'" -ErrorAction SilentlyContinue
        if ($service -and $service.State -eq 'Running') {
            return $candidate
        }
    }

    foreach ($candidate in $candidates) {
        $escapedName = $candidate.Replace("'", "''")
        $service = Get-CimInstance Win32_Service -Filter "Name='$escapedName'" -ErrorAction SilentlyContinue
        if ($service) {
            return $candidate
        }
    }

    return 'MySQL84_1'
}

$mysqld = Join-Path $MySqlHome 'bin\mysqld.exe'
$primaryIni = Join-Path $MySqlHome 'my.ini'
$legacyIni = 'C:\ProgramData\MySQL\MySQL Server 8.4\my.ini'

if (-not (Test-Path -LiteralPath $mysqld -PathType Leaf)) {
    throw "mysqld.exe was not found: $mysqld"
}
if (-not (Test-Path -LiteralPath $primaryIni -PathType Leaf)) {
    throw "my.ini was not found: $primaryIni"
}
if (-not (Test-Path -LiteralPath $DataDir -PathType Container)) {
    throw "MySQL data directory was not found: $DataDir"
}
if (-not (Test-Path -LiteralPath $UploadsDir -PathType Container)) {
    New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
}

$ServiceName = Resolve-MySqlServiceName -PreferredName $ServiceName
if (Test-TcpPort -HostName '127.0.0.1' -Port $Port) {
    Write-Host "MySQL already listens on 127.0.0.1:$Port. Using service preference: $ServiceName."
    return
}

$expectedBinPath = "`"$mysqld`" --defaults-file=`"$primaryIni`" $ServiceName"
$currentBinPath = Get-MySqlServicePath -ServiceName $ServiceName
$needsAdmin = -not $currentBinPath -or $currentBinPath -ne $expectedBinPath

if (-not (Test-Administrator)) {
    Start-ElevatedSelf
    if (-not (Wait-TcpPort -HostName '127.0.0.1' -Port $Port -TimeoutSeconds $TimeoutSeconds)) {
        throw "MySQL did not become ready on 127.0.0.1:$Port after elevated startup."
    }
    Write-Host "MySQL is ready on 127.0.0.1:$Port."
    return
}

Save-MySqlConfig -Path $primaryIni
Save-MySqlConfig -Path $legacyIni

if ($currentBinPath) {
    if ($currentBinPath -ne $expectedBinPath) {
        Write-Host "Repairing $ServiceName service path..."
        & sc.exe config $ServiceName binPath= $expectedBinPath | Out-Host
    }
} else {
    Write-Host "Creating $ServiceName service..."
    & sc.exe create $ServiceName binPath= $expectedBinPath start= demand DisplayName= $ServiceName | Out-Host
}

$service = Get-Service -Name $ServiceName -ErrorAction Stop
if ($service.Status -eq 'Running' -and -not (Test-TcpPort -HostName '127.0.0.1' -Port $Port)) {
    Write-Host "Restarting $ServiceName to apply MySQL port $Port..."
    Stop-Service -Name $ServiceName -Force
    (Get-Service -Name $ServiceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds($TimeoutSeconds))
}

if ((Get-Service -Name $ServiceName).Status -ne 'Running') {
    Write-Host "Starting MySQL service: $ServiceName"
    Start-Service -Name $ServiceName
}

try {
    (Get-Service -Name $ServiceName).WaitForStatus('Running', [TimeSpan]::FromSeconds($TimeoutSeconds))
} catch {
    $errorLog = Join-Path $DataDir 'YAOZHER.err'
    if (Test-Path -LiteralPath $errorLog -PathType Leaf) {
        Write-Host ''
        Write-Host "Latest MySQL error log: $errorLog"
        Get-Content -LiteralPath $errorLog -Tail 80
    }
    throw
}

if (-not (Wait-TcpPort -HostName '127.0.0.1' -Port $Port -TimeoutSeconds $TimeoutSeconds)) {
    throw "MySQL service is running, but 127.0.0.1:$Port is not accepting TCP connections."
}

Write-Host "MySQL service '$ServiceName' is running on 127.0.0.1:$Port."
