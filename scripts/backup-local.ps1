[CmdletBinding()]
param(
  [Parameter()]
  [string]$OutputRoot,

  [Parameter()]
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\\.env'),

  [Parameter()]
  [switch]$AllowRemoteBackup
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-DotEnvValue {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "找不到环境配置文件：$Path"
  }

  foreach ($line in [System.IO.File]::ReadLines((Resolve-Path -LiteralPath $Path))) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    if ($trimmed -match "^(?:export\s+)?$([regex]::Escape($Name))\s*=\s*(.*)$") {
      $value = $Matches[1].Trim()
      if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        return $value.Substring(1, $value.Length - 2)
      }
      return $value
    }
  }

  throw "环境配置缺少 $Name"
}

function ConvertFrom-DatabaseUrl {
  param([Parameter(Mandatory)] [string]$DatabaseUrl)

  try {
    $uri = [System.Uri]$DatabaseUrl
  } catch {
    throw 'DATABASE_URL 不是有效的数据库连接 URL。'
  }

  if ($uri.Scheme -ne 'mysql' -or -not $uri.Host -or -not $uri.UserInfo -or -not $uri.AbsolutePath.Trim('/')) {
    throw 'DATABASE_URL 必须是 mysql:// 的完整连接 URL。'
  }

  $credentials = $uri.UserInfo.Split(':', 2)
  if ($credentials.Count -ne 2 -or -not $credentials[0]) {
    throw 'DATABASE_URL 必须包含用户名和密码。'
  }
  $username = [System.Uri]::UnescapeDataString($credentials[0])
  $password = [System.Uri]::UnescapeDataString($credentials[1])
  if ($username -match '[\x00-\x1F]' -or $password -match '[\x00-\x1F]') {
    throw 'DATABASE_URL 用户名或密码包含不允许的控制字符。'
  }

  return [pscustomobject]@{
    Host = $uri.Host
    Port = if ($uri.IsDefaultPort) { 3306 } else { $uri.Port }
    Database = [System.Uri]::UnescapeDataString($uri.AbsolutePath.Trim('/'))
    Username = $username
    Password = $password
  }
}

function Get-MySqlExecutable {
  param([Parameter(Mandatory)] [string]$Name)

  $candidate = if ($env:MYSQL_BIN) { Join-Path $env:MYSQL_BIN "$Name.exe" } else { $null }
  if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    return (Resolve-Path -LiteralPath $candidate).Path
  }

  $command = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "未找到 $Name.exe。请将 MySQL bin 目录加入 PATH，或设置 MYSQL_BIN。"
}

function New-MySqlDefaultsFile {
  param([Parameter(Mandatory)] $Connection)

  $temporaryPath = Join-Path ([System.IO.Path]::GetTempPath()) ("wuyue-mysql-{0}.cnf" -f [Guid]::NewGuid().ToString('N'))
  $password = $Connection.Password.Replace('\\', '\\\\').Replace('"', '\\"')
  $content = @(
    '[client]'
    "host=$($Connection.Host)"
    "port=$($Connection.Port)"
    "user=$($Connection.Username.Replace('"', '\\"'))"
    "password=$password"
    'protocol=tcp'
  ) -join [Environment]::NewLine

  [System.IO.File]::WriteAllText($temporaryPath, $content, [System.Text.UTF8Encoding]::new($false))
  return $temporaryPath
}

