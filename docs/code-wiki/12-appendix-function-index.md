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
| `HangarProject` | `src/types/index.ts#L53-L64` | `interface` | Hangar 项目 |
| `HangarSearchResult` | `src/types/index.ts#L66-L70` | `interface` | Hangar 搜索结果 |
| `ModrinthProject` | `src/types/index.ts#L72-L93` | `interface` | Modrinth 项目详情 |
| `ModrinthSearchResult` | `src/types/index.ts#L95-L100` | `interface` | Modrinth 搜索结果 |
| `ModrinthSearchHit` | `src/types/index.ts#L102-L122` | `interface` | Modrinth 搜索命中 |
| `AIProvider` | `src/types/index.ts#L124` | `'zhipu' \| 'openai-compatible'` | 模型提供商 |
| `AIModelConfig` | `src/types/index.ts#L126-L136` | `interface` | 模型配置 |
| `AIRole` | `src/types/index.ts#L138` | `'search' \| 'translate' \| 'chat' \| 'vision' \| 'decision'` | AI 角色 |
| `AIRoleAssignment` | `src/types/index.ts#L140-L143` | `interface` | 角色→模型 |
| `ChatMessage` | `src/types/index.ts#L145-L148` | `interface` | 对话消息 |
| `ChatContentPart` | `src/types/index.ts#L150-L154` | `interface` | 多模态内容 |
| `SearchFilters` | `src/types/index.ts#L157-L162` | `interface` | AI 搜索产出、MainPage 消费 |
| `Favorite` | `src/types/index.ts#L165-L168` | `interface` | 收藏快照 |

## 2. Store

| 名称 | 位置 | 签名 / 值 | 说明 |
| --- | --- | --- | --- |
| `STORAGE_KEY` | `src/store/index.ts#L5` | `'mc-plugin-market'` | localStorage 前缀 |
| `loadFromStorage` | `src/store/index.ts#L7-L14` | `<T>(key, fallback) => T` | 同步读取 |
| `saveToStorage` | `src/store/index.ts#L16-L18` | `(key, value) => void` | 同步写入 |
| `saveModels` | `src/store/index.ts#L24-L32` | `(models: AIModelConfig[]) => void` | 串行加密持久化模型配置 |
| `defaultModels` | `src/store/index.ts#L35-L91` | `AIModelConfig[]` | 5 个默认 GLM 模型 |
| `defaultRoleAssignments` | `src/store/index.ts#L93-L99` | `AIRoleAssignment[]` | 5 个角色默认分配 |
| `AppState` | `src/store/index.ts#L101-L142` | `interface` | Store 状态与 Action 类型 |
| `useAppStore` | `src/store/index.ts#L144-L248` | `create<AppState>(...)` | 全局 Store 实例 |
| `loadModelsWithMigration` | `src/store/index.ts#L251-L255` | `Promise<void>` | 启动时解密/迁移模型配置 |
| `resetAppData` | `src/store/index.ts#L260-L270` | `() => Promise<void>` | 清理本应用所有本地数据与密钥库 |

### 2.1 Store Action

| Action | 位置 | 签名 |
| --- | --- | --- |
| `toggleDarkMode` | `#L146-L155` | `() => void` |
| `togglePlatform` | `#L158-L163` | `(p: Platform) => void` |
| `addFavorite` | `#L166-L171` | `(plugin: PluginBase) => void` |
| `removeFavorite` | `#L172-L176` | `(id: string) => void` |
| `isFavorite` | `#L177` | `(id: string) => boolean` |
| `updateModel` | `#L181-L185` | `(id, updates: Partial<AIModelConfig>) => void` |
| `addModel` | `#L186-L190` | `(model: AIModelConfig) => void` |
| `removeModel` | `#L191-L195` | `(id: string) => void` |
| `setRoleAssignment` | `#L196-L204` | `(role: AIRole, modelId: string) => void` |
| `getModelForRole` | `#L205-L209` | `(role: AIRole) => AIModelConfig \| undefined` |
| `setCorsProxy` | `#L212-L215` | `(url: string) => void` |
| `setAiProxy` | `#L218-L221` | `(url: string) => void` |
| `cachePlugin` | `#L224-L228` | `(plugin: PluginBase) => void` |
| `getCachedPlugin` | `#L229-L236` | `(id: string) => PluginBase \| undefined` |
| `addSearchHistory` | `#L238-L243` | `(query: string) => void` |
| `clearSearchHistory` | `#L244-L247` | `() => void` |

