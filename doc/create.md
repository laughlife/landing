# 项目总任务：将当前 Nuxt Landing 改造成完整商贸公司门户管理系统

你当前位于一个已经下载完成的 Nuxt UI Landing 项目根目录。

不要新建另一个独立前端项目，不要丢弃现有 Landing 的优秀视觉组件，不要只给出方案或示例代码。请直接检查当前代码仓库，在现有项目上完成开发、安装依赖、创建数据库结构、编写前后台页面、执行测试并确保项目能够运行。

这是一个展示型商贸公司门户，不是电商交易系统。

系统只负责：

* 公司品牌及业务展示
* 产品分类和产品信息展示
* 合作伙伴展示
* 服务项目展示
* 前台咨询留言
* 后台内容维护
* 图片和文件本地存储
* SEO 与响应式访问

明确禁止实现：

* 购物车
* 在线支付
* 订单
* 库存
* 会员商城
* 优惠券
* 销售金额
* 复杂多租户
* 第三方收费 CMS

---

# 一、执行原则

1. 首先检查当前项目的：

  * `package.json`
  * Nuxt 版本
  * Nuxt UI 版本
  * TypeScript 配置
  * 当前目录结构
  * 当前已有组件
  * 当前 Landing 页面内容
  * 当前包管理器及 lock 文件

2. 优先沿用当前项目已有技术和编码规范。

3. 如果当前项目使用 pnpm，继续使用 pnpm；不要混用 npm、yarn 和 pnpm。

4. 使用当前项目兼容的稳定版本依赖，不要为了追求版本号而破坏已有项目。

5. 所有代码必须使用 TypeScript。

6. 不要创建伪接口、静态 JSON 假后台或只能演示不能维护的数据。

7. 前台页面必须读取 MySQL 数据库中的真实数据。

8. 后台保存后，前台刷新即可显示最新数据。

9. 不要把数据库密码、会话密钥或管理员密码写入源码、README、Git 历史或浏览器端代码。

10. 不得执行以下破坏性操作：

  * 删除现有数据库
  * 删除现有非本项目数据表
  * `prisma migrate reset`
  * `DROP DATABASE`
  * `DROP TABLE`
  * `--force-reset`
  * `--accept-data-loss`

11. 如果发生非关键技术歧义，选择合理实现并继续开发，不要停下来等待确认。

12. 只有涉及删除已有用户代码、已有数据库数据或更改数据库连接目标时，才暂停并说明风险。

13. 每完成一个阶段，都运行相应检查，不要把所有错误拖到最后堆成一座纪念碑。

---

# 二、项目架构

将当前项目改造成单仓库 Nuxt 全栈系统：

```text
当前 Nuxt 项目
├── app/或现有前端目录
│   ├── pages/                 官网页面和后台页面
│   ├── components/            公共组件、官网组件、后台组件
│   ├── layouts/               官网布局和后台布局
│   ├── middleware/            前端路由鉴权
│   ├── composables/           API、分页、上传等组合函数
│   └── assets/                样式和静态前端资源
│
├── server/
│   ├── api/
│   │   ├── public/            官网公开接口
│   │   ├── admin/             后台管理接口
│   │   ├── auth/              登录、退出、会话接口
│   │   └── upload/            文件上传接口
│   ├── middleware/            服务端鉴权、日志、安全检查
│   ├── routes/                本地文件访问路由
│   ├── services/              业务逻辑
│   ├── repositories/          数据访问封装
│   ├── utils/                 Prisma、响应、验证、文件处理
│   └── validators/            Zod 请求验证
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── storage/
│   └── uploads/               运行时本地上传文件
│
├── public/                    只放随源码发布的静态文件
├── .env                       本地敏感配置，不提交
├── .env.example               无真实密码的配置模板
└── README.zh-CN.md
```

网站前台、后台和 API 使用同一个 Nuxt 服务运行。

默认地址：

```text
官网：http://localhost:3000
后台：http://localhost:3000/admin
后台登录：http://localhost:3000/admin/login
API：http://localhost:3000/api
上传文件：http://localhost:3000/uploads/...
```

---

# 三、核心技术要求

在兼容当前项目的前提下使用：

* Nuxt
* Vue 3
* TypeScript
* Nuxt UI
* Tailwind CSS
* Nitro/H3 服务端 API
* Prisma ORM
* MySQL
* Zod
* Nuxt Auth Utils 或与当前 Nuxt 版本兼容的安全 Cookie Session 方案
* 安全的密码哈希
* Sharp，用于图片压缩和缩略图
* TipTap 或兼容 Vue 3 的富文本编辑器
* ESLint
* 当前项目已有格式化工具

