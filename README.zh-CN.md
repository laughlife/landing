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
- Windows PowerShell 7+。
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

## 15. 生产构建

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

生产部署前应先在独立测试数据库完成迁移、Seed、接口测试与端到端测试。

隔离测试必须配置 `TEST_DATABASE_URL`，并且数据库名只能是 `wysm_test`；测试上传目录固定为 `./storage/test-uploads`。测试入口会拒绝连接 `wysm` 或复用现有开发服务：

```powershell
pnpm test:unit
```

## 16. 一键生成发布包

双击项目根目录的 `一键生成发布包.cmd`，程序会自动执行生产构建并在项目根目录生成 `nywysm.zip`。压缩包使用 `nywysm/` 作为顶层目录，包含生产运行文件、数据库迁移、环境变量模板、依赖锁文件和部署说明；不会包含真实 `.env`、Git 数据、测试文件、开发缓存或项目根 `node_modules`。

默认不会把运行时上传文件放入发布包。确实需要连同当前 `storage/uploads` 一起交付时，在 PowerShell 中显式执行：

```powershell
.\scripts\package-release.ps1 -IncludeUploads
```

脚本仅在新包构建、压缩和内容校验全部成功后替换旧的 `nywysm.zip`；失败时保留旧发布包。

## 17. Windows 部署注意事项

- 使用受支持的 Node.js LTS/当前项目锁定版本和 pnpm；服务账户必须能读取 `.env`、写入上传目录。
- 通过任务计划程序、Windows Service 或受控进程管理器运行 `node .output/server/index.mjs`，不要以管理员账户长期运行。
- 配置防火墙仅开放反向代理所需端口；MySQL 不应直接暴露到公网。

## 18. Nginx 反向代理示例

```nginx
server {
  listen 80;
  server_name example.com;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

生产站点必须启用 HTTPS。生产模式下 Cookie 会启用 `Secure`；当应用端口仅对受信任的本机反向代理开放时，设置 `TRUST_PROXY=true` 以正确记录访客 IP 并执行按 IP 限流。应用若可被公网直接访问，不得开启该选项。

## 19. 上传目录权限

仅授予应用服务账户对 `storage/uploads` 的读取和写入权限；不要给 Web 服务进程整个项目目录的修改权限。上传目录不可作为任意静态目录暴露，必须经受控 `/uploads/**` 路由访问。

## 20. 常见问题

**构建提示模块无法解析**：先关闭并发安装任务，再执行 `pnpm install --force` 重建 `node_modules` 链接，随后运行 `pnpm lint`、`pnpm typecheck` 与 `pnpm build`。

**备份脚本找不到 MySQL 工具**：将 MySQL `bin` 目录添加到 `PATH`，或设置 `MYSQL_BIN`。例如：`$env:MYSQL_BIN = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin'`。

**恢复失败**：保留恢复前自动备份和错误输出，核对目标数据库、应用迁移版本及备份清单；不要通过删除数据库或执行重置命令解决。

**端到端测试无法启动浏览器**：确认本机已安装 Google Chrome；当前 Playwright 配置使用 `channel: 'chrome'`，不会复用日常浏览器会话。

## 21. 安全注意事项

- 所有后台写接口必须在服务端验证会话、角色、Origin/CSRF 防护与 Zod 输入。
- 永远不要把数据库 URL、会话密钥、管理员密码或备份文件提交到 Git。
- 上传仅接受允许的 MIME 类型和文件签名，拒绝 SVG、脚本、压缩包及路径穿越。
- 生产错误响应不得返回 SQL、绝对路径、调用栈、Session 或 Prisma 内部错误。
- 定期检查管理员、上传文件和审计日志，并在正式环境使用 HTTPS。

## 22. 正式部署前更换密码

正式上线前必须更换数据库密码、`NUXT_SESSION_PASSWORD` 与初始管理员密码，并撤销任何已泄露或用于开发测试的凭证。变更数据库密码后，同步更新仅服务器可读的 `.env`，重启服务并验证管理员登录、上传和备份恢复流程。