### 2.2 localStorage 键

| 键 | 数据 |
| --- | --- |
| `mc-plugin-market-darkMode` | `boolean` |
| `mc-plugin-market-platforms` | `Platform[]` |
| `mc-plugin-market-favorites` | `Favorite[]` |
| `mc-plugin-market-models-secure` | `AIModelConfig[]` 的 AES-GCM 密文（`v1.iv.cipher`） |
| `mc-plugin-market-models`（旧键） | 旧版明文模型配置，仅用于一次性迁移后删除 |
| `mc-plugin-market-roleAssignments` | `AIRoleAssignment[]` |
| `mc-plugin-market-corsProxy` | `string` |
| `mc-plugin-market-aiProxy` | `string`（AI 请求中转前缀） |
| `mc-plugin-market-pluginCache` | `Record<id, { data, timestamp }>` |
| `mc-plugin-market-searchHistory` | `string[]` |
| `ai-concurrency-<modelId>` | 全局并发占用数（由 AI 并发控制器维护） |

## 3. 网络与平台适配

| 名称 | 位置 | 签名 | 说明 |
| --- | --- | --- | --- |
| `isTauri` | `src/services/api-base.ts#L4-L7` | `() => boolean` | 检测 `__TAURI__` 或 `__TAURI_INTERNALS__` |
| `getBaseUrl` | `src/services/api-base.ts#L10-L38` | `(platform: Platform) => string` | 环境相关 base |
| `apiFetch` | `src/services/api-base.ts#L40-L99` | `<T>(platform, path, init?, timeoutMs=15000) => Promise<T>` | 统一 fetch，超时/取消 |
| `spigetIconUrl` | `src/services/spiget.ts#L4-L9` | `(r: SpigetResource) => string` | 图标 URL |
| `toPluginBase`（Spigot） | `src/services/spiget.ts#L11-L28` | `(r: SpigetResource) => PluginBase` | 映射 |
| `decodeBase64` | `src/services/spiget.ts#L31-L39` | `(str: string) => string` | UTF-8 Base64 解码 |
| `searchSpiget` | `src/services/spiget.ts#L41-L47` | `(query, page=1, size=10) => Promise<PluginBase[]>` | 搜索 |
| `getSpigetResource` | `src/services/spiget.ts#L49-L55` | `(id) => Promise<PluginBase>` | 详情 + 描述解码 |
| `getSpigetResourceDescription` | `src/services/spiget.ts#L57-L64` | `(id) => Promise<string>` | 旧缓存缺描述时的回退 |
| `getSpigetAuthorResources` | `src/services/spiget.ts#L66-L72` | `(authorId, page=1, size=10)` | 作者作品 |
| `getSpigetPopularResources` | `src/services/spiget.ts#L74-L80` | `(page=1, size=10)` | 热门 |
| `toPluginBase`（Hangar） | `src/services/hangar.ts#L4-L21` | `(p: HangarProject) => PluginBase` | 映射（含 description） |
| `searchHangar` | `src/services/hangar.ts#L23-L29` | `(query, page=0, size=10)` | 搜索 |
| `getHangarProject` | `src/services/hangar.ts#L31-L34` | `(owner, slug)` | 详情 |
| `getHangarProjectDescription` | `src/services/hangar.ts#L36-L48` | `(owner, slug) => Promise<string>` | 单次 pages 请求 |
| `getHangarPopular` | `src/services/hangar.ts#L50-L56` | `(page=0, size=10)` | 热门 |
| `getHangarAuthorProjects` | `src/services/hangar.ts#L58-L64` | `(author, page=0, size=10)` | 作者作品 |
| `hitToPluginBase` | `src/services/modrinth.ts#L4-L20` | `(h: ModrinthSearchHit) => PluginBase` | 搜索映射 |
| `projectToPluginBase` | `src/services/modrinth.ts#L22-L38` | `(p: ModrinthProject) => PluginBase` | 详情映射 |
| `searchModrinth` | `src/services/modrinth.ts#L40-L47` | `(query, page=0, size=10)` | 搜索 |
| `getModrinthProject` | `src/services/modrinth.ts#L49-L68` | `(idOrSlug)` | 详情 + 团队作者补全 |
| `getModrinthPopular` | `src/services/modrinth.ts#L70-L77` | `(page=0, size=10)` | 热门 |
| `getModrinthTeamMembers`（内部） | `src/services/modrinth.ts#L79-L81` | `(teamId)` | 团队成员 |
| `getModrinthUserProjects` | `src/services/modrinth.ts#L83-L86` | `(userId)` | 用户项目 |
| `SearchAllOptions` | `src/services/search.ts#L7-L9` | `interface` | 错误回调 |
| `getPlatformPage` | `src/services/search.ts#L14-L16` | `(platform, page) => number` | Spigot 1 基 / 其余 0 基 |
| `searchAll` | `src/services/search.ts#L19-L55` | `(query, page=1, size=10, options?) => Promise<PluginBase[]>` | 聚合搜索 |
| `formatDownloads` | `src/services/search.ts#L58-L62` | `(n: number) => string` | 下载量格式化 |
| `getPlatformName` | `src/services/search.ts#L64-L70` | `(platform) => string` | 平台名 |

