# 01 · 整体架构

## 1. 设计目标

项目要解决三件事：

1. **跨平台插件聚合搜索**：把 Spigot、Hangar、Modrinth 三个结构完全不同的 API 统一成 `PluginBase`。
2. **内置知识库**：把开服教程打包进应用，支持离线阅读、全文检索和 AI 问答。
3. **两套交付形态**：同一份前端代码既可部署为纯静态网站，也可由 Tauri 打包为桌面应用，并在桌面端扩展本地文件读取能力。

架构因此呈现为 **纯前端 SPA + 桌面 Shell**：没有自建后端、没有数据库，所有状态在浏览器 `localStorage`，所有外部请求由前端直接发起（Web 生产环境通过 CORS 代理中转）。这带来了部署简单、零服务成本的优点，也带来密钥暴露、跨域、限流等约束。

## 2. 三种运行形态

| 形态 | 启动方式 | 插件 API 访问方式 | 文件系统能力 | AI 调用 |
| --- | --- | --- | --- | --- |
| Web 开发 | `npm run dev` | Vite 代理 `/api/spiget`、`/api/hangar`、`/api/modrinth` | 无（浏览器 File API） | 浏览器直连模型服务 |
| Web 生产 | `npm run build` + 静态托管 | `corsProxy + encodeURIComponent(真实 URL)`，默认 `https://api.allorigins.win/raw?url=` | 无 | 浏览器直连（受模型服务 CORS 策略影响） |
| Tauri 桌面 | `npm run tauri dev` / `npx tauri build` | 直接请求 `https://api.spiget.org/v2` 等真实地址 | `plugin-fs` 读写、`plugin-dialog` 选择目录、`plugin-shell` 兜底 | WebView 内直连 |

