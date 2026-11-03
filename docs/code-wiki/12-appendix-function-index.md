# 12 · 附录：函数与常量索引

> 行号为当前仓库版本（`1.0.2`）的近似位置，修改代码后请同步更新。链接格式：`文件#L起始-L结束`。

## 1. 应用入口与类型

| 名称 | 位置 | 签名 / 值 | 作用 |
| --- | --- | --- | --- |
| `App` | `src/App.tsx#L37-L60` | `() => JSX` | 根组件，HashRouter + Header + Routes + Footer |
| `AnimatedRoutes` | `src/App.tsx#L14-L35` | `() => JSX` | 路由表与页面过渡 |
| `Platform` | `src/types/index.ts#L2` | `'spigot' \| 'hangar' \| 'modrinth'` | 平台枚举 |
| `PluginBase` | `src/types/index.ts#L4-L21` | `interface` | 统一插件模型 |
| `SpigetResource` | `src/types/index.ts#L24-L50` | `interface` | Spiget 原始资源 |
| `SpigetCategory` | `src/types/index.ts#L52-L55` | `interface` | Spigot 分类 |
| `SpigetAuthor` | `src/types/index.ts#L57-L61` | `interface` | Spigot 作者 |
| `HangarProject` | `src/types/index.ts#L64-L75` | `interface` | Hangar 项目 |
| `HangarSearchResult` | `src/types/index.ts#L77-L80` | `interface` | Hangar 搜索结果 |
| `ModrinthProject` | `src/types/index.ts#L83-L104` | `interface` | Modrinth 项目详情 |
| `ModrinthSearchResult` | `src/types/index.ts#L106-L111` | `interface` | Modrinth 搜索结果 |
| `ModrinthSearchHit` | `src/types/index.ts#L113-L132` | `interface` | Modrinth 搜索命中 |
| `AIProvider` | `src/types/index.ts#L135` | `'zhipu' \| 'openai-compatible'` | 模型提供商 |
| `AIModelConfig` | `src/types/index.ts#L137-L147` | `interface` | 模型配置 |
| `AIRole` | `src/types/index.ts#L149` | `'search' \| 'translate' \| 'chat' \| 'vision' \| 'decision'` | AI 角色 |
| `AIRoleAssignment` | `src/types/index.ts#L151-L154` | `interface` | 角色→模型 |
| `ChatMessage` | `src/types/index.ts#L156-L159` | `interface` | 对话消息 |
| `ChatContentPart` | `src/types/index.ts#L161-L165` | `interface` | 多模态内容 |
| `AIStreamChunk` | `src/types/index.ts#L167-L169` | `interface` | 流式 chunk（未使用） |
| `Favorite` | `src/types/index.ts#L172-L175` | `interface` | 收藏快照 |
| `AppSettings` | `src/types/index.ts#L178-L183` | `interface` | 设置聚合（未使用） |
| `SearchFilters`（types） | `src/types/index.ts#L186-L192` | `interface` | 筛选（未使用） |

## 2. Store

| 名称 | 位置 | 签名 / 值 | 说明 |
| --- | --- | --- | --- |
| `STORAGE_KEY` | `src/store/index.ts#L4` | `'mc-plugin-market'` | localStorage 前缀 |
| `loadFromStorage` | `src/store/index.ts#L6-L13` | `<T>(key, fallback) => T` | 同步读取 |
| `saveToStorage` | `src/store/index.ts#L15-L17` | `(key, value) => void` | 同步写入 |
| `defaultModels` | `src/store/index.ts#L20-L76` | `AIModelConfig[]` | 5 个默认 GLM 模型 |
| `defaultRoleAssignments` | `src/store/index.ts#L78-L84` | `AIRoleAssignment[]` | 5 个角色默认分配 |
| `AppState` | `src/store/index.ts#L86-L123` | `interface` | Store 状态与 Action 类型 |
| `useAppStore` | `src/store/index.ts#L125-L222` | `create<AppState>(...)` | 全局 Store 实例 |

### 2.1 Store Action

