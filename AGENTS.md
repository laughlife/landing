# AGENTS.md

本文档是本仓库的协作规则。它适用于 `D:\workspace\webstorm\landing` 这个 Nuxt 落地页项目，不沿用其它后端、调度或数据连接项目的规则。

## 0. 项目定位

- 本项目是 Nuxt 4 / Vue 3 落地页，主要技术栈包括 Nuxt UI、Nuxt Content、VueUse、motion-v、Tailwind CSS 4 和 TypeScript。
- 页面内容主要来自 `content/index.yml`，字段结构由 `content.config.ts` 约束。
- 页面入口在 `app/pages/index.vue`，全局壳层在 `app/app.vue`，通用头部、页脚、Logo 等组件在 `app/components/`。
- 静态资源放在 `public/`，全局样式放在 `app/assets/css/main.css`。
- 包管理器固定使用 `pnpm`，不要混用 `npm`、`yarn` 或生成其它 lock 文件。

## 1. 开始任务前

- 先用 `git status --short` 查看工作区，识别用户已有改动。
- 修改前先定位真实来源：文案优先查 `content/index.yml`，结构和交互查 `app/pages/` 与 `app/components/`，样式查组件内 `:ui` 配置和 `app/assets/css/main.css`。
- 如果发现已有无关改动，只保留并绕开；不要回滚、格式化或顺手整理用户没有要求的文件。
- 只在任务范围不清、不同选择会明显改变结果时询问用户；普通文案、样式、组件小改动可直接按现有项目风格处理。

## 2. 修改原则

- 做最小可用修改，不为单次需求添加多余抽象、配置项或新依赖。
- 优先复用 Nuxt UI 组件和当前项目已有的 `:ui` 配置风格。
- Vue 组件默认使用 Vue 3 Composition API、`<script setup lang="ts">` 和 TypeScript。
- 需要派生状态时优先使用 `computed`；避免在模板里写有副作用的函数。
- 不在 SSR 路径中直接访问 `window`、`document`、`localStorage` 等浏览器专属对象；确实需要时放到客户端限定逻辑里。
- 不随意改 `content.config.ts` schema。只有新增内容字段且页面确实要消费时，才同步更新 schema。
- 不随意替换全局配色、字体、布局节奏或动画库；视觉调整要贴合当前暗色、Nuxt UI、轻量动效的整体风格。
- 新增图片、字体等资源时放入 `public/`，并确认引用路径从站点根路径开始，例如 `/wuyue.png`。

## 3. 内容与 SEO

- 浏览器标题和分享标题优先来自 `content/index.yml` 的 `seo.title`。
- 页面描述和分享描述优先来自 `content/index.yml` 的 `seo.description`。
- 首页可见文案优先在 `content/index.yml` 修改；只有导航、页脚、Logo 或组件结构文案才改 `app/components/` 或 `app/pages/`。
- 中文品牌、企业名称、备案类或版权类文案应保持用户给出的原文，不自行简化、翻译或替换标点。
- 改动 SEO、图片或 favicon 后，应搜索旧文案或旧资源路径，确认页面相关文件中不再残留误用。

## 4. 样式与前端体验

- 遵循 `.editorconfig`：2 空格缩进、LF、UTF-8、文件末尾换行。
- Tailwind 类名优先保持现有写法；避免拼接不可静态分析的动态类名。
- 按钮、图标、链接优先使用 Nuxt UI / Iconify 已有能力，不手写重复 SVG。
- 移动端和桌面端都要考虑文本换行、按钮宽度、图片裁切和视觉层级。
- 不添加与落地页主题无关的装饰、复杂交互或重型依赖。

## 5. 验证方式

- 小范围文案或配置修改：至少用 `rg` 搜索旧值和新值，并查看对应 diff。
- Vue/Nuxt 代码修改：优先运行 `pnpm lint` 和 `pnpm typecheck`；结构或构建相关改动再运行 `pnpm build`。
- 视觉或响应式改动：可启动 `pnpm dev`，在浏览器中检查关键视口；如果未能运行，应在最终回复说明原因。
- 依赖未安装时，先说明需要 `pnpm install`；不要自动改用其它包管理器。

## 6. 提交与交付

- 每次完成文件修改后，默认只对本次任务相关文件执行 `git add` 和 `git commit`；如果用户明确说不要提交，则跳过。
- 不自动 `git push`。只有用户明确要求推送时才执行。
- 不要 stage 或 commit 用户已有的无关改动、未确认删除、生成缓存或依赖安装副产物。
- 最终回复说明本次修改的文件、核心变化和验证结果。
- 如果没有运行某项验证，要明确说明没有运行及原因。
- 不把用户原本已有的无关改动算作自己的修改成果。
