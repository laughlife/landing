#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL='C.UTF-8'

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
readonly OUTPUT_ZIP="$PROJECT_ROOT/nywysm.zip"
readonly OUTPUT_SHA256="$PROJECT_ROOT/nywysm.zip.sha256"
readonly OUTPUT_INFO="$PROJECT_ROOT/nywysm-release-info.txt"
readonly PROJECT_TEMP_ZIP="$PROJECT_ROOT/.nywysm.$$.zip"
readonly PROJECT_TEMP_SHA256="$PROJECT_ROOT/.nywysm.$$.sha256"
readonly PROJECT_TEMP_INFO="$PROJECT_ROOT/.nywysm.$$.info"
PUBLISH_STARTED=0
PUBLISH_COMPLETE=0

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '缺少发布工具：%s\n' "$1" >&2
    exit 1
  fi
}

version_at_least() {
  local actual="$1"
  local required="$2"
  [ "$(printf '%s\n%s\n' "$required" "$actual" | sort -V | head -n 1)" = "$required" ]
}

for command_name in git node pnpm tar zip unzip sha256sum grep find getconf; do
  require_command "$command_name"
done

if [ "$(uname -s)" != 'Linux' ] || [ "$(uname -m)" != 'x86_64' ]; then
  printf '生产发布包必须在 Linux x64 环境构建，当前平台：%s %s\n' "$(uname -s)" "$(uname -m)" >&2
  exit 1
fi
if [ ! -r '/etc/os-release' ]; then
  printf '无法识别 Linux 发行版，发布环境必须为 Ubuntu 22.04。\n' >&2
  exit 1
fi
# shellcheck disable=SC1091
. '/etc/os-release'
if [ "${ID:-}" != 'ubuntu' ] || [ "${VERSION_ID:-}" != '22.04' ]; then
  printf '发布环境必须为 Ubuntu 22.04，当前环境：%s\n' "${PRETTY_NAME:-unknown}" >&2
  exit 1
fi
libc_version="$(getconf GNU_LIBC_VERSION 2>/dev/null || true)"
if [[ "$libc_version" != glibc\ * ]]; then
  printf '发布环境必须使用 glibc，当前 C 库：%s\n' "${libc_version:-unknown}" >&2
  exit 1
fi

node_version="$(node --version | sed 's/^v//')"
pnpm_version="$(pnpm --version)"
if ! version_at_least "$node_version" '24.0.0'; then
  printf 'Node.js 版本必须不低于 24.0.0，当前版本：%s\n' "$node_version" >&2
  exit 1
fi
if ! version_at_least "$pnpm_version" '11.17.0'; then
  printf 'pnpm 版本必须不低于 11.17.0，当前版本：%s\n' "$pnpm_version" >&2
  exit 1
fi

cd "$PROJECT_ROOT"
if [ -n "$(git status --porcelain)" ]; then
  printf '工作区存在未提交改动。请先完成并提交本次发布内容，再从确定的 Git 提交生成发布包。\n' >&2
  exit 1
fi

readonly GIT_COMMIT="$(git rev-parse HEAD)"
readonly GIT_SHORT_COMMIT="$(git rev-parse --short=12 HEAD)"
readonly BUILD_TIME="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
readonly TEMP_BASE="${TMPDIR:-/tmp}"
readonly TEMP_ROOT="$(mktemp -d "$TEMP_BASE/nywysm-release.XXXXXX")"
readonly SOURCE_ROOT="$TEMP_ROOT/source"
readonly PACKAGE_PARENT="$TEMP_ROOT/package"
readonly PACKAGE_ROOT="$PACKAGE_PARENT/nywysm"
readonly VERIFY_ROOT="$TEMP_ROOT/verify"
readonly TEMP_ZIP="$TEMP_ROOT/nywysm.zip"
readonly TEMP_SHA256="$TEMP_ROOT/nywysm.zip.sha256"
readonly TEMP_INFO="$TEMP_ROOT/nywysm-release-info.txt"
readonly PREVIOUS_ROOT="$TEMP_ROOT/previous"