### 3.1 客户端筛选

| 名称 | 位置 | 签名 | 说明 |
| --- | --- | --- | --- |
| `matchesCategory` | `src/services/filters.ts#L60-L63` | `(plugin, category?) => boolean` | 分类关键词匹配 |
| `matchesServerType` | `src/services/filters.ts#L65-L68` | `(plugin, serverType?) => boolean` | 服务端关键词匹配 |
| `matchesVersion` | `src/services/filters.ts#L70-L75` | `(plugin, version?) => boolean` | MC 版本匹配 |
| `sortPlugins` | `src/services/filters.ts#L77-L99` | `(plugins, sortBy) => PluginBase[]` | 排序 |
| `applyPluginFilters` | `src/services/filters.ts#L101-L109` | `(plugins, filters) => PluginBase[]` | 组合过滤 + 排序 |

### 3.2 安全存储与 HTML 消毒

| 名称 | 位置 | 签名 | 说明 |
| --- | --- | --- | --- |
| `isSecureStorageSupported` | `src/services/secure-storage.ts#L13-L21` | `() => boolean` | 检测 Web Crypto 与 IndexedDB |
| `openDatabase` | `src/services/secure-storage.ts#L23-L35` | `() => Promise<IDBDatabase>` | 打开密钥库 |
| `readStoredKey` | `src/services/secure-storage.ts#L37-L56` | `() => Promise<CryptoKey \| null>` | 读取不可导出 AES 密钥 |
| `createAndStoreKey` | `src/services/secure-storage.ts#L58-L82` | `() => Promise<CryptoKey>` | 生成并保存 AES-GCM 密钥 |
| `getOrCreateKey` | `src/services/secure-storage.ts#L84-L94` | `() => Promise<CryptoKey>` | 缓存密钥 Promise |
| `encryptJson` | `src/services/secure-storage.ts#L109-L115` | `(value) => Promise<string>` | AES-GCM 加密为 `v1.iv.cipher` |
| `decryptJson` | `src/services/secure-storage.ts#L117-L132` | `<T>(payload) => Promise<T \| null>` | 解密并解析 |
| `saveSecureModels` | `src/services/secure-storage.ts#L138-L142` | `(models) => Promise<void>` | 加密写入 localStorage |
| `loadModelsWithMigration` | `src/services/secure-storage.ts#L148-L175` | `<T>(fallback) => Promise<T>` | 旧明文迁移 + 解密读取 |
| `clearSecureModels` | `src/services/secure-storage.ts#L177-L192` | `() => Promise<void>` | 删除密文、旧键与密钥库 |
| `sanitizeHtml` | `src/utils/sanitize.ts#L7-L13` | `(html: string) => string` | DOMPurify 消毒外部 HTML |