| Action | 位置 | 签名 |
| --- | --- | --- |
| `toggleDarkMode` | `#L127-L136` | `() => void` |
| `togglePlatform` | `#L139-L144` | `(p: Platform) => void` |
| `addFavorite` | `#L147-L152` | `(plugin: PluginBase) => void` |
| `removeFavorite` | `#L153-L157` | `(id: string) => void` |
| `isFavorite` | `#L158` | `(id: string) => boolean` |
| `updateModel` | `#L162-L166` | `(id, updates: Partial<AIModelConfig>) => void` |
| `addModel` | `#L167-L171` | `(model: AIModelConfig) => void` |
| `removeModel` | `#L172-L176` | `(id: string) => void` |
| `setRoleAssignment` | `#L177-L185` | `(role: AIRole, modelId: string) => void` |
| `getModelForRole` | `#L186-L190` | `(role: AIRole) => AIModelConfig \| undefined` |
| `setCorsProxy` | `#L193-L196` | `(url: string) => void` |
| `cachePlugin` | `#L199-L203` | `(plugin: PluginBase) => void` |
| `getCachedPlugin` | `#L204-L210` | `(id: string) => PluginBase \| undefined` |
| `addSearchHistory` | `#L213-L218` | `(query: string) => void` |
| `clearSearchHistory` | `#L219-L222` | `() => void` |

### 2.2 localStorage 键

| 键 | 数据 |
| --- | --- |
| `mc-plugin-market-darkMode` | `boolean` |
| `mc-plugin-market-platforms` | `Platform[]` |
| `mc-plugin-market-favorites` | `Favorite[]` |
| `mc-plugin-market-models` | `AIModelConfig[]`（含明文 API Key） |
| `mc-plugin-market-roleAssignments` | `AIRoleAssignment[]` |
| `mc-plugin-market-corsProxy` | `string` |
| `mc-plugin-market-pluginCache` | `Record<id, { data, timestamp }>` |
| `mc-plugin-market-searchHistory` | `string[]` |
| `ai-concurrency-<modelId>` | 全局并发占用数（由 AI 并发控制器维护） |

## 3. 网络与平台适配

| 名称 | 位置 | 签名 | 说明 |
| --- | --- | --- | --- |
| `isTauri` | `src/services/api-base.ts#L5-L7` | `() => boolean` | 检测 `window.__TAURI__` |
| `getBaseUrl` | `src/services/api-base.ts#L10-L38` | `(platform: Platform) => string` | 环境相关 base |
| `apiFetch` | `src/services/api-base.ts#L41-L72` | `<T>(platform, path, init?) => Promise<T>` | 统一 fetch |
| `spigetIconUrl` | `src/services/spiget.ts#L4-L9` | `(r: SpigetResource) => string` | 图标 URL |
| `toPluginBase`（Spigot） | `src/services/spiget.ts#L11-L28` | `(r: SpigetResource) => PluginBase` | 映射 |
| `decodeBase64` | `src/services/spiget.ts#L31-L39` | `(str: string) => string` | UTF-8 Base64 解码 |
| `searchSpiget` | `src/services/spiget.ts#L41-L47` | `(query, page=1, size=10) => Promise<PluginBase[]>` | 搜索 |
| `getSpigetResource` | `src/services/spiget.ts#L49-L52` | `(id) => Promise<PluginBase>` | 详情 |
| `getSpigetResourceDescription` | `src/services/spiget.ts#L54-L61` | `(id) => Promise<string>` | HTML 描述 |
| `getSpigetCategories` | `src/services/spiget.ts#L63-L65` | `() => Promise<SpigetCategory[]>` | 分类（未用） |
| `getSpigetCategoryResources` | `src/services/spiget.ts#L67-L73` | `(categoryId, page=1, size=10)` | 分类资源（未用） |
| `getSpigetAuthor` | `src/services/spiget.ts#L75-L77` | `(authorId) => Promise<SpigetAuthor>` | 作者（未用） |
| `getSpigetAuthorResources` | `src/services/spiget.ts#L79-L85` | `(authorId, page=1, size=10)` | 作者作品 |
| `getSpigetNewResources` | `src/services/spiget.ts#L87-L93` | `(page=1, size=10)` | 最新（未用） |
| `getSpigetPopularResources` | `src/services/spiget.ts#L95-L100` | `(page=1, size=10)` | 热门 |
| `toPluginBase`（Hangar） | `src/services/hangar.ts#L4-L20` | `(p: HangarProject) => PluginBase` | 映射 |
| `searchHangar` | `src/services/hangar.ts#L22-L28` | `(query, page=0, size=10)` | 搜索 |
| `getHangarProject` | `src/services/hangar.ts#L30-L33` | `(owner, slug)` | 详情 |
| `getHangarProjectDescription` | `src/services/hangar.ts#L35-L67` | `(owner, slug) => Promise<string>` | 多路径描述 |
| `getHangarPopular` | `src/services/hangar.ts#L69-L75` | `(page=0, size=10)` | 热门 |
| `getHangarAuthorProjects` | `src/services/hangar.ts#L77-L83` | `(author, page=0, size=10)` | 作者作品 |
| `hitToPluginBase` | `src/services/modrinth.ts#L4-L20` | `(h: ModrinthSearchHit) => PluginBase` | 搜索映射 |
| `projectToPluginBase` | `src/services/modrinth.ts#L22-L38` | `(p: ModrinthProject) => PluginBase` | 详情映射 |
| `searchModrinth` | `src/services/modrinth.ts#L40-L47` | `(query, page=0, size=10)` | 搜索 |
| `getModrinthProject` | `src/services/modrinth.ts#L49-L52` | `(idOrSlug)` | 详情 |
| `getModrinthProjectDescription` | `src/services/modrinth.ts#L54-L57` | `(idOrSlug)` | 描述 |
| `getModrinthPopular` | `src/services/modrinth.ts#L59-L66` | `(page=0, size=10)` | 热门 |
| `getModrinthTeamMembers` | `src/services/modrinth.ts#L68-L70` | `(teamId)` | 团队成员（未用） |
| `getModrinthUserProjects` | `src/services/modrinth.ts#L72-L75` | `(userId)` | 用户项目 |
| `getModrinthCategories` | `src/services/modrinth.ts#L77-L79` | `()` | 分类（未用） |
| `searchAll` | `src/services/search.ts#L8-L33` | `(query, page=1, size=10) => Promise<PluginBase[]>` | 聚合搜索 |
| `formatDownloads` | `src/services/search.ts#L36-L40` | `(n: number) => string` | 下载量格式化 |
| `formatRating` | `src/services/search.ts#L43-L46` | `(rating?: number) => number` | 评分（未用） |
| `getPlatformColor` | `src/services/search.ts#L49-L55` | `(platform) => string` | 平台色（未用） |
| `getPlatformName` | `src/services/search.ts#L58-L64` | `(platform) => string` | 平台名 |