function Invoke-MySqlDumpToFile {
  param(
    [Parameter(Mandatory)] [string]$Executable,
    [Parameter(Mandatory)] [string[]]$Arguments,
    [Parameter(Mandatory)] [string]$Destination
  )

  $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = $Executable
  $processInfo.UseShellExecute = $false
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true
  foreach ($argument in $Arguments) {
    [void]$processInfo.ArgumentList.Add($argument)
  }

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $processInfo
  if (-not $process.Start()) {
    throw '无法启动 mysqldump。'
  }

  $output = [System.IO.File]::Open($Destination, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
  try {
    $process.StandardOutput.BaseStream.CopyTo($output)
    $error = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
  } finally {
    $output.Dispose()
  }

  if ($process.ExitCode -ne 0) {
    Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
    throw "mysqldump 备份失败：$error"
  }
}

function Get-DirectorySummary {
  param([Parameter(Mandatory)] [string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    return [pscustomobject]@{ exists = $false; files = 0; bytes = 0 }
  }

  $files = Get-ChildItem -LiteralPath $Path -File -Recurse -Force
  return [pscustomobject]@{
    exists = $true
    files = @($files).Count
    bytes = [int64](@($files | Measure-Object -Property Length -Sum).Sum)
  }
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$connection = ConvertFrom-DatabaseUrl (Get-DotEnvValue -Path $EnvFile -Name 'DATABASE_URL')
$localHosts = @('localhost', '127.0.0.1', '::1')
if ($connection.Host -notin $localHosts -and -not $AllowRemoteBackup) {
  throw "默认拒绝从远程数据库 '$($connection.Host):$($connection.Port)/$($connection.Database)' 创建本地备份；如已确认维护窗口与数据权限，请显式传入 -AllowRemoteBackup。"
}
$uploadDirectoryValue = try { Get-DotEnvValue -Path $EnvFile -Name 'UPLOAD_DIR' } catch { './storage/uploads' }
$uploadDirectory = if ([System.IO.Path]::IsPathRooted($uploadDirectoryValue)) { $uploadDirectoryValue } else { Join-Path $projectRoot $uploadDirectoryValue }
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss-fff'
$backupRoot = if ($OutputRoot) { $OutputRoot } else { Join-Path $projectRoot 'backups' }
$backupDirectory = Join-Path $backupRoot $timestamp
$databaseDirectory = Join-Path $backupDirectory 'database'
$uploadsDestination = Join-Path $backupDirectory 'uploads'
$defaultsFile = $null

try {
  New-Item -ItemType Directory -Path $databaseDirectory -Force | Out-Null
  $defaultsFile = New-MySqlDefaultsFile $connection
  $mysqldump = Get-MySqlExecutable 'mysqldump'
  $mysql = Get-MySqlExecutable 'mysql'
  $clientArgument = "--defaults-extra-file=$defaultsFile"
  $tableQuery = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (LEFT(TABLE_NAME, 7) = 'portal_' OR TABLE_NAME = '_prisma_migrations') ORDER BY TABLE_NAME;"
  $portalTables = @(& $mysql $clientArgument "--database=$($connection.Database)" '--batch' '--skip-column-names' '--execute' $tableQuery)
  if ($LASTEXITCODE -ne 0 -or $portalTables.Count -eq 0) {
    throw '未找到可备份的门户数据表。'
  }
  if (@($portalTables | Where-Object { $_ -notmatch '^(portal_[A-Za-z0-9_]+|_prisma_migrations)$' }).Count -gt 0) {
    throw '数据库返回了不安全的表名，已停止备份。'
  }

  $schemaDump = Join-Path $databaseDirectory 'schema.sql'
  $dataDump = Join-Path $databaseDirectory 'data.sql'
  Invoke-MySqlDumpToFile -Executable $mysqldump -Arguments (@(
    $clientArgument, '--single-transaction', '--skip-lock-tables', '--no-data', '--triggers', '--skip-add-drop-table', '--no-create-db', $connection.Database
  ) + $portalTables) -Destination $schemaDump
  Invoke-MySqlDumpToFile -Executable $mysqldump -Arguments (@(
    $clientArgument, '--single-transaction', '--skip-lock-tables', '--no-create-info', '--skip-triggers', '--hex-blob', $connection.Database
  ) + $portalTables) -Destination $dataDump

  if (Test-Path -LiteralPath $uploadDirectory -PathType Container) {
    Copy-Item -LiteralPath $uploadDirectory -Destination $uploadsDestination -Recurse -Force
  }

  $manifest = [ordered]@{
    formatVersion = 1
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    database = [ordered]@{
      name = $connection.Database
      schemaFile = 'database/schema.sql'
      dataFile = 'database/data.sql'
      schemaSha256 = (Get-FileHash -LiteralPath $schemaDump -Algorithm SHA256).Hash
      dataSha256 = (Get-FileHash -LiteralPath $dataDump -Algorithm SHA256).Hash
    }
    uploads = Get-DirectorySummary -Path $uploadsDestination
    notes = @(
      'The manifest contains no credentials.',
      'Restore only into a verified local portal database with a compatible schema.'
    )
  }
  $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backupDirectory 'manifest.json') -Encoding utf8

  Write-Host "备份完成：$backupDirectory"
  Write-Output $backupDirectory
} finally {
  if ($defaultsFile -and (Test-Path -LiteralPath $defaultsFile)) {
    Remove-Item -LiteralPath $defaultsFile -Force -ErrorAction SilentlyContinue
  }
}