### 3.3 文档数据源

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `DOC_CATALOG` | `src/data/docs.ts#L151-L209` | 全部 72 篇文档元数据 + 原文 |
| `docsTree` | `src/data/docs.ts#L212-L216` | 自动生成的侧边栏树 |
| `DOC_INDEX_TEXT` | `src/data/docs.ts#L218-L225` | AI 文档清单 |
| `PLUGIN_DOCS` | `src/data/docs.ts#L227` | 插件文档子集 |
| `resolveDocEntry` | `src/data/docs.ts#L229-L240` | 按路径/文件名解析文档 |
| `getDocContentByPath` | `src/data/docs.ts#L242-L244` | 读取文档原文 |

### 3.4 Markdown 锚点

| 名称 | 位置 | 签名 | 说明 |
| --- | --- | --- | --- |
| `stripMarkdownInline` | `src/utils/markdown.ts#L6-L16` | `(text: string) => string` | 去掉标题里的 Markdown 标记 |
| `generateHeadingSlug` | `src/utils/markdown.ts#L18-L25` | `(text: string) => string` | 标题转锚点 id |
| `buildHeadingIdMap` | `src/utils/markdown.ts#L33-L55` | `(content: string) => Map<number, string>` | 按行号预生成 id，同名追加 `-1`/`-2` |

## 4. AI 服务

| 名称 | 位置 | 签名 | 说明 |
| --- | --- | --- | --- |
| `ConcurrencyLimitError` | `src/services/ai.ts#L5-L10` | `class extends Error` | 并发超限错误，带 `maxConcurrency` |
| `ConcurrencyLimiter` | `src/services/ai.ts#L13-L157` | `class` | 跨标签页并发控制器（Web Locks） |
| `getLimiter` | `src/services/ai.ts#L161-L171` | `(model: AIModelConfig) => ConcurrencyLimiter` | 按模型缓存并同步并发上限 |
| `getModelForRole` | `src/services/ai.ts#L174-L177` | `(role: AIRole) => AIModelConfig \| undefined` | 角色选模型 |
| `isAIAvailable` | `src/services/ai.ts#L179-L182` | `(role: AIRole) => boolean` | Key + enabled |
| `buildUrl` | `src/services/ai.ts#L185-L191` | `(model) => string` | 直连或 `aiProxy` 中转 |
| `chatCompletion` | `src/services/ai.ts#L193-L230` | `(role, messages, opts?) => Promise<string>` | 非流式 |
| `JSONSchemaProperty` | `src/services/ai.ts#L233-L241` | `interface` | 工具参数 schema |
| `ToolDefinition` | `src/services/ai.ts#L243-L256` | `interface` | 工具定义 |
| `ToolCallResult` | `src/services/ai.ts#L257-L263` | `interface` | 工具调用结果 |
| `ToolChoice` | `src/services/ai.ts#L264` | `type` | 工具选择策略 |
| `chatCompletionWithTools` | `src/services/ai.ts#L267-L318` | `(role, messages, tools, opts?) => Promise<{content?, toolCalls?}>` | 工具调用 |
| `chatCompletionStream` | `src/services/ai.ts#L320-L386` | `(role, messages, opts?) => AsyncGenerator<string>` | SSE 流式 |
| `chatWithModel` | `src/services/ai.ts#L388-L424` | `(model, messages, opts?) => Promise<string>` | 指定模型 |
| `describeImages` | `src/services/ai.ts#L426-L455` | `(imageUrls: string[]) => Promise<string[]>` | 多图描述（串行） |
| `PluginTranslation` | `src/services/ai.ts#L457-L461` | `interface` | 插件译文 |
| `translatePluginInfos` | `src/services/ai.ts#L463-L514` | `(plugins) => Promise<Map<string, PluginTranslation>>` | 名称/简介翻译 |
| `TextSegment` | `src/services/ai.ts#L516-L524` | `interface` | 文档分段 |
| `detectContentType` | `src/services/ai.ts#L526-L562` | `(content) => 'yaml'\|'json'\|'properties'\|'html'\|'markdown'\|'text'` | 类型识别 |
| `extractYamlSegments` | `src/services/ai.ts#L564-L659` | `(content) => TextSegment[]` | YAML 分段 |
| `extractJsonSegments` | `src/services/ai.ts#L661-L722` | `(content) => TextSegment[]` | JSON 分段 |
| `extractHtmlMarkdownSegments` | `src/services/ai.ts#L724-L798` | `(content) => TextSegment[]` | HTML/Markdown 分段 |
| `extractTextSegments` | `src/services/ai.ts#L800-L815` | `(content) => TextSegment[]` | 统一分段 |
| `translateDocumentStream` | `src/services/ai.ts#L817-L910` | `(content, onProgress?) => AsyncGenerator<{index, translated}>` | 文档流式翻译 |