cleanup() {
  if [ "$PUBLISH_STARTED" -eq 1 ] && [ "$PUBLISH_COMPLETE" -eq 0 ]; then
    for output_name in 'nywysm.zip' 'nywysm.zip.sha256' 'nywysm-release-info.txt'; do
      if [ -f "$PREVIOUS_ROOT/$output_name" ]; then
        cp -- "$PREVIOUS_ROOT/$output_name" "$PROJECT_ROOT/$output_name" || true
      else
        rm -f -- "$PROJECT_ROOT/$output_name"
      fi
    done
    printf '发布交付物替换失败，已尝试恢复上一组文件。\n' >&2
  fi
  rm -f -- "$PROJECT_TEMP_ZIP" "$PROJECT_TEMP_SHA256" "$PROJECT_TEMP_INFO"
  case "$TEMP_ROOT" in
    "$TEMP_BASE"/nywysm-release.*)
      rm -rf -- "$TEMP_ROOT"
      ;;
    *)
      printf '拒绝清理非发布临时目录：%s\n' "$TEMP_ROOT" >&2
      ;;
  esac
}
trap cleanup EXIT

mkdir -p "$SOURCE_ROOT" "$PACKAGE_ROOT" "$VERIFY_ROOT"
git archive --format=tar "$GIT_COMMIT" | tar -xf - -C "$SOURCE_ROOT"

cd "$SOURCE_ROOT"
export DATABASE_URL='mysql://release:release@127.0.0.1:8866/wysm'
export NUXT_SESSION_PASSWORD='release-build-only-session-password-00000000000000000000000000000000'
export ADMIN_INITIAL_USERNAME='admin'
export ADMIN_INITIAL_PASSWORD='release-build-only-password'
export UPLOAD_DIR='/var/www/nywysmh/storage/uploads'
export NITRO_HOST='127.0.0.1'
export NITRO_PORT='4000'
export NUXT_PUBLIC_SITE_URL='https://nywysmh.com'
export NUXT_PUBLIC_SITE_NAME='南阳市吴月商贸行'
export TRUST_PROXY='true'
export NODE_ENV='production'

printf '正在 Linux x64 临时目录安装锁定依赖...\n'
pnpm install --frozen-lockfile --ignore-scripts --prod=false
printf '正在生成 Prisma Client...\n'
pnpm db:generate
printf '正在执行发布前静态检查与单元测试...\n'
pnpm lint
pnpm typecheck
pnpm test
printf '正在构建 Nuxt 生产产物...\n'
pnpm build

test -f '.output/server/index.mjs'
test -d 'server/generated/prisma'
test -d '.output/server/node_modules/@img/sharp-linux-x64'
if find '.output' -path '*sharp-win32*' -print -quit | grep -q .; then
  printf 'Linux 发布产物中发现 Windows Sharp 原生依赖。\n' >&2
  exit 1
fi
node -e "require('./.output/server/node_modules/sharp')"

if grep -R -I -n -E '[A-Za-z]:\\\\|localhost:3000' '.output' >/dev/null; then
  printf '构建产物中发现 Windows 绝对路径或 localhost:3000。\n' >&2
  exit 1
fi

cp -aL '.output' "$PACKAGE_ROOT/.output"
mkdir -p "$PACKAGE_ROOT/prisma" "$PACKAGE_ROOT/server"
cp 'prisma/schema.prisma' "$PACKAGE_ROOT/prisma/schema.prisma"
cp -a 'prisma/migrations' "$PACKAGE_ROOT/prisma/migrations"
cp -a 'server/generated' "$PACKAGE_ROOT/server/generated"
cp '.env.release.example' "$PACKAGE_ROOT/.env.example"
cp 'package.json' 'pnpm-lock.yaml' 'pnpm-workspace.yaml' 'prisma.config.ts' 'README.zh-CN.md' "$PACKAGE_ROOT/"
cp '部署说明.txt' 'start-server.sh' "$PACKAGE_ROOT/"
chmod 0755 "$PACKAGE_ROOT/start-server.sh"

if find "$PACKAGE_ROOT/.output" -type l -print -quit | grep -q .; then
  printf '发布产物中仍存在可能指向构建机的符号链接。\n' >&2
  exit 1
fi
node -e "require('$PACKAGE_ROOT/.output/server/node_modules/sharp')"

if grep -q $'\r' "$PACKAGE_ROOT/start-server.sh"; then
  printf 'start-server.sh 不是 LF 换行。\n' >&2
  exit 1
fi

cd "$PACKAGE_PARENT"
zip -q -r -X "$TEMP_ZIP" 'nywysm'
unzip -t "$TEMP_ZIP" >/dev/null
unzip -q "$TEMP_ZIP" -d "$VERIFY_ROOT"

required_paths=(
  'nywysm/.output/server/index.mjs'
  'nywysm/prisma/schema.prisma'
  'nywysm/prisma/migrations'
  'nywysm/server/generated'
  'nywysm/.env.example'
  'nywysm/package.json'
  'nywysm/pnpm-lock.yaml'
  'nywysm/pnpm-workspace.yaml'
  'nywysm/prisma.config.ts'
  'nywysm/README.zh-CN.md'
  'nywysm/部署说明.txt'
  'nywysm/start-server.sh'
)
for required_path in "${required_paths[@]}"; do
  if [ ! -e "$VERIFY_ROOT/$required_path" ]; then
    printf '发布包缺少必需内容：%s\n' "$required_path" >&2
    exit 1
  fi