如果 `@prisma/nuxt` 已废弃或与当前版本不兼容，不要使用它。按照当前 Prisma 推荐方式创建：

```text
server/utils/db.ts
```

并确保开发热更新期间不会重复创建无限 Prisma Client 实例。

---

# 四、数据库连接

MySQL 连接信息：

```text
Host: localhost
Port: 3306
Database: wysm
Username: root
Password: 仅保存在本地未跟踪的 `.env` 中
```

Prisma URL 中密码里的 `@` 必须 URL 编码：

```env
DATABASE_URL="mysql://root:URL_ENCODED_PASSWORD@localhost:3306/wysm"
```

请创建本地 `.env`，至少包含：

```env
DATABASE_URL="mysql://root:URL_ENCODED_PASSWORD@localhost:3306/wysm"

NUXT_SESSION_PASSWORD="由程序生成至少64位的高强度随机字符串"
ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="由程序生成的高强度初始密码"

UPLOAD_DIR="./storage/uploads"
MAX_UPLOAD_SIZE_MB="10"

NUXT_PUBLIC_SITE_URL="http://localhost:3000"
NUXT_PUBLIC_SITE_NAME="吴月商贸"
```

要求：

1. `.env` 必须加入 `.gitignore`。
2. `.env.example` 不得包含真实数据库密码和真实管理员密码。
3. 数据库配置只能在服务端读取。
4. 不得通过 `runtimeConfig.public` 暴露数据库 URL。
5. 自动生成 session 密钥和管理员初始密码。
6. 最终任务报告中告诉我管理员账号和初始密码。
7. 不要在客户端 bundle 中出现任何敏感配置。
8. 项目完成后，在 README 中提醒正式部署前更换数据库密码。

连接数据库后，先查询现有数据表：

* 如果数据库为空，正常创建迁移。
* 如果数据库已经存在其他业务表，不得删除或修改。
* 本项目所有表使用 `portal_` 前缀。
* Prisma 模型通过 `@@map` 或 `@map` 映射到带前缀的数据库表。
* 禁止重置数据库。

数据库字符集使用：

```text
utf8mb4
```

排序规则使用兼容当前 MySQL 版本的 `utf8mb4` 排序规则。

---

# 五、数据库模型

请根据以下要求设计规范化 Prisma Schema。

## 1. 管理员 AdminUser

数据库表：

```text
portal_admin_users
```

字段至少包含：

```text
id
username
passwordHash
displayName
email
avatar
role
status
lastLoginAt
lastLoginIp
createdAt
updatedAt
```

规则：

* `username` 唯一。
* 密码只保存哈希。
* 首期角色支持 `SUPER_ADMIN` 和 `EDITOR`。
* SUPER_ADMIN 可以管理管理员。
* EDITOR 可以维护内容，但不能删除超级管理员。
* 管理员删除使用谨慎策略，至少禁止删除当前登录账号。

## 2. 公司信息 CompanyProfile

数据库表：

```text
portal_company_profiles
```

作为单例内容使用，字段至少包含：

```text
id
companyName
shortName
slogan
logo
favicon
heroTitle
heroSubtitle
introduction
fullDescription
businessScope
advantages
address
phone
email
wechat
whatsapp
workingHours
latitude
longitude
registrationInfo
createdAt
updatedAt
```

其中：

* `advantages` 使用 JSON 数组。
* `businessScope` 可以使用富文本或 JSON。
* 后台只维护一条公司主体记录。

## 3. 网站设置 SiteSetting

数据库表：

```text
portal_site_settings
```

字段至少包含：

```text
id
siteName
siteUrl
siteTitle
siteKeywords
siteDescription
logo
favicon
footerText
copyright
icpNumber
themeConfig
socialLinks
contactConfig
createdAt
updatedAt
```

JSON 字段必须在服务端校验结构。

## 4. 产品分类 ProductCategory

数据库表：

```text
portal_product_categories
```

字段至少包含：

```text
id
parentId
name
slug
summary
description
coverImage
icon
sortOrder
status
seoTitle
seoKeywords
seoDescription
createdAt
updatedAt
```

要求：

* 支持一级和二级分类。
* `slug` 唯一。
* 支持启用、停用。
* 支持排序。
* 删除分类前必须检查是否存在产品或子分类。
* 不允许形成循环父子关系。

## 5. 产品 Product

数据库表：

```text
portal_products
```

字段至少包含：