### 4.1 ConcurrencyLimiter 成员

| 成员 | 位置 | 说明 |
| --- | --- | --- |
| `constructor(modelId, maxConcurrency)` | `#L21-L41` | 初始化频道、storageKey、卸载清理 |
| `withLock(fn)` | `#L46-L54` | Web Locks 串行化或直接执行 |
| `getGlobalCount()` | `#L56-L64` | 读取全局计数 |
| `setGlobalCount(count)` | `#L66-L77` | 写入并广播（频道可空） |
| `reserveSlot()` | `#L79-L86` | 锁内占用全局槽位 |
| `releaseGlobalSlot()` | `#L88-L93` | 锁内归还全局槽位 |
| `acquire()` | `#L95-L122` | 获取槽位或排队 |
| `release()` | `#L124-L130` | 释放槽位并唤醒队列 |
| `setMaxConcurrency(max)` | `#L132-L137` | 更新并发上限 |
| `drainQueue()` | `#L139-L143` | 唤醒一个等待者 |
| `cleanup()` | `#L145-L156` | 归还本标签页槽位并关闭频道 |

## 5. 页面关键函数

### 5.1 MainPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `markPlatformError` | `#L52-L56` | 记录失败平台 |
| `loadPopular` | `#L58-L102` | 热门加载（含失败提示、翻译缓存） |
| `doSearch` | `#L104-L117` | 搜索/加载更多（onError） |
| `handleSearch` | `#L120-L147` | 搜索入口 + 筛选参数（写入 `loadedQueryRef`） |
| `handleRandomRefresh` | `#L149-L152` | 换一批 |
| `translatePlugins` | `#L155-L171` | 只翻译未命中缓存的插件 |
| `toggleTranslate` | `#L173-L182` | 切换译文 |
| `getDisplayInfo` | `#L184-L191` | 展示名/简介 |
| `filteredPlugins` | `#L193-L200` | `applyPluginFilters` |
| `query / platform effect` | `#L209-L228` | `loadedQueryRef` 搜索去重、`popularKeyRef` 热门指纹去重 |

> 筛选面板的常量与 UI 已迁移到 `src/components/FilterPanel.tsx`。

### 5.2 PluginDetailPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `ApiKeyWarning` | `#L18-L44` | API Key 提示卡片 |
| `safeDescription` / `safeTranslatedDescription` | `#L73-L79` | DOMPurify 消毒后的描述 |
| `loadPlugin` | `#L90-L126` | 详情加载、缓存键与 Modrinth 作者；Spigot 描述随详情返回 |
| `handleChat` | `#L128-L179` | AI 对话 |
| `handleTranslate` | `#L181-L200` | 描述翻译 |

### 5.3 DocsPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `docsTree` | `src/data/docs.ts#L212-L216` | 自动生成的 72 篇目录树 |
| `findDocContent` | `#L16-L29` | 递归查内容 |
| `findDocTitle` | `#L30-L43` | 递归查标题 |
| `getAllDocsFlat` | `#L44-L66` | 扁平化用于搜索 |
| `getFirstDocId` | `#L68-L77` | 初始文档 |
| `HeadingProps` / `TreeNodeProps` | `#L79-L92` | 标题与树节点类型 |
| `TreeNode` | `#L94-L160` | 目录树节点组件 |
| `headingIds` | `#L175` | `buildHeadingIdMap(content)` |
| `handleSelectDoc` | `#L181-L205` | 选中并展开父级 |
| `resolveHeadingId` | `#L207-L212` | 按行号取唯一标题 id |
| `handleScrollToHeading` | `#L214-L222` | 滚动到锚点 |
| `markdownComponents` | `#L224-L265` | 代码高亮与标题 id |
| `handleToggle` | `#L267-L277` | 展开/折叠 |

