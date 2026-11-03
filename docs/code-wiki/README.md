# MC 插件市场 · Code Wiki

> 本 Wiki 面向开发者与维护者，系统性地说明 **MC 插件市场（minecraft-plugin-market）** 的架构、模块、关键实现、依赖关系与运行方式。文中的路径、函数名与行号均以当前仓库代码为准。

## 1. 项目是什么

MC 插件市场是一个 **Minecraft 插件聚合搜索 + 开服手册 + AI 助手** 的跨平台应用：

- 聚合 **SpigotMC（Spiget API）**、**Hangar（PaperMC）**、**Modrinth** 三个平台的插件搜索与详情。
- 内置 72 篇 Minecraft 开服文档，支持目录浏览、全文搜索、AI 问答与 AI 检索。
- 基于角色（决策 / 搜索 / 对话 / 翻译 / 视觉）调用大模型，提供 AI 搜索、插件描述翻译、截图理解、开服指导、服务器运维 Agent。
- 同时支持 **Web 在线版（GitHub Pages）** 与 **Tauri 2 桌面版（Windows / macOS / Linux）**。

项目核心配置见 [package.json](../../package.json)、[tauri.conf.json](../../src-tauri/tauri.conf.json)、[README.md](../../README.md)。

## 2. 技术栈

| 层次 | 技术 | 说明 |
| --- | --- | --- |
| UI | React 19 + TypeScript 5.7 | 函数式组件、Hooks、StrictMode |
| 构建 | Vite 6 + `@vitejs/plugin-react` | `base: './'`，适配 GitHub Pages |
| 样式 | Tailwind CSS 3.4 + 自定义 CSS | `darkMode: 'class'`，Minecraft 风格主题 |
| 路由 | React Router 7 | `HashRouter`，无需服务端路由 |
| 状态 | Zustand 5 | 单 Store + `localStorage` 持久化 |
| Markdown | react-markdown 9 + remark-gfm + rehype-raw | 代码高亮使用 react-syntax-highlighter |
| 图标 | lucide-react | 少量自绘 SVG（平台图标、Minecraft 方块） |
| 桌面 | Tauri 2（Rust） | Dialog / FS（只读）插件 |
| AI | OpenAI 兼容 Chat Completions | 智谱 GLM 默认，支持任意 OpenAI 兼容服务 |

## 3. 文档索引

| # | 文档 | 内容 |
| --- | --- | --- |
| 01 | [整体架构](01-architecture.md) | 运行形态、分层架构、数据流、目录结构、关键设计决策 |
| 02 | [模块与依赖关系](02-modules-and-dependencies.md) | 模块职责矩阵、依赖图、分层规则、第三方依赖清单 |
| 03 | [数据类型与状态管理](03-types-and-state.md) | `PluginBase` 等数据模型、Zustand Store、持久化键、默认 AI 模型 |
| 04 | [服务层与 API 适配](04-services-and-api.md) | 环境路由、CORS 代理、三个平台适配器、聚合搜索、扩展新平台 |
| 05 | [AI 子系统](05-ai-subsystem.md) | 模型角色、跨标签页并发控制、流式调用、翻译流水线、Tool Calling |
| 06 | [页面说明](06-pages.md) | 9 条路由与 7 个页面的状态、核心函数、交互与限制 |
| 07 | [组件说明](07-components.md) | Header、SearchBar、DocsSearch、AskAIPanel 等组件的 Props 与实现 |
| 08 | [文档内容系统](08-docs-content.md) | 72 篇 Markdown 的组织、加载、检索与新增文档流程 |
| 09 | [Tauri 桌面端](09-tauri-desktop.md) | Rust 入口、配置、权限能力、本地文件访问、安全边界 |
| 10 | [构建、运行与部署](10-build-run-deploy.md) | 本地开发、构建产物、CI/CD、发布流程、故障排查 |
| 11 | [编码规范与已知问题](11-conventions-and-known-issues.md) | 代码约定、扩展指南、技术债与安全注意事项 |
| 12 | [附录：函数与常量索引](12-appendix-function-index.md) | 关键类/函数/常量速查表（含文件与行号） |

## 4. 快速开始

环境要求：Node.js 20+、npm；桌面端另需 Rust stable 与 Tauri 系统依赖。

```bash
npm install          # 安装依赖
npm run dev          # Web 开发模式（Vite，默认 http://localhost:5173）
npm run tauri dev    # Tauri 桌面开发模式
npm run build        # 类型检查 + 前端构建（输出 dist/）
npm run lint         # ESLint
npm test             # Vitest 单元测试
npm run typecheck    # 仅类型检查
npx tauri build      # 构建桌面安装包
```

没有配置 AI API Key 时，插件搜索、文档浏览、收藏等核心功能仍可正常使用；AI 相关入口会显示配置提示。

## 5. 关键事实速览

| 项目 | 值 |
| --- | --- |
| 应用版本 | 1.0.2 |
| 前端源码规模 | `src/` 约 8,600 行 TS/TSX（不含文档与样式） |
| 内置文档 | `src/assets/docs/` 共 72 篇 Markdown，全部自动进入侧边栏与 AI 索引 |
| 质量工具 | ESLint flat config + Vitest（3 个测试文件 / 9 个用例） |
| 页面路由 | 9 条（`/`、`/browse`、`/docs`、`/guide`、`/plugin/:platform/:id`、`/plugin/:platform/:id/:subId`、`/favorites`、`/author/:platform/:authorId`、`/settings`） |
| 插件平台 | Spigot / Hangar / Modrinth |
| AI 角色 | decision / search / chat / translate / vision |
| 持久化 | `localStorage`（键前缀 `mc-plugin-market-`，模型配置为 AES-GCM 密文）+ IndexedDB 密钥库 |
| 桌面权限 | 只读 `fs`（限定 HOME/DOCUMENT/DESKTOP/DOWNLOAD）+ `dialog`；已移除 shell |
| 安全机制 | Spigot HTML 经 DOMPurify、Markdown 经 rehype-sanitize、API Key AES-GCM 加密存储、Tauri CSP |

## 6. 推荐阅读路径

- **新成员上手**：01 → 02 → 03 → 10，再按需阅读页面/组件章节。
- **改搜索或接入新平台**：04 → 03 → 06（MainPage）→ 11。
- **改 AI 能力**：05 → 03 → 06（GuidePage / PluginDetailPage）→ 11。
- **改文档或 AI 文档检索**：08 → 06（DocsPage）→ 07（DocsSearch / AskAIPanel）。
- **打包发布 / 权限问题**：09 → 10。

## 7. 文档维护约定

- 代码位置统一写成相对路径 + 行号，例如 `src/services/ai.ts#L155-L192`。
- 新增模块、页面、路由或文档目录时，同步更新 02、06、08、12 中的索引表。
- 修改 API 地址、AI 默认模型、Tauri 权限时，同步更新 04、05、09。

## 8. 许可证

项目采用 [GPL-3.0](../../LICENSE) 协议开源。
