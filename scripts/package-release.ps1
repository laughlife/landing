[CmdletBinding()]
param(
  [Parameter()]
  [switch]$IncludeUploads
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptDirectory = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$projectRoot = if (Test-Path -LiteralPath (Join-Path $scriptDirectory 'package.json') -PathType Leaf) {
  $scriptDirectory
} elseif (Test-Path -LiteralPath (Join-Path $scriptDirectory '../package.json') -PathType Leaf) {
  (Resolve-Path -LiteralPath (Join-Path $scriptDirectory '..')).Path
} else {
  throw "无法根据脚本位置找到项目根目录：$scriptDirectory"
}
$outputPath = Join-Path $projectRoot 'nywysm.zip'
$releaseId = [Guid]::NewGuid().ToString('N')
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "nywysm-release-$releaseId"
$packageRoot = Join-Path $temporaryRoot 'nywysm'
$verificationRoot = Join-Path $temporaryRoot 'verify'
$temporaryZip = Join-Path $projectRoot ".nywysm.$releaseId.zip"
$backupZip = Join-Path $projectRoot ".nywysm.$releaseId.backup.zip"

function Assert-TemporaryPath {
  param([Parameter(Mandatory)] [string]$Path)

  $expectedPrefix = [System.IO.Path]::GetFullPath(
    (Join-Path ([System.IO.Path]::GetTempPath()) 'nywysm-release-')
  )
  $resolvedPath = [System.IO.Path]::GetFullPath($Path)
  if (-not $resolvedPath.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "临时目录超出允许范围：$resolvedPath"
  }
}

function Copy-ReleaseItem {
  param(
    [Parameter(Mandatory)] [string]$RelativePath,
    [Parameter()] [switch]$Required
  )

  $source = Join-Path $projectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $source)) {
    if ($Required) {
      throw "发布文件不存在：$RelativePath"
    }
    return
  }

  $destination = Join-Path $packageRoot $RelativePath
  $destinationParent = Split-Path -Parent $destination
  New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
}

function Convert-ReleaseLinksToDirectories {
  param([Parameter(Mandatory)] [string]$OutputDirectory)

  $allowedRoots = @(
    ([System.IO.Path]::GetFullPath((Join-Path $projectRoot '.output')) + [System.IO.Path]::DirectorySeparatorChar),
    ([System.IO.Path]::GetFullPath($OutputDirectory) + [System.IO.Path]::DirectorySeparatorChar)
  )
  $links = @(Get-ChildItem -LiteralPath $OutputDirectory -Recurse -Force | Where-Object {
    $_.Attributes -band [System.IO.FileAttributes]::ReparsePoint
  })

  foreach ($link in $links) {
    if (-not $link.PSIsContainer) {
      throw "发布目录中存在不支持的文件链接：$($link.FullName)"
    }

    $target = @($link.Target)[0]
    if (-not $target) {
      throw "无法解析发布目录中的链接：$($link.FullName)"
    }

    $targetPath = [System.IO.Path]::GetFullPath(
      $(if ([System.IO.Path]::IsPathRooted($target)) { $target } else { Join-Path $link.Parent.FullName $target })
    )
    if (-not ($allowedRoots | Where-Object {
      ($targetPath + [System.IO.Path]::DirectorySeparatorChar).StartsWith($_, [System.StringComparison]::OrdinalIgnoreCase)
    })) {
      throw "发布目录链接指向了非白名单位置：$($link.FullName) -> $targetPath"
    }

    [System.IO.Directory]::Delete($link.FullName)
    Copy-Item -LiteralPath $targetPath -Destination $link.FullName -Recurse -Force
  }

  $remainingLinks = @(Get-ChildItem -LiteralPath $OutputDirectory -Recurse -Force | Where-Object {
    $_.Attributes -band [System.IO.FileAttributes]::ReparsePoint
  })
  if ($remainingLinks.Count -gt 0) {
    throw '发布目录中仍存在未展开的文件系统链接。'
  }
}

Assert-TemporaryPath -Path $temporaryRoot

