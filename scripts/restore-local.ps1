[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$BackupPath,

  [Parameter(Mandatory)]
  [switch]$ConfirmRestore,

  [Parameter()]
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\\.env'),

  [Parameter()]
  [switch]$AllowRemoteRestore
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-DotEnvValue {
  param([Parameter(Mandatory)] [string]$Path, [Parameter(Mandatory)] [string]$Name)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "找不到环境配置文件：$Path" }
  foreach ($line in [System.IO.File]::ReadLines((Resolve-Path -LiteralPath $Path))) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    if ($trimmed -match "^(?:export\s+)?$([regex]::Escape($Name))\s*=\s*(.*)$") {
      $value = $Matches[1].Trim()
      if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) { return $value.Substring(1, $value.Length - 2) }
      return $value
    }
  }
  throw "环境配置缺少 $Name"
}

function ConvertFrom-DatabaseUrl {
  param([Parameter(Mandatory)] [string]$DatabaseUrl)
  try { $uri = [System.Uri]$DatabaseUrl } catch { throw 'DATABASE_URL 不是有效的数据库连接 URL。' }
  if ($uri.Scheme -ne 'mysql' -or -not $uri.Host -or -not $uri.UserInfo -or -not $uri.AbsolutePath.Trim('/')) { throw 'DATABASE_URL 必须是 mysql:// 的完整连接 URL。' }
  $credentials = $uri.UserInfo.Split(':', 2)
  if ($credentials.Count -ne 2 -or -not $credentials[0]) { throw 'DATABASE_URL 必须包含用户名和密码。' }
  $username = [System.Uri]::UnescapeDataString($credentials[0])
  $password = [System.Uri]::UnescapeDataString($credentials[1])
  if ($username -match '[\x00-\x1F]' -or $password -match '[\x00-\x1F]') { throw 'DATABASE_URL 用户名或密码包含不允许的控制字符。' }
  [pscustomobject]@{
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
  if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return (Resolve-Path -LiteralPath $candidate).Path }
  $command = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  throw "未找到 $Name.exe。请将 MySQL bin 目录加入 PATH，或设置 MYSQL_BIN。"
}

function New-MySqlDefaultsFile {
  param([Parameter(Mandatory)] $Connection)
  $temporaryPath = Join-Path ([System.IO.Path]::GetTempPath()) ("wuyue-mysql-{0}.cnf" -f [Guid]::NewGuid().ToString('N'))
  $password = $Connection.Password.Replace('\\', '\\\\').Replace('"', '\\"')
  $content = @('[client]', "host=$($Connection.Host)", "port=$($Connection.Port)", "user=$($Connection.Username.Replace('"', '\\"'))", "password=$password", 'protocol=tcp') -join [Environment]::NewLine
  [System.IO.File]::WriteAllText($temporaryPath, $content, [System.Text.UTF8Encoding]::new($false))
  $temporaryPath
}

function Invoke-MySqlCommand {
  param([Parameter(Mandatory)] [string]$Executable, [Parameter(Mandatory)] [string[]]$Arguments)
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'mysql 命令执行失败。' }
}

function Invoke-MySqlFile {
  param([Parameter(Mandatory)] [string]$Executable, [Parameter(Mandatory)] [string[]]$Arguments, [Parameter(Mandatory)] [string]$InputFile)
  $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = $Executable
  $processInfo.UseShellExecute = $false
  $processInfo.RedirectStandardInput = $true
  $processInfo.RedirectStandardError = $true
  foreach ($argument in $Arguments) { [void]$processInfo.ArgumentList.Add($argument) }
  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $processInfo
  if (-not $process.Start()) { throw '无法启动 mysql。' }
  $exitCode = $null
  try {
    $input = [System.IO.File]::OpenRead($InputFile)
    try { $input.CopyTo($process.StandardInput.BaseStream) } finally { $input.Dispose(); $process.StandardInput.Close() }
    $error = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $exitCode = $process.ExitCode
  } finally {
    $process.Dispose()
  }
  if ($exitCode -ne 0) { throw "导入 SQL 失败：$error" }
}

if (-not $ConfirmRestore) {
  throw '恢复属于破坏性操作。请显式传入 -ConfirmRestore，并在下一步输入 RESTORE。'
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$manifestPath = Join-Path $resolvedBackup 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw '备份目录中缺少 manifest.json。' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.formatVersion -ne 1) { throw '不支持的备份清单版本。' }
if ($manifest.database.schemaFile -cne 'database/schema.sql' -or $manifest.database.dataFile -cne 'database/data.sql') { throw '备份清单中的数据库文件路径不受信任。' }
$schemaDump = Join-Path $resolvedBackup 'database/schema.sql'
$dataDump = Join-Path $resolvedBackup 'database/data.sql'
if (-not (Test-Path -LiteralPath $schemaDump -PathType Leaf) -or -not (Test-Path -LiteralPath $dataDump -PathType Leaf)) { throw '备份目录缺少数据库文件。' }
if ((Get-FileHash -LiteralPath $schemaDump -Algorithm SHA256).Hash -ne $manifest.database.schemaSha256 -or (Get-FileHash -LiteralPath $dataDump -Algorithm SHA256).Hash -ne $manifest.database.dataSha256) { throw '备份校验和不匹配，已拒绝恢复。' }

$connection = ConvertFrom-DatabaseUrl (Get-DotEnvValue -Path $EnvFile -Name 'DATABASE_URL')
if ($connection.Database -ne $manifest.database.name) { throw "目标数据库 '$($connection.Database)' 与备份数据库 '$($manifest.database.name)' 不一致，已拒绝恢复。" }
$localHosts = @('localhost', '127.0.0.1', '::1')
if ($connection.Host -notin $localHosts -and -not $AllowRemoteRestore) {
  throw "默认拒绝恢复远程数据库 '$($connection.Host):$($connection.Port)/$($connection.Database)'；如已完成额外审批，请显式传入 -AllowRemoteRestore。"
}

