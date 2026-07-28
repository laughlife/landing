# 南阳市吴月商贸行门户管理系统

## 1. 项目介绍

这是一个基于 Nuxt 的商贸公司展示与内容管理系统。它用于展示公司、产品、服务、合作伙伴和新闻，并提供管理员后台维护、咨询留言与本地文件存储能力；它不是电商交易系统，不包含购物车、支付、订单、库存、会员商城或优惠券。

## 2. 功能列表

- 响应式官网：首页、产品、服务、公司介绍、合作伙伴、新闻和联系我们。
- 产品分类、产品多图、规格参数、相关推荐和动态 SEO。
- 管理员登录、角色权限、内容维护、媒体库、咨询留言和审计日志。
- MySQL 数据存储、Prisma 数据访问、Zod 输入校验和本地上传文件管理。
- 安全 Cookie 会话、后台接口鉴权、限流、富文本清理和文件上传校验。

## 3. 技术栈

- Nuxt 4、Vue 3、TypeScript、Nuxt UI、Tailwind CSS。
- Nitro/H3、Prisma、MySQL、Zod、nuxt-auth-utils。
- Sharp 图片处理、TipTap 富文本编辑器。
- Vitest、Nuxt Test Utils 和 Playwright（测试依赖安装完成后使用）。

## 4. 目录结构

```text
app/                 前台与后台页面、组件、布局和组合函数
server/              API、服务、仓储、鉴权、验证与文件处理
prisma/              Prisma Schema、迁移和 Seed
storage/uploads/     运行时上传文件，不提交到 Git
tests/               单元、集成和端到端测试
public/              随源码发布的静态资源
```

## 5. 环境要求

- Node.js 24.0 或更高版本（当前项目使用 Node 24）。
- pnpm 11.17 或更高版本；请勿混用 npm 或 yarn。
- MySQL 8.0+ 或兼容的 MariaDB，字符集使用 `utf8mb4`。
- 本地 Windows 开发使用 PowerShell 7+。
- 正式发布包必须在 Ubuntu 22.04 Linux x64 构建；Windows 一键入口依赖 WSL Ubuntu。
- 运行浏览器端到端测试时需要 Chromium。

## 6. 安装依赖

```powershell
pnpm install
```

如本地依赖链接因升级或中断安装而不一致，可在确认没有其它安装任务运行后重建依赖链接：

```powershell
pnpm install --force
```

## 7. 创建 `.env`

从模板创建本地配置，`.env` 只保留在本机，绝不能提交：

```powershell
Copy-Item .env.example .env
```

至少配置以下值。示例中的凭证均为占位符，不可直接用于生产：

```dotenv
DATABASE_URL="mysql://数据库用户名:URL编码后的数据库密码@127.0.0.1:3306/wysm"
NUXT_SESSION_PASSWORD="至少64位的随机字符串"
ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="首次部署时生成的高强度密码"
UPLOAD_DIR="./storage/uploads"
NUXT_PUBLIC_SITE_URL="http://localhost:3000"
NUXT_PUBLIC_SITE_NAME="吴月商贸"
```

可用下列命令生成会话密钥或初始密码：

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

## 8. 数据库初始化

先确认 `DATABASE_URL` 指向目标数据库。迁移只创建本项目 `portal_` 前缀的数据表；不得使用 `prisma migrate reset`，也不得删除任何已有的非本项目表。

```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

生产环境使用经过代码审查的已提交迁移：

```powershell
pnpm db:deploy
```

## 9. Prisma 命令

```powershell
pnpm db:generate  # 生成 Prisma Client
pnpm db:migrate   # 创建并应用开发迁移
pnpm db:deploy    # 应用生产迁移
pnpm db:seed      # 初始化可重复执行的演示数据
pnpm db:studio    # 打开 Prisma Studio（仅本地使用）
```

## 10. 启动开发环境

```powershell
pnpm dev
```

官网默认地址为 <http://localhost:3000>，API 位于 `/api`。

## 11. 后台登录地址

后台登录页为 <http://localhost:3000/admin/login>，登录成功后进入 <http://localhost:3000/admin>。

初始管理员仅由本机 `.env` 中的 `ADMIN_INITIAL_USERNAME` 与 `ADMIN_INITIAL_PASSWORD` 初始化；不要把它们写入文档、截图、Issue 或 Git 提交。

## 12. 管理员维护

首次部署通过 `pnpm db:seed` 创建初始管理员。后续管理员账号、角色和密码统一在管理后台维护，不再提供独立命令行维护脚本。

## 13. 文件存储说明

运行时上传文件保存于 `storage/uploads/YYYY/MM/DD/`，不会写入 `public/`。数据库仅保存受控的相对 URL 与媒体元数据；文件路由必须验证规范化后的目标仍位于上传根目录。上传目录和 `.env` 都不应提交到 Git。

## 14. 数据备份与恢复

项目不再内置数据库和上传文件的备份、恢复脚本。生产环境请使用数据库平台、主机快照或经过审核的运维系统统一备份 MySQL 与 `storage/uploads`，并在恢复前确认应用版本、数据库迁移版本和上传文件快照一致。

## 15. 发布前检查

正式发布必须使用 Ubuntu 22.04、Linux x64、Node.js 24+ 和 pnpm 11.17+。Windows 生成的 `.output` 只能用于本机调试，不能直接交付生产。

发布脚本会从干净且已提交的 Git 版本创建 Linux 临时构建目录，并依次执行：

```bash
pnpm install --frozen-lockfile --ignore-scripts --prod=false
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

脚本随后检查 Linux Sharp、Windows 原生依赖、禁止路径、发布包结构、ZIP 完整性和 LF 启动脚本。数据库迁移、现有业务数据、HTTPS、上传持久化和日志仍必须在隔离的生产等价环境中完成验收。

