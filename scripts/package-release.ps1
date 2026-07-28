[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$wslCommand = Get-Command 'wsl.exe' -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $wslCommand) {
  throw '未找到 WSL。生产发布包必须在 Linux x64 环境构建，请在 Ubuntu 22.04 构建机执行 bash scripts/package-release.sh。'
}

Write-Host '将通过 WSL Linux x64 环境生成生产发布包。'
Write-Host 'WSL 默认发行版必须为 Ubuntu 22.04，并已安装 Node.js 24+、pnpm 11.17+、zip、unzip 和 Git。'

& $wslCommand.Path --cd $projectRoot bash './scripts/package-release.sh'
exit $LASTEXITCODE
