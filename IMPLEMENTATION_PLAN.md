# 吴月商贸门户管理系统实施计划

## 当前基线

- Nuxt 4.4.8、Vue 3.5.35、Nuxt UI 4.10.0、TypeScript 6.0.3
- Node.js 24.16.0、pnpm 11.17.0
- 当前仓库为 Nuxt UI Landing，保留 `GradientGlow`、`motion-v` 动效、品牌 Logo 和 Nuxt UI 视觉变量
- MySQL 8.4.8，目标数据库 `wysm` 已存在，字符集为 `utf8mb4`，当前无业务表
- 单仓库运行官网、管理后台、Nitro API 与本地上传文件服务

## 技术决策

- 数据层：Prisma ORM 7 + MySQL 驱动适配器，所有表使用 `portal_` 前缀
- 鉴权：`nuxt-auth-utils` 加密 HttpOnly Cookie Session，密码使用其 scrypt 哈希能力
- 验证：Zod；富文本使用服务端白名单清理
- 文件：`formidable` 流式接收、文件签名校验、Sharp 生成 WebP 和缩略图
- 编辑器：TipTap Vue 3，编辑器仅在管理端加载
- 测试：Vitest + Nuxt 测试工具，核心安全与 API 规则使用集成测试覆盖
- 部署：Node Server，运行时上传保存在 `storage/uploads`

## 实施阶段

### 1. 基础设施

- 安装 Prisma、MySQL 适配器、鉴权、验证、上传、图片处理、富文本和测试依赖
- 创建 `.env`、`.env.example`、运行时配置和安全忽略规则
- 建立 Prisma Schema、迁移、幂等 Seed 和管理员创建脚本
- 迁移前后只检查和操作 `portal_` 表

### 2. 服务端

- 建立 Prisma 单例、统一响应和错误处理、Zod 验证、安全富文本、分页与排序白名单
- 实现管理员 Session、角色权限、CSRF/Origin 校验、登录与联系表单限流
- 实现公开 API、后台 CRUD、缓存失效、操作日志
- 实现上传、缩略图、媒体引用检查和 `/uploads/**` 安全访问

### 3. 管理后台

- 登录页、鉴权中间件、响应式后台布局、控制台
- 公司、网站设置、分类、产品、合作伙伴、服务、Banner、文章、媒体、留言、管理员和审计日志
- 后台统一使用服务端分页、Zod 错误反馈、删除确认与中文界面
- 产品特点、应用场景、规格分组和服务流程使用可视化动态表单

### 4. 官网

- 数据库驱动首页，保留 Landing 的层次、光晕和克制动效
- 产品列表/详情、公司介绍、服务、合作伙伴、新闻和联系页面
- SSR、动态 SEO、结构化数据、Canonical、Sitemap、robots 与 404
- 响应式图片、懒加载、移动端适配和 reduced-motion 支持

### 5. 验证与交付

- 执行迁移、Seed、管理员登录与前后台数据联动验收
- 覆盖需求规定的鉴权、权限、产品、分类、上传和联系表单测试
- 执行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 创建 Windows 数据库/上传备份恢复脚本与 `README.zh-CN.md`
- 仅提交本任务相关源码、迁移和文档，不提交 `.env`、上传文件或备份

## 安全边界

- 不执行数据库重置、删库、删表或接受数据丢失的迁移命令
- 数据库 URL、Session 密钥和初始密码仅保存在未跟踪的 `.env`
- 管理 API 始终执行服务端鉴权；写接口执行 Origin 校验和审计记录
- 上传路径、MIME、文件签名、大小和最终落盘路径均进行服务端验证
- 删除分类、管理员和媒体前执行关联与当前会话保护