```text
id
categoryId
name
slug
model
subtitle
summary
description
coverImage
videoUrl
features
applications
specifications
sortOrder
isFeatured
status
viewCount
seoTitle
seoKeywords
seoDescription
publishedAt
createdAt
updatedAt
```

要求：

* `slug` 唯一。
* `status` 支持 `DRAFT`、`PUBLISHED`、`DISABLED`。
* `features` 使用经过验证的 JSON 数组。
* `applications` 使用经过验证的 JSON 数组。
* `specifications` 使用以下结构的 JSON 数组：

```json
[
  {
    "group": "基础参数",
    "items": [
      {
        "label": "材质",
        "value": "示例材质"
      },
      {
        "label": "尺寸",
        "value": "示例尺寸"
      }
    ]
  }
]
```

* 支持封面图。
* 支持多张产品详情图。
* 支持产品推荐。
* 支持分类筛选。
* 支持关键字搜索。
* 支持排序和分页。
* 支持相关产品推荐。
* 前台只展示 `PUBLISHED` 产品。
* 产品详情访问时安全增加浏览量，不能因为 SSR 重复渲染无限增加。

## 6. 产品图片 ProductImage

数据库表：

```text
portal_product_images
```

字段至少包含：

```text
id
productId
mediaId
imageUrl
altText
sortOrder
createdAt
```

要求：

* 一个产品支持多图。
* 后台支持上传、删除和排序。
* 数据库删除记录时，不能误删仍被其他内容引用的物理文件。

## 7. 合作伙伴 Partner

数据库表：

```text
portal_partners
```

字段至少包含：

```text
id
name
slug
logo
coverImage
summary
description
website
cooperationType
sortOrder
isFeatured
status
seoTitle
seoDescription
createdAt
updatedAt
```

前台支持：

* 首页合作伙伴 Logo 墙。
* 合作伙伴独立列表页。
* 可选合作伙伴详情页。
* 外部网站链接必须正确添加安全属性。

## 8. 服务项目 ServiceItem

数据库表：

```text
portal_service_items
```

字段至少包含：

```text
id
name
slug
icon
coverImage
summary
description
features
processSteps
sortOrder
isFeatured
status
seoTitle
seoDescription
createdAt
updatedAt
```

用于展示公司主营业务和服务能力。

## 9. 首页轮播 Banner

数据库表：

```text
portal_banners
```

字段至少包含：

```text
id
title
subtitle
image
mobileImage
buttonText
buttonLink
position
sortOrder
status
startAt
endAt
createdAt
updatedAt
```

要求：

* 支持 PC 图和移动端图。
* 支持启用时间和结束时间。
* 前台只显示当前有效 Banner。

## 10. 新闻文章 Article

数据库表：

```text
portal_articles
```

字段至少包含：

```text
id
title
slug
summary
content
coverImage
author
status
isFeatured
sortOrder
seoTitle
seoKeywords
seoDescription
publishedAt
createdAt
updatedAt
```

虽然网站以产品展示为主，但保留新闻资讯模块，用于发布公司动态、行业资讯和 SEO 内容。

## 11. 咨询留言 ContactMessage

数据库表：

```text
portal_contact_messages
```

字段至少包含：

```text
id
name
company
phone
email
subject
message
sourcePage
productId
ipAddress
userAgent
status
adminRemark
createdAt
updatedAt
```

状态支持：

```text
NEW
PROCESSING
RESOLVED
SPAM
```

要求：

* 前台无需登录即可提交。
* 必须有服务端校验。
* 必须限制提交频率。
* 防止明显垃圾内容。
* IP 和 User-Agent 仅供安全审计。
* 后台可查看、标记状态和填写处理备注。
* 不提供公开查询留言接口。

## 12. 媒体文件 MediaFile

数据库表：

```text
portal_media_files
```

字段至少包含：

```text
id
originalName
storedName
relativePath
url
mimeType
extension
size
width
height
checksum
category
createdBy
createdAt
```

要求：

* 保存上传文件元数据。
* 用 checksum 辅助识别重复文件。
* 支持图片库选择。
* 支持查看引用情况。
* 删除前检查文件是否仍被产品、合作伙伴、公司信息、Banner 等模块引用。

## 13. 操作日志 AuditLog

数据库表：

```text
portal_audit_logs
```

字段至少包含：

```text
id
adminUserId
module
action
targetType
targetId
summary
ipAddress
userAgent
createdAt
```

记录：

* 登录
* 退出
* 新增
* 修改
* 删除
* 发布
* 停用
* 上传
* 删除文件
* 修改管理员