## 4. AI 服务

| 名称 | 位置 | 签名 | 说明 |
| --- | --- | --- | --- |
| `ConcurrencyLimitError` | `src/services/ai.ts#L5-L10` | `class extends Error` | 并发超限错误，带 `maxConcurrency` |
| `ConcurrencyLimiter` | `src/services/ai.ts#L13-L127` | `class` | 跨标签页并发控制器 |
| `getLimiter` | `src/services/ai.ts#L131-L136` | `(model: AIModelConfig) => ConcurrencyLimiter` | 按模型缓存限流器 |
| `getModelForRole` | `src/services/ai.ts#L139-L141` | `(role: AIRole) => AIModelConfig \| undefined` | 角色选模型 |
| `isAIAvailable` | `src/services/ai.ts#L144-L147` | `(role: AIRole) => boolean` | Key + enabled |
| `buildUrl` | `src/services/ai.ts#L150-L153` | `(model) => string` | `<baseUrl>/chat/completions` |
| `chatCompletion` | `src/services/ai.ts#L155-L192` | `(role, messages, opts?) => Promise<string>` | 非流式 |
| `JSONSchemaProperty` | `src/services/ai.ts#L195-L202` | `interface` | 工具参数 schema |
| `ToolDefinition` | `src/services/ai.ts#L205-L216` | `interface` | 工具定义 |
| `ToolCallResult` | `src/services/ai.ts#L219-L223` | `interface` | 工具调用结果 |
| `ToolChoice` | `src/services/ai.ts#L226` | `type` | 工具选择策略 |
| `chatCompletionWithTools` | `src/services/ai.ts#L229-L279` | `(role, messages, tools, opts?) => Promise<{content?, toolCalls?}>` | 工具调用 |
| `chatCompletionStream` | `src/services/ai.ts#L282-L347` | `(role, messages, opts?) => AsyncGenerator<string>` | SSE 流式 |
| `chatWithModel` | `src/services/ai.ts#L350-L385` | `(model, messages, opts?) => Promise<string>` | 指定模型 |
| `translateLines` | `src/services/ai.ts#L388-L507` | `(lines: string[]) => Promise<string[]>` | 按行翻译 |
| `describeImage` | `src/services/ai.ts#L510-L523` | `(imageUrl: string) => Promise<string>` | 单图描述 |
| `describeImages` | `src/services/ai.ts#L526-L554` | `(imageUrls: string[]) => Promise<string[]>` | 多图描述（串行） |
| `PluginTranslation` | `src/services/ai.ts#L557-L561` | `interface` | 插件译文 |
| `translatePluginInfos` | `src/services/ai.ts#L563-L613` | `(plugins) => Promise<Map<string, PluginTranslation>>` | 名称/简介翻译 |
| `TextSegment` | `src/services/ai.ts#L616-L623` | `interface` | 文档分段 |
| `detectContentType` | `src/services/ai.ts#L626-L661` | `(content) => 'yaml'\|'json'\|'properties'\|'html'\|'markdown'\|'text'` | 类型识别 |
| `extractYamlSegments` | `src/services/ai.ts#L664-L758` | `(content) => TextSegment[]` | YAML 分段 |
| `extractJsonSegments` | `src/services/ai.ts#L761-L821` | `(content) => TextSegment[]` | JSON 分段 |
| `extractHtmlMarkdownSegments` | `src/services/ai.ts#L824-L897` | `(content) => TextSegment[]` | HTML/Markdown 分段 |
| `extractTextSegments` | `src/services/ai.ts#L900-L914` | `(content) => TextSegment[]` | 统一分段 |
| `translateDocumentStream` | `src/services/ai.ts#L917-L1010` | `(content, onProgress?) => AsyncGenerator<{index, translated}>` | 文档流式翻译 |
| `translateDocument` | `src/services/ai.ts#L1013-L1025` | `(content, onProgress?) => Promise<string>` | 完整文档翻译 |