## 16. 生成 Linux 发布包

在 Linux x64 构建机或 WSL Ubuntu 中执行：

```bash
bash scripts/package-release.sh
```

Windows 可双击根目录的 `一键生成发布包.cmd`。该入口只负责调用 WSL 中的 Linux 脚本，不再使用 Windows 构建生产产物。WSL 内需要预先安装 Node.js 24+、pnpm 11.17+、Git、zip 和 unzip。

成功后在项目根目录生成：

```text
nywysm.zip
nywysm.zip.sha256
nywysm-release-info.txt
```

ZIP 只有 `nywysm/` 一个顶层目录，包含已经构建好的 `.output`、全部 Prisma 迁移、生成的 Prisma Client、三份一致的 pnpm 文件、无敏感信息的环境模板、Linux 启动脚本和部署说明。脚本禁止打包 `.env`、测试文件、Windows 原生依赖和任何 `storage/uploads/` 内容。

## 17. 生产环境约定

- 程序目录：`/var/www/nywysmh/nywysm/`
- 永久上传目录：`/var/www/nywysmh/storage/uploads/`
- 生产环境变量：`/etc/nywysmh/nywysmh.env`
- 应用监听：`127.0.0.1:4000`
- 正式域名：`https://nywysmh.com`、`https://www.nywysmh.com`
- systemd 服务：`nywysmh.service`
- Nginx 配置：`/etc/nginx/conf.d/nywysmh.com.conf`

发布包不得覆盖服务器维护的环境变量、Nginx、SSL 或 systemd 配置。生产环境使用 `.env.release.example` 中列出的变量名，但真实密码和密钥只保存在 `/etc/nywysmh/nywysmh.env`。

## 18. 数据库升级与启动

生产数据库 `wysm` 已包含业务数据。使用有权读取 `/etc/nywysmh/nywysmh.env` 的部署账户，进入新版本程序目录，将外置环境变量加载到当前 shell 后再执行：

```bash
set -a
. /etc/nywysmh/nywysmh.env
set +a
pnpm install --frozen-lockfile --ignore-scripts --prod=false
pnpm db:generate
pnpm db:deploy
```

禁止执行 `prisma migrate reset`、删除数据库、清空业务表或在常规发布时自动执行 Seed。`pnpm db:seed` 仅限全新空数据库首次初始化，并且必须由运维人员明确确认后手工执行。

正式服务由 systemd 注入 `/etc/nywysmh/nywysmh.env`，运行入口固定为：

```bash
node .output/server/index.mjs
```

`start-server.sh` 只用于发布包验收，不会构建、迁移、Seed 或修改环境变量。

## 19. Nginx 反向代理约定

```nginx
server {
  listen 80;
  server_name nywysmh.com www.nywysmh.com;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Nginx 和 SSL 已由生产服务器维护，发布包不修改它们。生产环境固定设置 `TRUST_PROXY=true`，应用使用 `X-Forwarded-For` 记录真实访客 IP；应用端口只监听 `127.0.0.1`，不得直接暴露公网。

## 20. 上传目录与回滚

- 仅授予应用服务账户对 `/var/www/nywysmh/storage/uploads/` 的读写权限。
- 上传目录始终位于程序目录外，不随 ZIP 交付，也不在切换或清理版本时删除。
- 上传文件只通过应用的受控 `/uploads/**` 路由读取，不把目录作为任意静态目录暴露。
- 程序回滚只切换到上一份已验收版本，不覆盖外置环境变量，不触碰永久上传目录。
- Prisma 迁移按向前升级处理；数据库恢复必须使用部署前备份和本次发布的专项回滚方案。

## 21. 发布包验收

最终 `nywysm.zip` 必须在干净 Ubuntu 22.04 Linux x64 环境解压并验收，至少确认：

- `unzip -t`、UTF-8 中文文件名和 frozen lockfile 安装通过。
- `pnpm db:generate` 与对已迁移数据库执行 `pnpm db:deploy` 通过。
- Linux Sharp 可加载，不包含 `@img/sharp-win32-x64`。
- `node .output/server/index.mjs` 可直接启动且只监听 `127.0.0.1:4000`。
- 首页和 `/admin/login` 返回 HTTP 200，后台可读取现有业务数据。
- 上传、图片处理、文件读取和外置目录持久化正常。
- HTTPS 下 Secure Cookie、真实访客 IP、限流、Canonical URL 和 Sitemap 正常。
- 日志不泄漏数据库密码、会话密钥、内部绝对路径或完整异常栈。
- 主站 `sqsmshop.com` 的程序、代理和服务状态不受副站发布影响。

只有全部验收通过后才能将发布包标记为“可发布”。

## 22. 安全注意事项

- 所有后台写接口必须在服务端验证会话、角色、Origin/CSRF 防护与 Zod 输入。
- 永远不要把数据库 URL、会话密钥、管理员密码或备份文件提交到 Git。
- 上传仅接受允许的 MIME 类型和文件签名，拒绝 SVG、脚本、压缩包及路径穿越。
- 生产错误响应不得返回 SQL、绝对路径、调用栈、Session 或 Prisma 内部错误。
- 定期检查管理员、上传文件和审计日志，并在正式环境使用 HTTPS。

## 23. 正式部署前更换密码

正式上线前必须更换数据库密码、`NUXT_SESSION_PASSWORD` 与初始管理员密码，并撤销任何已泄露或用于开发测试的凭证。变更数据库密码后，只更新 `/etc/nywysmh/nywysmh.env`，重启服务并验证管理员登录、上传和恢复流程。