不得把密码、Session、数据库连接等敏感数据写入日志。

---

# 六、本地文件存储

禁止把运行时上传文件写入 `public` 源码目录。

使用：

```text
storage/uploads/YYYY/MM/DD/
```

上传文件名称规则：

```text
UUID或安全随机字符串 + 正确扩展名
```

禁止直接使用用户上传的原始文件名作为磁盘文件名。

## 上传限制

默认允许：

```text
image/jpeg
image/png
image/webp
image/gif
application/pdf
```

要求：

1. 图片默认最大 10 MB。
2. PDF 默认最大 20 MB。
3. 不只检查扩展名，还要检查 MIME 和文件签名。
4. 拒绝可执行文件、脚本和压缩包。
5. 默认拒绝 SVG，防止脚本注入。
6. 防止目录穿越。
7. 防止覆盖已有文件。
8. 文件访问路径不能直接接受任意磁盘路径。
9. 上传接口仅允许登录管理员访问。
10. 联系表单不允许上传文件，除非以后单独实现。

## 图片处理

使用 Sharp：

* 保留合理质量的原始版本。
* 自动纠正 EXIF 方向。
* 删除不必要的 EXIF 信息。
* 生成 WebP 优化版本。
* 生成缩略图。
* 避免放大原本较小的图片。
* 建议生成宽度：

  * 480px
  * 960px
  * 1600px
* Logo 和透明 PNG 要保留透明通道。
* GIF 不强制转码，避免破坏动画。

## 文件访问

创建安全的服务端路由：

```text
/uploads/**
```

要求：

* 将 URL 安全映射到 `storage/uploads`。
* 使用规范化路径并验证目标路径仍位于上传目录中。
* 正确设置 Content-Type。
* 图片配置合理缓存头。
* 后台删除文件时同步删除衍生缩略图。
* 如果数据库记录仍被引用，禁止删除物理文件。

---

# 七、登录和权限

后台必须使用真实登录鉴权。

## 登录要求

* 路径：`/admin/login`
* 用户名和密码登录。
* 密码安全哈希。
* 使用 HttpOnly Cookie Session。
* 生产环境 Cookie 使用 Secure。
* SameSite 至少使用 Lax。
* Session 设置合理有效期。
* 登录成功后更新最后登录时间和 IP。
* 登录失败不要泄露用户名是否存在。
* 连续失败必须限流。
* 登录页面不得出现在搜索引擎索引中。
* 登录成功跳转 `/admin`。
* 已登录用户访问登录页时跳转后台首页。
* 退出后清理 Session。

## 权限要求

创建服务端统一鉴权工具，例如：

```text
requireAdminSession(event)
requireRole(event, roles)
```

不得只依靠前端路由中间件保护后台。

所有 `/api/admin/**` 接口必须在服务端验证身份。

普通编辑员：

* 可管理产品、分类、合作伙伴、服务、Banner、文章和留言。
* 不可修改超级管理员。
* 不可查看数据库连接信息。
* 不可修改系统安全密钥。

超级管理员：

* 拥有全部后台权限。
* 可新增和停用编辑员。
* 不能删除当前正在登录的超级管理员账号。

---

# 八、前台官网页面

保留当前 Landing 项目优秀的视觉风格，但将内容改成真实商贸公司门户。

整体风格要求：

* 高端
* 现代
* 商务
* 科技感适度
* 大气但不过度花哨
* 版式干净
* 信息层级清晰
* 产品图片优先
* 动画克制
* 不做廉价霓虹灯效果
* 不做满屏粒子特效
* 不做影响性能的重型 3D
* 不要像传统 CMS 模板
* 不要像后台管理系统套在官网外面

支持：

* 桌面端
* 平板
* 手机端
* 明暗主题在不破坏品牌效果的前提下保留
* 中文内容排版
* 后续扩展英文内容的结构

## 1. 首页 `/`

首页至少包含：

1. 顶部导航
2. Hero 主视觉
3. 公司核心介绍
4. 核心服务
5. 产品分类
6. 推荐产品
7. 公司优势
8. 合作流程
9. 合作伙伴 Logo 墙
10. 公司动态
11. 咨询行动区
12. 联系方式
13. 页脚

Hero 内容必须来自后台公司信息或 Banner 数据。

推荐产品来自：

```text
status = PUBLISHED
isFeatured = true
```

合作伙伴来自：

```text
status = ENABLED
isFeatured = true
```

## 2. 产品中心 `/products`

功能：