### 4.1 ConcurrencyLimiter 成员

| 成员 | 位置 | 说明 |
| --- | --- | --- |
| `constructor(modelId, maxConcurrency)` | `#L21-L37` | 初始化频道、storageKey、卸载清理 |
| `getGlobalCount()` | `#L39-L46` | 读取全局计数 |
| `setGlobalCount(count)` | `#L48-L60` | 写入并广播 |
| `acquire()` | `#L62-L101` | 获取槽位 |
| `release()` | `#L103-L114` | 释放槽位 |
| `cleanup()` | `#L117-L126` | 归还本标签页槽位并关闭频道 |

## 5. 页面关键函数

### 5.1 MainPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `categories` | `#L16-L33` | 15 个分类常量 |
| `serverTypes` | `#L36-L48` | 11 个服务端常量 |
| `sortOptions` | `#L51-L57` | 5 种排序常量 |
| `downloadFilters` | `#L60-L66` | 下载量阈值 |
| `loadPopular` | `#L101-L131` | 热门加载 |
| `doSearch` | `#L134-L146` | 搜索/加载更多 |
| `handleSearch` | `#L149-L159` | 搜索入口 |
| `handleRandomRefresh` | `#L162-L165` | 换一批 |
| `translatePlugins` | `#L168-L184` | AI 翻译列表 |
| `toggleTranslate` | `#L186-L195` | 切换译文 |
| `getDisplayInfo` | `#L197-L203` | 展示名/简介 |
| `filteredPlugins` | `#L206-L209` | 下载量过滤 |

### 5.2 PluginDetailPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `ApiKeyWarning` | `#L16-L42` | API Key 提示卡片 |
| `loadPlugin` | `#L76-L106` | 详情加载与缓存 |
| `handleChat` | `#L108-L159` | AI 对话 |
| `handleTranslate` | `#L161-L184` | 描述翻译 |

### 5.3 DocsPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `docsTree` | `#L67-L184` | 38 篇文档目录树 |
| `findDocContent` | `#L187-L198` | 递归查内容 |
| `findDocTitle` | `#L201-L212` | 递归查标题 |
| `getAllDocsFlat` | `#L215-L236` | 扁平化用于搜索 |
| `getFirstDocId` | `#L239-L248` | 初始文档 |
| `generateHeadingSlug` | `#L251-L258` | 标题锚点 |
| `TreeNode` | `#L270-L335` | 目录树节点组件 |
| `handleSelectDoc` | `#L356-L379` | 选中并展开父级 |
| `handleScrollToHeading` | `#L382-L389` | 滚动到锚点 |
| `markdownComponents` | `#L392-L441` | 代码高亮与标题 id |
| `handleToggle` | `#L443-L453` | 展开/折叠 |