### 5.4 GuidePage（已拆分）

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `GuidePage` | `src/pages/GuidePage.tsx#L5-L19` | 顶层组件，仅维护 `activePreset` |
| `presets` | `src/pages/guide/PresetSelector.tsx#L9-L31` | 三个预设卡片 |
| `PresetSelector` | `#L34-L81` | 预设选择 |
| `PresetContent` | `#L83-L99` | 预设容器 |
| `isTauri` | `src/pages/guide/env.ts#L1-L2` | Tauri 双检测 |
| `loadDoc` | `src/pages/guide/loadDocs.ts#L4-L6` | 统一文档源读取 |
| `formatFileSize` | `src/pages/guide/TranslatePreset.tsx#L8-L15` | B/KB/MB/GB/TB |
| `TranslatePreset` | `#L17-L427` | 配置汉化 |
| `handleFiles` | `#L27-L45` | 读取上传文件 |
| `translateWithConcurrency` | `#L75-L148` | 模型并发上限内翻译 |
| `splitIntoChunks` | `#L149-L158` | 15 行分块 |
| `startTranslation` | `#L159-L206` | 批量翻译（读取模型 `maxConcurrency`） |
| `downloadFile` | `#L207-L219` | 单文件下载 |
| `downloadAll` | `#L220+` | 全部下载 |
| `SYSTEM_PROMPT` | `src/pages/guide/SimpleServerPreset.tsx#L13-L31` | 简单开服系统提示（DOC_INDEX_TEXT） |
| `TOOLS` | `#L32-L53` | `read_docs` 工具 |
| `SimpleServerPreset` | `#L63-L348` | 简单开服 |
| `markdownComponents` | `#L72-L130` | Markdown/代码块渲染 |
| `handleSend`（Simple） | `#L131-L348` | 工具调用 + 流式回答 |
| `resolveServerPath` | `src/pages/guide/AgentPreset.tsx#L16-L38` | 限制相对路径在服务器根目录内 |
| `readServerFile` | `#L40-L56` | 读取本地文件（只读 FS） |
| `listServerFiles` | `#L58-L76` | 列目录（只读 FS） |
| `selectDirectory` | `#L78-L98` | 目录选择 |
| `AGENT_SYSTEM_PROMPT` | `#L100-L121` | Agent 系统提示 |
| `AGENT_TOOLS` | `#L122-L176` | 三个工具定义 |
| `ToolOperation` / `RetryData` / `AgentMessageItem` | `#L178-L207` | Agent 消息类型 |
| `AgentPreset` | `#L208-L1073` | 运维 Agent |
| `handleSelectDirectory` | `#L335-L342` | 选择路径 |
| `handleConfirmPath` | `#L343-L350` | 确认路径 |
| `handleEditPath` | `#L351-L356` | 修改路径 |
| `handleImageUpload` | `#L357-L373` | 图片转 Base64 |
| `removePendingImage` | `#L374-L378` | 移除待发送图片 |
| `executeToolCall` | `#L379-L466` | 三种工具分发 |
| `buildMessageContent` | `#L467-L484` | 多模态消息 |
| `calculateContextSize` | `#L485-L496` | 上下文字符数 |
| `compressConversationInternal` | `#L497-L539` | 摘要压缩 |
| `executeAICall` | `#L540-L666` | 最多 10 轮工具循环 |
| `handleRetry` | `#L667-L698` | 错误重试 |
| `handleSend`（Agent） | `#L699-L790` | 发送与压缩 |
| `handleKeyDown` | `#L791+` | Enter 发送 |

### 5.5 SettingsPage

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `roleLabels` | `#L7-L13` | 5 个角色展示信息 |
| `secureStorageSupported` | `#L26` | 当前环境是否支持加密存储 |
| `toggleKeyVisibility` | `#L40-L42` | Key 显隐 |
| `handleAddModel` | `#L44-L60` | 新增模型 |
| `resetDefaults` | `#L62-L69` | 调用 `resetAppData` 并刷新 |

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