* 产品分类导航。
* 二级分类支持。
* 关键词搜索。
* 分类筛选。
* 分页。
* 排序。
* 产品卡片。
* 空结果状态。
* 加载状态。
* 错误状态。
* URL 查询参数应反映筛选条件。
* 页面刷新后筛选条件不能丢失。
* 使用 SSR 获取首屏数据。

产品卡片展示：

* 封面图
* 产品名称
* 型号
* 摘要
* 分类
* 查看详情按钮

不显示：

* 价格
* 库存
* 购买按钮
* 加入购物车

## 3. 产品详情 `/products/[slug]`

至少包含：

* 面包屑
* 产品图片画廊
* 产品名称
* 型号
* 摘要
* 产品特点
* 应用场景
* 产品参数表
* 富文本详情
* 相关产品
* 产品咨询按钮
* SEO 信息
* 分享链接
* 404 处理

咨询按钮打开表单时，自动关联当前产品。

## 4. 公司介绍 `/about`

内容来自 CompanyProfile，包括：

* 公司简介
* 企业定位
* 业务范围
* 核心优势
* 发展理念
* 联系信息
* 公司图片

## 5. 服务项目 `/services`

展示：

* 服务列表
* 服务详情
* 服务流程
* 服务优势
* 联系咨询入口

详情路径：

```text
/services/[slug]
```

## 6. 合作伙伴 `/partners`

展示：

* 合作伙伴 Logo
* 合作类型
* 简介
* 官网链接
* 可选详情页

## 7. 新闻资讯 `/news`

支持：

* 新闻列表
* 分页
* 文章详情
* 推荐文章
* 发布时间
* SEO

详情路径：

```text
/news/[slug]
```

## 8. 联系我们 `/contact`

包含：

* 公司地址
* 电话
* 邮箱
* 工作时间
* 地图位置占位区域
* 联系表单
* 提交成功反馈
* 表单错误提示
* 防止重复提交

---

# 九、管理后台

后台路径统一使用：

```text
/admin/**
```

使用 Nuxt UI Dashboard 组件和当前项目视觉变量，做成真正可用的现代化后台。

后台整体要求：

* 左侧可折叠菜单
* 顶部导航
* 面包屑
* 桌面端和移动端适配
* 明暗主题
* 全局消息提示
* 加载状态
* 空状态
* 错误状态
* 删除确认
* 未保存离开提醒
* 表单验证
* 分页
* 搜索
* 筛选
* 排序
* 批量状态操作仅在安全的情况下提供

## 后台菜单

```text
控制台
内容管理
├── 公司信息
├── 首页轮播
├── 服务项目
├── 新闻资讯

产品管理
├── 产品分类
├── 产品列表

合作伙伴
媒体库
咨询留言
网站设置
管理员管理
操作日志
退出登录
```

## 1. 控制台 `/admin`

显示：

* 产品总数
* 已发布产品数
* 产品分类数
* 合作伙伴数
* 未处理留言数
* 文章数
* 媒体文件数
* 最近留言
* 最近修改内容
* 最近登录记录
* 快速操作入口

不需要复杂 BI 图表，更不要为了显得专业画几张没有意义的折线图。

## 2. 产品分类管理

支持：

* 树形列表
* 新增
* 编辑
* 启停
* 排序
* SEO
* 封面上传
* 删除安全检查

## 3. 产品管理

支持：

* 产品列表
* 关键词搜索
* 分类筛选
* 状态筛选
* 推荐筛选
* 新增
* 编辑
* 草稿
* 发布
* 停用
* 删除
* 复制产品
* 封面上传
* 多图上传
* 图片排序
* 参数分组编辑
* 特点列表编辑
* 应用场景编辑
* 富文本编辑
* SEO 编辑
* 前台预览

产品编辑页面按区域组织：

```text
基础信息
产品媒体
产品特点
应用场景
规格参数
详细介绍
发布设置
SEO 设置
```

规格参数编辑器必须可以动态：

* 添加参数分组
* 删除参数分组
* 修改分组名称
* 添加参数
* 删除参数
* 调整参数顺序

不要要求管理员手写 JSON。

## 4. 合作伙伴管理

支持：

* Logo 上传
* 封面上传
* 名称
* 合作类型
* 简介
* 详细介绍
* 官网地址
* 排序
* 推荐
* 启停
* SEO

## 5. 服务项目管理

支持：

* 图标
* 封面
* 标题
* 摘要
* 富文本介绍
* 服务特点
* 流程步骤
* 排序
* 推荐
* 启停
* SEO

流程步骤使用可视化动态列表维护，不要求手写 JSON。