### 5.4 GuidePage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `presets` | `#L29-L51` | 三个预设卡片 |
| `formatFileSize` | `#L54-L58` | 文件大小 |
| `GuidePage` | `#L60-L74` | 顶层组件 |
| `PresetSelector` | `#L77-L123` | 预设选择 |
| `PresetContent` | `#L126-L142` | 预设容器 |
| `PlaceholderPreset` | `#L145-L155` | 占位（未用） |
| `TranslatePreset` | `#L158-L560` | 配置汉化 |
| `handleFiles` | `#L168-L184` | 读取上传文件 |
| `translateWithConcurrency` | `#L216-L287` | 200 并发翻译 |
| `splitIntoChunks` | `#L290-L297` | 15 行分块 |
| `startTranslation` | `#L300-L337` | 批量翻译 |
| `downloadFile` | `#L340-L350` | 单文件下载 |
| `downloadAll` | `#L353-L355` | 全部下载 |
| `docModules` | `#L563` | 全量文档 glob |
| `loadDoc` | `#L566-L575` | 路径加载文档 |
| `DOC_INDEX` | `#L578-L616` | 38 篇文档索引字符串 |
| `SYSTEM_PROMPT` | `#L619-L635` | 简单开服系统提示 |
| `TOOLS` | `#L638-L657` | `read_docs` 工具 |
| `SimpleServerPreset` | `#L669-L954` | 简单开服 |
| `handleSend`（Simple） | `#L737-L864` | 工具调用 + 流式回答 |
| `readServerFile` | `#L959-L987` | 读取本地文件 |
| `listServerFiles` | `#L989-L1019` | 列目录 |
| `selectDirectory` | `#L1021-L1040` | 目录选择 |
| `AGENT_SYSTEM_PROMPT` | `#L1043-L1062` | Agent 系统提示 |
| `AGENT_TOOLS` | `#L1065-L1118` | 三个工具定义 |
| `AgentPreset` | `#L1151-L2017` | 运维 Agent |
| `handleSelectDirectory` | `#L1278-L1283` | 选择路径 |
| `handleConfirmPath` | `#L1286-L1291` | 确认路径 |
| `handleImageUpload` | `#L1300-L1314` | 图片转 Base64 |
| `executeToolCall` | `#L1322-L1407` | 三种工具分发 |
| `buildMessageContent` | `#L1410-L1422` | 多模态消息 |
| `calculateContextSize` | `#L1428-L1437` | 上下文字符数 |
| `compressConversationInternal` | `#L1440-L1480` | 摘要压缩 |
| `executeAICall` | `#L1483-L1608` | 最多 10 轮工具循环 |
| `handleRetry` | `#L1611-L1640` | 错误重试 |
| `handleSend`（Agent） | `#L1643-L1732` | 发送与压缩 |

### 5.5 SettingsPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `roleLabels` | `#L6-L12` | 5 个角色展示信息 |
| `toggleKeyVisibility` | `#L29-L31` | Key 显隐 |
| `handleAddModel` | `#L33-L49` | 新增模型 |
| `resetDefaults` | `#L51-L56` | 清空 localStorage 并刷新 |

### 5.6 其他页面

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `FavoritesPage` | `src/pages/FavoritesPage.tsx#L5-L30` | 收藏列表 |
| `AuthorPage.loadAuthorPlugins` | `src/pages/AuthorPage.tsx#L20-L37` | 作者作品加载 |

## 6. 组件关键函数

### 6.1 Header

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `AIIcon` | `src/components/Header.tsx#L8-L20` | 自绘 AI 文字图标 |
| `navItems` | `#L22-L29` | 6 个导航项 |
| `Header` | `#L31-L129` | 导航组件 |