Write-Warning "即将恢复 '$resolvedBackup' 到 '$($connection.Host):$($connection.Port)/$($connection.Database)'。"
$expectedConfirmation = if ($connection.Host -in $localHosts) { 'RESTORE' } else { "REMOTE RESTORE $($connection.Database)" }
$typedConfirmation = Read-Host "请输入 $expectedConfirmation 继续"
if ($typedConfirmation -cne $expectedConfirmation) { throw '未收到明确确认，恢复已取消。' }

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$currentBackup = & (Join-Path $PSScriptRoot 'backup-local.ps1') -EnvFile $EnvFile
if ($LASTEXITCODE -ne 0 -or -not $currentBackup) { throw '恢复前自动备份失败，已停止恢复。' }
Write-Host "恢复前备份已创建：$currentBackup"

$backupUploads = Join-Path $resolvedBackup 'uploads'
$uploadDirectoryValue = try { Get-DotEnvValue -Path $EnvFile -Name 'UPLOAD_DIR' } catch { './storage/uploads' }
$uploadDirectory = if ([System.IO.Path]::IsPathRooted($uploadDirectoryValue)) { $uploadDirectoryValue } else { Join-Path $projectRoot $uploadDirectoryValue }
$resolvedUploadDirectory = [System.IO.Path]::GetFullPath($uploadDirectory)
$allowedStorageRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'storage')) + [System.IO.Path]::DirectorySeparatorChar
if (-not ($resolvedUploadDirectory + [System.IO.Path]::DirectorySeparatorChar).StartsWith($allowedStorageRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'UPLOAD_DIR 必须位于项目 storage 目录内，已拒绝覆盖。'
}
if (Test-Path -LiteralPath $uploadDirectory) {
  $uploadItem = Get-Item -LiteralPath $uploadDirectory -Force
  if ($uploadItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'UPLOAD_DIR 不能是符号链接或目录联接。' }
}
$uploadParent = Split-Path -Parent $uploadDirectory
New-Item -ItemType Directory -Path $uploadParent -Force | Out-Null
$stagedUploads = Join-Path $uploadParent ('.wuyue-restore-stage-{0}' -f [Guid]::NewGuid().ToString('N'))
$rollbackUploads = Join-Path $uploadParent ('.wuyue-restore-rollback-{0}' -f [Guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $backupUploads -PathType Container) {
  Copy-Item -LiteralPath $backupUploads -Destination $stagedUploads -Recurse
} else {
  New-Item -ItemType Directory -Path $stagedUploads | Out-Null
}

$defaultsFile = $null
try {
  $defaultsFile = New-MySqlDefaultsFile $connection
  $mysql = Get-MySqlExecutable 'mysql'
  $clientArgument = "--defaults-extra-file=$defaultsFile"
  $baseArguments = @($clientArgument, "--database=$($connection.Database)")
  $tables = & $mysql @($baseArguments + @('--batch', '--skip-column-names', '--execute', "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (LEFT(TABLE_NAME, 7) = 'portal_' OR TABLE_NAME = '_prisma_migrations') ORDER BY TABLE_NAME;"))
  if ($LASTEXITCODE -ne 0) { throw '无法查询目标数据库中的 portal_ 表。' }
  $portalTables = @($tables | Where-Object { $_ -match '^(portal_[A-Za-z0-9_]+|_prisma_migrations)$' })
  $businessPortalTables = @($portalTables | Where-Object { $_ -match '^portal_[A-Za-z0-9_]+$' })

  if ($businessPortalTables.Count -eq 0 -and $portalTables.Count -eq 0) {
    Invoke-MySqlFile -Executable $mysql -Arguments $baseArguments -InputFile $schemaDump
  } elseif ($businessPortalTables.Count -eq 0) {
    throw '目标库只有 Prisma 迁移表但没有门户表，请先执行 pnpm db:deploy 后再恢复。'
  } else {
    $deleteStatements = @('SET FOREIGN_KEY_CHECKS=0;')
    foreach ($table in $portalTables) { $deleteStatements += "DELETE FROM ``$table``;" }
    $deleteStatements += 'SET FOREIGN_KEY_CHECKS=1;'
    Invoke-MySqlCommand -Executable $mysql -Arguments ($baseArguments + @('--execute', ($deleteStatements -join [Environment]::NewLine)))
  }

  Invoke-MySqlFile -Executable $mysql -Arguments $baseArguments -InputFile $dataDump

  try {
    if (Test-Path -LiteralPath $uploadDirectory) { Move-Item -LiteralPath $uploadDirectory -Destination $rollbackUploads }
    Move-Item -LiteralPath $stagedUploads -Destination $uploadDirectory
    if (Test-Path -LiteralPath $rollbackUploads) { Remove-Item -LiteralPath $rollbackUploads -Recurse -Force }
  } catch {
    if (-not (Test-Path -LiteralPath $uploadDirectory) -and (Test-Path -LiteralPath $rollbackUploads)) {
      Move-Item -LiteralPath $rollbackUploads -Destination $uploadDirectory
    }
    throw
  }

  Write-Host '恢复完成。请启动应用并验证管理员登录、产品、上传文件和官网页面。'
} finally {
  if ($defaultsFile -and (Test-Path -LiteralPath $defaultsFile)) { Remove-Item -LiteralPath $defaultsFile -Force -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $stagedUploads) { Remove-Item -LiteralPath $stagedUploads -Recurse -Force -ErrorAction SilentlyContinue }
}