环境判定逻辑集中在 [api-base.ts](../../src/services/api-base.ts#L5-L38)：`isTauri()` 检测 `window.__TAURI__`，`import.meta.env.DEV` 区分开发/生产。`GuidePage` 另有更宽松的检测（`__TAURI__` 或 `__TAURI_INTERNALS__`），见 [GuidePage.tsx](../../src/pages/GuidePage.tsx#L10-L11)。

## 3. 分层架构

```mermaid
flowchart TB
    subgraph Shell["运行外壳"]
        Browser["浏览器 / WebView"]
        Tauri["Tauri 2 Rust Core<br/>shell / dialog / fs"]
    end

    subgraph UI["表现层"]
        App["App.tsx<br/>HashRouter + 布局"]
        Header["Header"]
        Pages["7 个页面<br/>MainPage / PluginDetailPage / DocsPage / GuidePage<br/>SettingsPage / FavoritesPage / AuthorPage"]
        Components["7 个组件<br/>SearchBar / DocsSearch / AskAIPanel<br/>PluginCard / PlatformToggle / PlatformIcons"]
    end

    subgraph State["状态层"]
        Store["Zustand Store<br/>主题 / 平台 / 收藏 / AI 配置<br/>CORS 代理 / 缓存 / 搜索历史"]
        LS[("localStorage<br/>mc-plugin-market-*")]
    end

    subgraph Domain["领域服务层"]
        Search["search.ts<br/>聚合搜索"]
        Spiget["spiget.ts"]
        Hangar["hangar.ts"]
        Modrinth["modrinth.ts"]
        ApiBase["api-base.ts<br/>环境路由 + fetch 封装"]
        AI["ai.ts<br/>模型调用 / 并发控制 / 翻译 / 工具"]
        Docs["docs/*.md<br/>?raw + import.meta.glob"]
    end

    subgraph External["外部依赖"]
        SpigetAPI["api.spiget.org/v2"]
        HangarAPI["hangar.papermc.io/api/v1"]
        ModrinthAPI["api.modrinth.com/v2"]
        LLM["智谱 / OpenAI 兼容<br/>/chat/completions"]
        FS["本地服务器目录"]
    end

    Browser --> App
    App --> Header
    App --> Pages
    Pages --> Components
    Pages --> Store
    Components --> Store
    Components --> Search
    Components --> AI
    Pages --> Search
    Pages --> Spiget
    Pages --> Hangar
    Pages --> Modrinth
    Pages --> AI
    Pages --> Docs
    Search --> Store
    Search --> Spiget
    Search --> Hangar
    Search --> Modrinth
    Spiget --> ApiBase
    Hangar --> ApiBase
    Modrinth --> ApiBase
    AI --> Store
    Store --> LS
    ApiBase --> SpigetAPI
    ApiBase --> HangarAPI
    ApiBase --> ModrinthAPI
    AI --> LLM
    Tauri --> FS
    Pages -.->|"动态 import"| Tauri
```

### 3.1 表现层

- [App.tsx](../../src/App.tsx) 负责路由、暗色模式副作用、全局页头页脚。
- [pages/](../../src/pages) 承担页面级状态与业务流程编排。
- [components/](../../src/components) 提供可复用 UI，其中 `SearchBar`、`DocsSearch`、`AskAIPanel` 也包含较重的业务逻辑（AI Agent、检索评分、流式对话），这是当前架构的显著特征。

### 3.2 状态层

单例 Zustand Store 位于 [store/index.ts](../../src/store/index.ts)。所有需要跨页面共享、跨会话保留的数据都在这里：主题、启用的平台、收藏、AI 模型配置、角色分配、CORS 代理、插件缓存、搜索历史。Store 内部用 `loadFromStorage` / `saveToStorage` 做同步持久化，没有异步中间件。

### 3.3 领域服务层

- **平台适配器**（`services/spiget.ts`、`hangar.ts`、`modrinth.ts`）：各自理解上游 JSON 结构，输出统一 `PluginBase`。
- **聚合入口**（`services/search.ts`）：根据 Store 中启用的平台并发请求，吞掉单个平台错误，再按下载量排序。
- **网络基础设施**（`services/api-base.ts`）：决定 base URL、拼接 CORS 代理、统一错误抛出。
- **AI 子系统**（`services/ai.ts`）：角色选模型、并发限流、流式解析、翻译分段、工具调用。
- **静态内容**（`src/assets/docs/`）：Markdown 以 `?raw` 静态导入或 `import.meta.glob` 懒加载。

### 3.4 外壳层

- Web 端只有浏览器环境，无额外能力。
- Tauri 端由 [src-tauri](../../src-tauri) 提供 Rust 入口与插件能力；前端通过动态 `import()` 调用 `@tauri-apps/plugin-fs`、`plugin-shell`、`plugin-dialog`，因此 Web 构建不会因缺少 Tauri 环境而失败。

## 4. 核心数据流

### 4.1 插件搜索

```mermaid
sequenceDiagram
    participant U as 用户
    participant SB as SearchBar
    participant MP as MainPage
    participant SS as search.ts
    participant SP as spiget.ts
    participant HG as hangar.ts
    participant MR as modrinth.ts
    participant AF as api-base.ts
    participant API as 平台 API

    U->>SB: 输入关键词 / 回车
    SB->>MP: onSearch(query)
    MP->>MP: setSearchParams({q})
    MP->>SS: searchAll(q, page, 12)
    SS->>SP: searchSpiget(q, page, size)
    SS->>HG: searchHangar(q, page-1, size)
    SS->>MR: searchModrinth(q, (page-1)*size, size)
    SP->>AF: apiFetch('spigot', path)
    HG->>AF: apiFetch('hangar', path)
    MR->>AF: apiFetch('modrinth', path)
    AF->>API: fetch(环境对应 URL)
    API-->>AF: JSON
    AF-->>SP: JSON
    SP-->>SS: PluginBase[]
    HG-->>SS: PluginBase[]
    MR-->>SS: PluginBase[]
    SS-->>MP: 合并 + 按 downloads 降序
    MP->>U: PluginCard 网格渲染
```

关键点：

- 三个平台分页语义不同：Spigot 的 `page` 从 1 开始，Hangar/Modrinth 用 `offset`（从 0 开始），`searchAll` 内部做了换算。
- 任一平台失败不会影响整体：每个请求都带 `.catch(() => [])`。
- 搜索模式与“热门插件”模式共用 `plugins` 状态，见 [MainPage.tsx](../../src/pages/MainPage.tsx#L101-L159)。

### 4.2 插件详情

`PluginDetailPage` 先按 `platform` 分派到对应适配器，分别获取 **基础信息** 与 **完整描述**：

| 平台 | 详情函数 | 描述函数 | 描述格式 |
| --- | --- | --- | --- |
| spigot | `getSpigetResource(id)` | `getSpigetResourceDescription(id)` | Base64 解码后的 HTML |
| hangar | `getHangarProject(owner, slug)` | `getHangarProjectDescription(owner, slug)` | Markdown / HTML（pages 端点，多路径兜底） |
| modrinth | `getModrinthProject(idOrSlug)` | `getModrinthProjectDescription(idOrSlug)` | Markdown |

详情页用 `getCachedPlugin` 尝试命中 1 小时缓存，加载成功后 `cachePlugin` 写回。渲染时 Spigot 走 `dangerouslySetInnerHTML`，其余平台走 `ReactMarkdown`，见 [PluginDetailPage.tsx](../../src/pages/PluginDetailPage.tsx#L316-L350)。

### 4.3 AI 对话

```mermaid
sequenceDiagram
    participant UI as AskAIPanel / PluginDetailPage
    participant AI as ai.ts
    participant CL as ConcurrencyLimiter
    participant API as LLM API

    UI->>AI: chatCompletionStream(role, messages)
    AI->>AI: getModelForRole(role) + 校验 apiKey
    AI->>CL: acquire()
    CL->>CL: 检查 localStorage 全局计数
    alt 未超限
        CL-->>AI: 获得槽位
    else 超限
        CL-->>AI: throw ConcurrencyLimitError
    end
    AI->>API: POST /chat/completions (stream=true)
    API-->>AI: SSE chunk
    AI-->>UI: yield 文本增量
    UI->>UI: 追加到最后一条 assistant 消息
    AI->>CL: release()
```

### 4.4 文档检索与 AI 问答

- `DocsPage` 用静态 `import` 把文档字符串装入 `docsTree`，侧边栏递归渲染；点击文档调用 `findDocContent`。
- `DocsSearch` 普通模式在 `getAllDocsFlat(docsTree)` 上做子串匹配评分；AI 模式让模型输出 `search_docs` 工具调用，再按文档路径/索引映射到树节点。
- `AskAIPanel` 把当前文档全文塞进 system prompt，用 `chat` 角色流式回答，并支持点击 AI 回答中的标题滚动到文档对应锚点。
- `GuidePage` 的 `SimpleServerPreset` / `AgentPreset` 通过 `read_docs` 工具按需加载文档，避免把全部文档塞进上下文。

## 5. 目录结构

```text
pluginmarket/
├── index.html                  # SPA 入口（#root + main.tsx）
├── package.json                # 前端脚本与依赖
├── vite.config.ts              # React 插件、@ 别名、base './'、开发代理
├── tailwind.config.js          # 暗色 class 模式、MC 主题色、动画
├── postcss.config.js
├── tsconfig.json               # strict、bundler 解析、@/* 路径
├── public/
│   ├── favicon.svg
│   └── 404.html                # GitHub Pages 的 hash 保留兜底
├── src/
│   ├── main.tsx                # createRoot + StrictMode
│   ├── App.tsx                 # 路由与全局布局
│   ├── index.css               # 字体、Markdown、动画、亮/暗主题
│   ├── vite-env.d.ts
│   ├── types/index.ts          # 全部数据模型
│   ├── store/index.ts          # Zustand Store + localStorage
│   ├── services/
│   │   ├── api-base.ts         # 环境路由与 fetch 封装
│   │   ├── spiget.ts
│   │   ├── hangar.ts
│   │   ├── modrinth.ts
│   │   ├── search.ts           # 聚合搜索与格式化工具
│   │   └── ai.ts               # AI 调用、限流、翻译、工具类型
│   ├── pages/
│   │   ├── MainPage.tsx        # 首页 + 浏览页
│   │   ├── PluginDetailPage.tsx
│   │   ├── DocsPage.tsx
│   │   ├── GuidePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── FavoritesPage.tsx
│   │   └── AuthorPage.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── SearchBar.tsx
│   │   ├── DocsSearch.tsx
│   │   ├── AskAIPanel.tsx
│   │   ├── PluginCard.tsx
│   │   ├── PlatformToggle.tsx
│   │   └── PlatformIcons.tsx
│   └── assets/
│       ├── Minecraft-AE.ttf
│       └── docs/               # 72 篇开服手册 Markdown
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   ├── icons/
│   └── src/{main.rs, lib.rs}
└── .github/workflows/
    ├── deploy.yml              # main 分支部署 GitHub Pages
    └── release.yml             # v* 标签构建多平台 Release
```

## 6. 横切机制

| 机制 | 实现位置 | 作用 |
| --- | --- | --- |
| 环境自适应 | `api-base.ts`、`GuidePage.tsx` | 开发 / 生产 / Tauri 三套 API 路由 |
| CORS 兜底 | `api-base.ts#L41-L72` | 生产 Web 端用用户可配置代理 |
| 数据归一化 | 三个平台适配器 | 上游差异被隔离在服务层 |
| 本地持久化 | `store/index.ts#L6-L17` | 主题、收藏、AI 配置、缓存、历史 |
| 缓存降级 | `getCachedPlugin` | 缓存过期返回 `undefined`，调用方回源 |
| 错误隔离 | `searchAll` 的 `catch(() => [])` | 单平台失败不拖垮聚合结果 |
| 并发协调 | `ConcurrencyLimiter` | 同一模型跨标签页共享并发额度 |
| 静态内容打包 | `?raw`、`import.meta.glob` | 文档随构建产物离线可用 |
| 渐进式桌面能力 | 动态 `import()` Tauri 插件 | Web 端不引入、桌面端按需启用 |

## 7. 关键架构决策与权衡

1. **HashRouter + `base: './'`**：适配 GitHub Pages 子路径与 Tauri 本地 `file://`/自定义协议，避免 history 路由回退 404；代价是 URL 带 `#`，不利于 SEO。
2. **无后端**：部署零成本、隐私数据留在本地；代价是 API Key 暴露在前端、跨域依赖第三方代理、无法隐藏业务逻辑。
3. **适配器模式统一数据**：`PluginBase` 是 UI 的唯一输入契约，新增平台只需增加适配器与少量映射；代价是部分字段（评分、作者、分类）在不同平台语义不一致。
4. **AI 角色化配置**：允许“便宜模型做翻译、强模型做决策”，并支持 OpenAI 兼容服务；代价是配置复杂度和多模型并发协调。
5. **文档静态打包**：离线可用、搜索快；代价是包体随文档增长，新增文档需改多处索引（见 [08](08-docs-content.md)）。
6. **桌面能力只补充文件系统**：Tauri 层几乎没有业务代码，降低 Rust 维护成本；代价是前端直接持有权限与路径拼接逻辑，安全边界依赖 capabilities 配置。

## 8. 架构层面的已知约束

- 所有平台请求无超时/取消实现，弱网下可能长时间等待。
- 生产 Web 版依赖 `api.allorigins.win` 等第三方 CORS 代理的可用性与速率限制，用户可在设置页替换。
- Tauri capabilities 授予了宽泛的文件与 shell 权限，详见 [09](09-tauri-desktop.md#6-安全模型与风险)。
- 页面直接调用平台适配器的现象存在（`MainPage`、`PluginDetailPage`、`AuthorPage`），聚合入口未被所有场景复用。
- 项目没有自动化测试与 ESLint 配置，`npm run build` 的 `tsc -b` 是主要静态校验。

更完整的逐条问题清单见 [11 · 编码规范与已知问题](11-conventions-and-known-issues.md)。