## 6. Banner 管理

支持：

* PC 图片
* 移动端图片
* 标题
* 副标题
* 按钮
* 链接
* 排序
* 有效时间
* 启停
* 前台预览

## 7. 文章管理

支持：

* 标题
* Slug
* 摘要
* 封面
* 富文本
* 草稿
* 发布
* 推荐
* 发布时间
* SEO

## 8. 媒体库

支持：

* 图片网格
* 文件列表
* 上传
* 搜索
* 类型筛选
* 分页
* 复制 URL
* 预览
* 查看尺寸和大小
* 查看上传时间
* 查看引用情况
* 安全删除

## 9. 留言管理

支持：

* 列表
* 搜索
* 状态筛选
* 查看详情
* 关联产品
* 修改处理状态
* 管理员备注
* 标记垃圾信息
* 删除功能仅超级管理员可用

## 10. 网站设置

支持维护：

* 网站名称
* Logo
* Favicon
* 默认 SEO
* 页脚信息
* 联系方式
* 社交媒体
* 版权信息
* ICP 信息
* 网站主题基础配置

不要开放任意 JavaScript 注入字段。

## 11. 管理员管理

支持：

* 新增编辑员
* 修改显示名称
* 修改邮箱
* 重置密码
* 启用或停用
* 查看最近登录
* 角色调整
* 当前管理员修改自己的密码

---

# 十、API 设计

统一返回结构：

成功：

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

失败：

```json
{
  "success": false,
  "data": null,
  "message": "错误说明",
  "code": "VALIDATION_ERROR"
}
```

开发环境可以记录详细错误。

生产环境不得向客户端暴露：

* SQL
* 数据库结构
* 文件绝对路径
* 调用堆栈
* Session 内容
* 密钥
* Prisma 内部异常详情

## 公开 API

至少创建：

```text
GET  /api/public/site
GET  /api/public/home
GET  /api/public/company
GET  /api/public/categories
GET  /api/public/products
GET  /api/public/products/:slug
GET  /api/public/services
GET  /api/public/services/:slug
GET  /api/public/partners
GET  /api/public/articles
GET  /api/public/articles/:slug
POST /api/public/contact
```