done
if [ ! -x "$VERIFY_ROOT/nywysm/start-server.sh" ]; then
  printf 'ZIP 解压后的 start-server.sh 不可执行。\n' >&2
  exit 1
fi
test -d "$VERIFY_ROOT/nywysm/.output/server/node_modules/@img/sharp-linux-x64"
if find "$VERIFY_ROOT/nywysm/.output" -path '*sharp-win32*' -print -quit | grep -q .; then
  printf 'ZIP 中发现 Windows Sharp 原生依赖。\n' >&2
  exit 1
fi
node -e "require('$VERIFY_ROOT/nywysm/.output/server/node_modules/sharp')"

zip_entries="$(unzip -Z1 "$TEMP_ZIP")"
if printf '%s\n' "$zip_entries" | grep -E '^nywysm/(\.env$|\.git/|\.nuxt/|node_modules/|storage/|tests?/|test-results/)' >/dev/null; then
  printf '发布包包含禁止交付的内容。\n' >&2
  exit 1
fi
if printf '%s\n' "$zip_entries" | grep -v '^nywysm/' >/dev/null; then
  printf '发布包存在 nywysm/ 之外的顶层内容。\n' >&2
  exit 1
fi

(
  cd "$TEMP_ROOT"
  sha256sum 'nywysm.zip' > 'nywysm.zip.sha256'
)

{
  printf '版本：git-%s\n' "$GIT_SHORT_COMMIT"
  printf '构建时间（UTC）：%s\n' "$BUILD_TIME"
  printf 'Git 提交号：%s\n' "$GIT_COMMIT"
  printf '构建平台：%s，Linux x64，%s\n' "${PRETTY_NAME:-Ubuntu 22.04}" "$libc_version"
  printf 'Node.js：%s\n' "$node_version"
  printf 'pnpm：%s\n' "$pnpm_version"
  printf '\n迁移清单：\n'
  find "$SOURCE_ROOT/prisma/migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
  printf '\n变更说明：\n'
  git -C "$PROJECT_ROOT" log -1 --format='%s' "$GIT_COMMIT"
  printf '\n\n回滚注意事项：\n'
  printf '程序可切回上一份已验收版本；不要删除外置上传目录，不要覆盖 /etc/nywysmh/nywysmh.env。\n'
  printf '数据库迁移按向前升级处理；如需数据库恢复，必须使用部署前备份和本次专项回滚方案。\n'
} > "$TEMP_INFO"

mkdir -p "$PREVIOUS_ROOT"
for output_name in 'nywysm.zip' 'nywysm.zip.sha256' 'nywysm-release-info.txt'; do
  if { [ -e "$PROJECT_ROOT/$output_name" ] || [ -L "$PROJECT_ROOT/$output_name" ]; } \
    && { [ ! -f "$PROJECT_ROOT/$output_name" ] || [ -L "$PROJECT_ROOT/$output_name" ]; }; then
    printf '发布交付物目标必须是普通文件或不存在：%s\n' "$PROJECT_ROOT/$output_name" >&2
    exit 1
  fi
  if [ -f "$PROJECT_ROOT/$output_name" ]; then
    cp -- "$PROJECT_ROOT/$output_name" "$PREVIOUS_ROOT/$output_name"
  fi
done
cp "$TEMP_ZIP" "$PROJECT_TEMP_ZIP"
cp "$TEMP_SHA256" "$PROJECT_TEMP_SHA256"
cp "$TEMP_INFO" "$PROJECT_TEMP_INFO"

PUBLISH_STARTED=1
mv -f -- "$PROJECT_TEMP_ZIP" "$OUTPUT_ZIP"
mv -f -- "$PROJECT_TEMP_SHA256" "$OUTPUT_SHA256"
mv -f -- "$PROJECT_TEMP_INFO" "$OUTPUT_INFO"
PUBLISH_COMPLETE=1

printf '\n发布包已生成：%s\n' "$OUTPUT_ZIP"
printf '校验文件：%s\n' "$OUTPUT_SHA256"
printf '发布信息：%s\n' "$OUTPUT_INFO"
printf '仍须按《发布须知》在干净 Ubuntu 22.04 环境完成数据库、启动、HTTPS、上传持久化和日志验收后，方可标记为可发布。\n'