### 6.2 SearchBar

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `pluginDocs` | `#L12` | 插件文档 glob |
| `pluginDocList` | `#L15-L18` | 2 篇文档元数据 |
| `SearchFilters` | `#L26-L31` | 组件版筛选类型 |
| `categoryMap` | `#L51-L67` | 分类映射 |
| `serverTypes` | `#L70` | 服务端枚举 |
| `mcVersions` | `#L73` | MC 版本枚举 |
| `handleSearch` | `#L101-L119` | 普通搜索 |
| `resetAgent` | `#L122-L127` | 重置 Agent |
| `startAISearch` | `#L130-L144` | 启动 AI 搜索 |
| `handleUserReply` | `#L147-L156` | 追问回复 |
| `loadPluginDoc` | `#L159-L167` | 加载插件文档 |
| `runAgent` | `#L170-L451` | Agent 主流程 |

### 6.3 DocsSearch

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `generateHeadingSlug` | `#L7-L14` | 锚点 |
| `stripMarkdown` | `#L17-L52` | 摘要清理 |
| `DOC_INDEX` | `#L55-L143` | 关键词→路径映射 |
| `DOC_INDEX_DESC` | `#L146-L189` | 给 AI 的索引说明 |
| `SEARCH_DOCS_TOOL` | `#L192-L219` | `search_docs` 工具 |
| `useDebounce` | `#L243-L257` | 300ms 防抖 |
| `DocsSearch` | `#L259-L653` | 组件 |
| `performNormalSearch` | `#L279-L330` | 普通检索评分 |
| `performAISearch` | `#L333-L412` | AI 检索 |

### 6.4 AskAIPanel

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `generateHeadingSlug` | `#L25-L32` | 锚点 |
| `AskAIPanel` | `#L34-L366` | 组件 |
| `handleSend` | `#L80-L132` | 流式对话 |
| `handleClear` | `#L134-L142` | 清空 |
| `handleKeyDown` | `#L144-L149` | Enter 发送 |
| `handleHeadingClick` | `#L151-L156` | 标题跳转 |
| `markdownComponents` | `#L158-L235` | Markdown 渲染定制 |

### 6.5 其他组件

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `platformColors` | `src/components/PluginCard.tsx#L13-L17` | 平台文字色 |
| `platformBgColors` | `#L19-L23` | 平台背景色 |
| `PluginCard` | `#L25-L136` | 插件卡片 |
| `platforms` | `src/components/PlatformToggle.tsx#L6-L10` | 平台开关配置 |
| `PlatformToggle` | `#L12-L37` | 平台开关 |
| `SpigotIcon` | `src/components/PlatformIcons.tsx#L7-L13` | Spigot 图标 |
| `HangarIcon` | `#L16-L22` | Hangar 图标 |
| `ModrinthIcon` | `#L25-L31` | Modrinth 图标 |
| `MinecraftBlockIcon` | `#L34-L97` | Minecraft 方块图标 |
| `PlatformIcon` | `#L100-L107` | 图标选择器 |

## 7. Tauri

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `run()` | `src-tauri/src/lib.rs#L1-L9` | 初始化 Builder 与三个插件 |
| `main()` | `src-tauri/src/main.rs#L8-L10` | 调用 `mc_plugin_market_lib::run()` |
| `capabilities/default.json` | `src-tauri/capabilities/default.json` | 主窗口权限与 FS scope |
| `tauri.conf.json` | `src-tauri/tauri.conf.json` | 窗口、构建、bundle、插件配置 |

## 8. 常量与配置速查

| 常量 | 位置 | 值 / 说明 |
| --- | --- | --- |
| Vite 代理 | `vite.config.ts#L13-L30` | `/api/spiget`、`/api/hangar`、`/api/modrinth` |
| 构建 base | `vite.config.ts#L12` | `'./'` |
| 别名 | `vite.config.ts#L7-L11` / `tsconfig.json#L20-L23` | `@/* → src/*` |
| Tailwind 暗色 | `tailwind.config.js#L4` | `darkMode: 'class'` |
| 主题色 | `tailwind.config.js#L10-L45` | `mc-*`、平台色、`dark-*` |
| 文档字体覆盖 | `src/index.css#L75-L88` | `.docs-content` |
| Markdown 样式 | `src/index.css#L90-L199` | `.markdown-body` |
| 组件动效 | `src/index.css#L367-L575` | `collapsible`、`stagger`、`card-hover`、`logo` 等 |
| Deploy 工作流 | `.github/workflows/deploy.yml` | main → GitHub Pages |
| Release 工作流 | `.github/workflows/release.yml` | `v*` tag → 多平台安装包 |
| CI Node 版本 | 两个工作流 | Node 20 |