## 登录 API

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
POST /api/auth/change-password
```

## 后台 API

按 REST 风格创建：

```text
/api/admin/products
/api/admin/categories
/api/admin/partners
/api/admin/services
/api/admin/banners
/api/admin/articles
/api/admin/company
/api/admin/site-settings
/api/admin/media
/api/admin/messages
/api/admin/users
/api/admin/audit-logs
/api/admin/dashboard
```

所有写操作进行：

* 身份验证
* 权限验证
* Zod 验证
* 审计日志记录
* 安全错误处理

分页接口统一参数：

```text
page
pageSize
keyword
status
sortBy
sortOrder
```

限制 `pageSize` 最大值，禁止一次请求读取无限数据。

排序字段必须使用白名单，不得直接把客户端字段拼入 SQL。

---

# 十一、输入验证和安全

必须处理：

* SQL 注入
* XSS
* CSRF
* 路径穿越
* 任意文件上传
* 越权访问
* 重复提交
* 暴力登录
* 超大请求
* 恶意分页参数
* 非法排序字段
* 无效 Slug
* JSON 字段结构异常
* 富文本危险标签
* 外部链接注入

具体要求：

1. 数据库操作使用 Prisma 参数化查询。
2. 所有 API 输入使用 Zod。
3. 富文本在保存或输出前进行白名单清理。
4. 外部链接只允许 `http` 和 `https`。
5. 不允许 `javascript:` 链接。
6. 所有管理接口必须服务端鉴权。
7. 写接口验证 Origin 或采用可靠 CSRF 防护。
8. 登录接口增加 IP 和用户名维度限流。
9. 联系表单增加 IP 限流和简单防机器人字段。
10. 上传接口限制 Content-Length。
11. 返回的文件 URL 必须是相对 URL 或受控站点 URL。
12. 管理后台不得渲染未清理的 HTML。
13. Slug 只允许安全字符。
14. 所有删除接口必须验证目标存在及关联关系。
15. 使用软删除还是物理删除应按数据类型合理选择，不要给所有表机械增加无用字段。

---

# 十二、SEO

官网必须支持 SSR 和完整 SEO。

实现：

* 页面标题
* Meta Description
* Meta Keywords
* Canonical URL
* Open Graph
* Twitter Card
* Favicon
* robots.txt
* sitemap.xml
* 404 页面
* 结构化数据
* 中文语言标识
* 图片 alt
* 产品详情动态 SEO
* 新闻详情动态 SEO
* 分类页面动态 SEO

结构化数据至少包括：

* Organization
* WebSite
* BreadcrumbList
* Product 或适合展示型产品的 Schema
* Article

展示型产品没有在线价格时，不要伪造价格、库存和 Offer。

后台页面全部设置：

```text
noindex
nofollow
```

上传文件管理页和 API 不进入 sitemap。

---

# 十三、性能要求

1. 首页和详情页使用 SSR。
2. 图片使用响应式尺寸。
3. 首屏 Hero 图片合理预加载。
4. 非首屏图片懒加载。
5. 对数据库公共查询进行合理缓存，但后台保存后必须能失效。
6. 避免 N+1 查询。
7. 产品列表只查询页面所需字段。
8. 后台大列表使用服务端分页。
9. 不要把整张高分辨率图片直接作为缩略图。
10. 动画尊重 `prefers-reduced-motion`。
11. 避免引入体积巨大的无用依赖。
12. 不要为了一个小功能引入整套组件库。
13. 使用 Nuxt UI 作为主要 UI 体系，不混入另一套重量级 UI 框架。

---

# 十四、初始化数据

创建安全的 seed 脚本。

Seed 内容包括：

* 一个超级管理员
* 公司基础信息
* 网站基础设置
* 3 个产品分类
* 6 个示例产品
* 4 个服务项目
* 6 个合作伙伴
* 3 个 Banner
* 3 篇示例文章

要求：

* 示例数据明确标记为演示内容。
* 产品图片使用项目内统一的占位图或可商用占位资源。
* 不要未经许可抓取品牌 Logo 和商品图片。
* Seed 可重复执行，不能重复插入相同数据。
* 管理员密码从环境变量读取。
* 不在 seed 文件中硬编码密码。

---

# 十五、备份和恢复

项目不再维护仓库内置的备份与恢复脚本。生产环境的 MySQL 和 `storage/uploads` 由部署平台或独立运维流程统一备份、校验和恢复。

---

# 十六、开发脚本

完善 `package.json`，至少提供：

```json
{
  "scripts": {
    "dev": "启动开发服务",
    "build": "构建生产版本",
    "preview": "预览生产版本",
    "lint": "执行 ESLint",
    "typecheck": "执行 TypeScript 检查",
    "db:generate": "生成 Prisma Client",
    "db:migrate": "执行开发迁移",
    "db:deploy": "执行生产迁移",
    "db:seed": "初始化数据",
    "db:studio": "打开 Prisma Studio",
    "check": "依次执行 lint、typecheck 和 build"
  }
}
```

使用真实可执行命令替换描述文字。

如果当前项目已有同名脚本，合理合并，不要破坏现有脚本。

---

# 十七、README

创建完整的：

```text
README.zh-CN.md
```

内容必须包含：

1. 项目介绍
2. 功能列表
3. 技术栈
4. 目录结构
5. 环境要求
6. 安装依赖
7. 创建 `.env`
8. 数据库初始化
9. Prisma 命令
10. 启动开发环境
11. 后台登录地址
12. 创建或重置管理员
13. 文件存储说明
14. 数据备份
15. 数据恢复
16. 生产构建
17. Windows 部署注意事项
18. Nginx 反向代理示例
19. 上传目录权限
20. 常见问题
21. 安全注意事项
22. 更换数据库密码和初始管理员密码提醒

不得把真实密码写进 README。

---

# 十八、代码质量

必须做到：

* 无明显 `any`
* 无未处理 Promise
* 无无效 import
* 无大量复制粘贴
* API 逻辑与页面逻辑分离
* 数据库访问集中管理
* 错误响应统一
* 权限判断统一
* 文件处理统一
* 类型定义统一
* 表单验证统一
* 组件不过度臃肿
* 页面拆分合理
* 命名清晰
* 中文后台界面
* 关键复杂逻辑有简洁注释
* 不写大段没有价值的注释
* 不保留废弃演示组件
* 不保留无用依赖
* 不提交 `.env`
* 不提交上传文件
* 不提交数据库备份

---

# 十九、测试要求

至少实现并执行以下测试。

## 单元或集成测试

覆盖：

* 登录成功
* 登录失败
* 未登录访问后台 API
* 编辑员越权
* 产品创建
* 产品修改
* 产品发布
* 分类删除保护
* 文件类型拒绝
* 超大文件拒绝
* 路径穿越拒绝
* 联系表单校验
* 联系表单限流
* 公共产品接口只返回已发布产品

## 手工或自动端到端检查

验证：

1. 首页可以打开。
2. 产品列表可以打开。
3. 产品详情可以打开。
4. 分类筛选有效。
5. 搜索有效。
6. 后台可以登录。
7. 后台可以创建产品。
8. 后台可以上传产品图片。
9. 保存后前台能看到产品。
10. 后台可以修改合作伙伴。
11. 首页合作伙伴区域自动更新。
12. 留言可以提交。
13. 后台可以查看留言。
14. 未登录访问后台会跳转登录。
15. 手机端布局正常。
16. 刷新动态路由不会 404。
17. 上传文件重启项目后仍然存在。
18. `pnpm lint` 通过。
19. `pnpm typecheck` 通过。
20. `pnpm build` 通过。

---

# 二十、实施顺序

严格按照下面阶段推进。

## 阶段一：检查与规划

* 检查当前仓库。
* 记录当前技术版本。
* 识别可以复用的 Landing 组件。
* 创建简短的 `IMPLEMENTATION_PLAN.md`。
* 不要只停留在计划，立即继续开发。

## 阶段二：基础设施

* 安装依赖。
* 配置 `.env`。
* 配置 runtimeConfig。
* 配置 Prisma。
* 检查数据库现有表。
* 创建安全数据库结构。
* 创建 seed。
* 初始化管理员。

## 阶段三：服务端

* Prisma Client。
* 统一响应。
* Zod 验证。
* 登录和 Session。
* 权限控制。
* 公共 API。
* 后台 CRUD API。
* 上传和文件访问。
* 审计日志。
* 限流和安全处理。

## 阶段四：管理后台

* 登录页。
* 后台布局。
* 控制台。
* 公司信息。
* 产品分类。
* 产品管理。
* 合作伙伴。
* 服务项目。
* Banner。
* 新闻。
* 媒体库。
* 留言。
* 网站设置。
* 管理员。
* 操作日志。

## 阶段五：官网

* 首页。
* 产品列表。
* 产品详情。
* 公司介绍。
* 服务列表和详情。
* 合作伙伴。
* 新闻列表和详情。
* 联系我们。
* 动态 SEO。
* 响应式适配。

## 阶段六：测试和交付

* 执行数据库初始化。
* 执行 seed。
* 执行 lint。
* 执行 typecheck。
* 执行测试。
* 执行 build。
* 修复所有阻断问题。
* 创建 README。
* 创建备份脚本。
* 输出最终报告。

---

# 二十一、验收标准

只有同时满足以下条件，任务才算完成：

1. 项目可以使用一个命令启动。
2. MySQL 数据库连接成功。
3. 所有项目表已创建。
4. 初始管理员可登录。
5. 后台可以维护公司信息。
6. 后台可以维护产品分类。
7. 后台可以新增和编辑产品。
8. 产品支持封面和多图。
9. 产品支持规格参数。
10. 后台可以维护合作伙伴。
11. 后台可以维护服务项目。
12. 后台可以维护 Banner。
13. 后台可以查看留言。
14. 本地文件可以上传和访问。
15. 上传文件保存于 `storage/uploads`。
16. 前台从数据库获取数据。
17. 后台保存后前台正确更新。
18. 官网具有现代、高端、响应式设计。
19. 不存在购物车、订单和支付代码。
20. 未登录无法访问后台管理接口。
21. 数据库密码未进入前端代码。
22. `.env` 未被 Git 跟踪。
23. 不破坏数据库已有非本项目表。
24. lint 通过。
25. typecheck 通过。
26. build 通过。
27. README 完整。
28. 备份脚本可以执行。
29. 无明显安全漏洞。
30. 无关键功能使用静态假数据代替。

---

# 二十二、最终输出要求

完成后，不要只回复“已完成”。

请输出结构化最终报告：

```text
1. 实际使用的技术版本
2. 新增和修改的主要目录
3. 数据库迁移结果
4. 创建的数据表
5. 官网访问地址
6. 后台登录地址
7. 初始管理员用户名
8. 初始管理员密码
9. 文件上传目录
10. 已实现功能
11. 测试结果
12. lint 结果
13. typecheck 结果
14. build 结果
15. 尚未完成的内容
16. 已知限制
17. 正式部署前必须修改的安全配置
18. 常用启动和维护命令
```

如果某一项未完成，必须明确说明，不得假装完成。

现在开始检查当前仓库并直接实施。不要重新生成一个与当前 Landing 无关的新项目，不要只输出代码片段，不要只写开发建议。