### 6.2 SearchBar + SearchAgentPanel

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `pluginDocList` | `src/components/SearchBar.tsx#L12` | 统一插件文档列表别名 |
| `categoryMap` | `#L20-L37` | 分类映射 |
| `serverTypes` | `#L39` | 服务端枚举 |
| `mcVersions` | `#L42` | MC 版本枚举 |
| `handleSearch` | `#L70-L89` | 普通搜索 |
| `resetAgent` | `#L91-L97` | 重置 Agent |
| `startAISearch` | `#L99-L114` | 启动 AI 搜索 |
| `handleUserReply` | `#L116-L126` | 追问回复 |
| `loadPluginDoc` | `#L128-L131` | 统一文档源加载 |
| `runAgent` | `#L133-L416` | Agent 主流程 |
| `AgentState` / `SearchStep` / `AgentMessage` | `src/components/SearchAgentPanel.tsx#L8-L20` | Agent 展示类型 |
| `SearchAgentPanel` | `#L34-L225` | AI 搜索对话面板 |
| `SearchFilters` | `src/types/index.ts#L157-L162` | 筛选类型（已从 SearchBar 迁出） |

### 6.3 DocsSearch + DocsSearchResults

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `stripMarkdown` | `src/components/DocsSearch.tsx#L8-L44` | 摘要清理 |
| `SEARCH_DOCS_TOOL` | `#L46-L73` | `search_docs` 工具 |
| `DocsSearchProps` | `#L75-L80` | 组件 Props |
| `useDebounce` | `#L82-L96` | 300ms 防抖 |
| `DocsSearch` | `#L98-L351` | 组件 |
| `performNormalSearch` | `#L118-L170` | 普通检索评分 |
| `performAISearch` | `#L172-L238` | AI 检索（resolveDocEntry 映射） |
| `handleKeyDown` / `handleSelectResult` / `handleClear` | `#L240-L276` | 交互 |
| `SearchResult` / `AISearchResult` | `src/components/DocsSearchResults.tsx#L5-L16` | 结果类型 |
| `DocsSearchResults` | `#L30-L170` | 结果下拉与 AI 回答 |

### 6.4 AskAIPanel

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `AskAIPanel` | `src/components/AskAIPanel.tsx#L25-L358` | 组件 |
| `handleSend` | `#L71-L123` | 流式对话 |
| `handleClear` | `#L125-L133` | 清空 |
| `handleKeyDown` | `#L135-L140` | Enter 发送 |
| `handleHeadingClick` | `#L142-L147` | 标题跳转（`generateHeadingSlug` 来自 `utils/markdown`） |
| `markdownComponents` | `#L149-L235` | Markdown 渲染定制 |

### 6.5 其他组件

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `platformColors` | `src/components/PluginCard.tsx#L15-L19` | 平台文字色 |
| `platformBgColors` | `#L21-L25` | 平台背景色 |
| `PluginCard` | `#L27-L141` | 插件卡片（支持 `favoritePlugin`） |
| `categories` / `serverTypes` / `sortOptions` / `downloadFilters` | `src/components/FilterPanel.tsx#L5-L52` | 筛选常量 |
| `FilterPanel` | `#L65-L191` | 筛选面板 |
| `platforms` | `src/components/PlatformToggle.tsx#L6-L10` | 平台开关配置 |
| `PlatformToggle` | `#L12-L37` | 平台开关 |
| `SpigotIcon` | `src/components/PlatformIcons.tsx#L9-L17` | Spigot 图标 |
| `HangarIcon` | `#L18-L25` | Hangar 图标 |
| `ModrinthIcon` | `#L27-L34` | Modrinth 图标 |
| `MinecraftBlockIcon` | `#L36-L100` | Minecraft 方块图标（`useId`） |
| `PlatformIcon` | `#L102-L109` | 图标选择器 |

## 7. Tauri

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `run()` | `src-tauri/src/lib.rs#L1-L8` | 初始化 Builder 与 dialog/fs 两个插件 |
| `main()` | `src-tauri/src/main.rs#L8-L10` | 调用 `mc_plugin_market_lib::run()` |
| `capabilities/default.json` | `src-tauri/capabilities/default.json` | 主窗口只读 FS 权限与目录 scope |
| `tauri.conf.json` | `src-tauri/tauri.conf.json` | 窗口、构建、bundle、CSP 配置 |

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