try {
  $pnpmCommand = Get-Command 'pnpm.cmd' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $pnpmCommand) {
    $pnpmCommand = Get-Command 'pnpm' -ErrorAction Stop | Select-Object -First 1
  }

  Write-Host '正在构建生产版本...'
  Push-Location $projectRoot
  try {
    & $pnpmCommand 'build'
    if ($LASTEXITCODE -ne 0) {
      throw "生产构建失败，退出代码：$LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }

  $serverEntry = Join-Path $projectRoot '.output/server/index.mjs'
  if (-not (Test-Path -LiteralPath $serverEntry -PathType Leaf)) {
    throw '构建结果缺少 .output/server/index.mjs。'
  }

  New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
  Copy-ReleaseItem -RelativePath '.output' -Required
  Convert-ReleaseLinksToDirectories -OutputDirectory (Join-Path $packageRoot '.output')
  Copy-ReleaseItem -RelativePath '.env.example' -Required
  Copy-ReleaseItem -RelativePath 'package.json' -Required
  Copy-ReleaseItem -RelativePath 'pnpm-lock.yaml' -Required
  Copy-ReleaseItem -RelativePath 'prisma' -Required
  Copy-ReleaseItem -RelativePath 'prisma.config.ts' -Required
  Copy-ReleaseItem -RelativePath 'server/generated/prisma' -Required
  Copy-ReleaseItem -RelativePath 'server/utils/db.ts' -Required
  Copy-ReleaseItem -RelativePath 'README.zh-CN.md' -Required

  if ($IncludeUploads) {
    Copy-ReleaseItem -RelativePath 'storage/uploads'
    Write-Warning '本次发布包包含 storage/uploads。它可能含有业务文件，请仅发送到受信任的部署环境。'
  }

  $startCommand = @'
@echo off
setlocal
cd /d "%~dp0"
if not exist ".env" (
  echo Missing .env. Copy .env.example to .env and configure production values first.
  pause
  exit /b 1
)
node --env-file=.env .output\server\index.mjs
set "exitCode=%ERRORLEVEL%"
pause
exit /b %exitCode%
'@
  [System.IO.File]::WriteAllText(
    (Join-Path $packageRoot 'start-server.cmd'),
    $startCommand,
    [System.Text.UTF8Encoding]::new($false)
  )

  $uploadNote = if ($IncludeUploads) {
    '本包已包含打包时的 storage/uploads。部署覆盖前仍应备份服务器现有上传目录。'
  } else {
    '本包不包含 storage/uploads。升级时必须保留服务器现有上传目录；全新部署时请单独同步上传文件。'
  }
  $deploymentGuide = @"
南阳市吴月商贸行发布包

运行要求：
1. Node.js 24 或更高版本。
2. 首次部署或数据库结构升级时需要 pnpm 11.17 或更高版本。
3. MySQL/MariaDB、生产数据库账号和至少 64 位的会话密钥。

部署步骤：
1. 解压后进入 nywysm 目录。
2. 将 .env.example 复制为 .env，并填写生产环境配置；不要把真实 .env 对外发送。
3. 首次部署或有新迁移时执行：
   pnpm install --frozen-lockfile --ignore-scripts --prod=false
   pnpm db:generate
   pnpm db:deploy
4. 仅首次初始化空数据库时，根据实际需要执行 pnpm db:seed。
5. 运行 start-server.cmd，或执行：
   node --env-file=.env .output/server/index.mjs

$uploadNote

注意：
- 数据库和上传文件必须采用同一业务时间点的备份或迁移方案。
- 发布包不包含真实 .env、Git 数据、测试文件、开发缓存或项目根 node_modules。
- start-server.cmd 适合前台验证；正式环境建议交给 Windows Service、任务计划程序或进程管理器运行。
"@
  [System.IO.File]::WriteAllText(
    (Join-Path $packageRoot '部署说明.txt'),
    $deploymentGuide,
    [System.Text.UTF8Encoding]::new($false)
  )

  Write-Host '正在压缩发布包...'
  Push-Location $temporaryRoot
  try {
    Compress-Archive -LiteralPath 'nywysm' -DestinationPath $temporaryZip -CompressionLevel Optimal -Force
  } finally {
    Pop-Location
  }

  if (-not (Test-Path -LiteralPath $temporaryZip -PathType Leaf) -or (Get-Item -LiteralPath $temporaryZip).Length -le 0) {
    throw '生成的 ZIP 文件无效。'
  }

  Expand-Archive -LiteralPath $temporaryZip -DestinationPath $verificationRoot -Force
  $verifiedEntry = Join-Path $verificationRoot 'nywysm/.output/server/index.mjs'
  if (-not (Test-Path -LiteralPath $verifiedEntry -PathType Leaf)) {
    throw 'ZIP 内容校验失败：缺少服务启动文件。'
  }

  if (Test-Path -LiteralPath $outputPath -PathType Container) {
    throw "发布包目标不能是目录：$outputPath"
  }

  if (Test-Path -LiteralPath $outputPath -PathType Leaf) {
    [System.IO.File]::Replace($temporaryZip, $outputPath, $backupZip, $true)
    Remove-Item -LiteralPath $backupZip -Force -ErrorAction SilentlyContinue
  } else {
    Move-Item -LiteralPath $temporaryZip -Destination $outputPath
  }

  $result = Get-Item -LiteralPath $outputPath
  Write-Host ''
  Write-Host "发布包已生成：$($result.FullName)"
  Write-Host ("文件大小：{0:N2} MB" -f ($result.Length / 1MB))
} catch {
  Write-Host "发布包生成失败：$($_.Exception.Message)" -ForegroundColor Red
  exit 1
} finally {
  if (Test-Path -LiteralPath $temporaryRoot) {
    Assert-TemporaryPath -Path $temporaryRoot
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $temporaryZip -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $backupZip -PathType Leaf) {
    if (-not (Test-Path -LiteralPath $outputPath)) {
      Move-Item -LiteralPath $backupZip -Destination $outputPath
    } else {
      Write-Warning "旧发布包备份被保留：$backupZip"
    }
  }
}
