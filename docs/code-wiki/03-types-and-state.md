# 03 · 数据类型与状态管理

## 1. 类型系统总览

全部共享类型集中在 [src/types/index.ts](../../src/types/index.ts)，按用途分为五组：

| 分组 | 类型 | 用途 |
| --- | --- | --- |
| 统一领域模型 | `Platform`、`PluginBase` | UI 与业务层唯一插件契约 |
| 上游 API 模型 | `SpigetResource`、`HangarProject`、`HangarSearchResult`、`ModrinthProject`、`ModrinthSearchResult`、`ModrinthSearchHit` | 描述第三方接口原始结构 |
| AI 配置 | `AIProvider`、`AIModelConfig`、`AIRole`、`AIRoleAssignment` | 模型与角色分配 |
| 对话协议 | `ChatMessage`、`ChatContentPart` | OpenAI 兼容消息格式 |
| 应用数据 | `Favorite`、`SearchFilters` | 收藏快照、AI 搜索产出的筛选条件 |

## 2. 统一插件模型 `PluginBase`

定义位置：[types/index.ts#L4-L21](../../src/types/index.ts#L4-L21)

| 字段 | 类型 | 必填 | 含义 | 来源示例 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 | 全局唯一 ID，带平台前缀 | `spigot-123`、`hangar-Owner-Slug`、`modrinth-abc` |
| `platformId` | `string` | 是 | 平台内原始 ID / 路由参数 | `123`、`Owner/Slug`、Modrinth project id |
| `platform` | `Platform` | 是 | 平台枚举 | `spigot` / `hangar` / `modrinth` |
| `name` | `string` | 是 | 插件名 | Spiget `name`、Hangar `name`、Modrinth `title` |
| `tag` | `string` | 是 | 一句话简介 | Spiget `tag`、其余 `description` |
| `description` | `string?` | 否 | 完整描述（HTML/Markdown） | Spigot 详情接口（已含 Base64 描述）；Hangar pages；Modrinth `body` |
| `author` | `string` | 是 | 作者 | Spigot `author.name` / `contributors`；Hangar owner；Modrinth `author` |
| `authorId` | `string?` | 否 | 作者 ID，用于作者页路由 | Spigot author id；Hangar owner |
| `icon` | `string?` | 否 | 图标 URL | Spigot 拼接 spigotmc.org；Hangar `avatarUrl`；Modrinth `icon_url` |
| `rating` | `number?` | 否 | 评分（0–5） | 仅 Spigot 提供 |
| `downloads` | `number` | 是 | 下载量 | 三平台均提供 |
| `categories` | `string[]` | 是 | 分类/标签 | Hangar `[category, ...tags]`；Modrinth categories |
| `version` | `string?` | 否 | 最新版本标识 | Spigot 最后一项 testedVersions；Modrinth 最后一项 versions |
| `lastUpdate` | `number?` | 否 | 最后更新时间（毫秒） | 各平台日期/秒级时间戳转换 |
| `sourceUrl` | `string?` | 否 | 原始页面地址 | 详情页“前往平台下载” |
| `images` | `string[]?` | 否 | 截图 URL | Modrinth gallery；Spigot/Hangar 未填充 |

### 2.1 ID 与路由约定

| 平台 | `id` 规则 | `platformId` | 列表跳转路由 | 详情参数解析 |
| --- | --- | --- | --- | --- |
| Spigot | `spigot-<数字 ID>` | `<数字 ID>` | `/plugin/spigot/123` | `id = "123"`，`subId` 空 |
| Hangar | `hangar-<owner>-<slug>` | `<owner>/<slug>` | `/plugin/hangar/<owner>/<slug>` | `id = owner`，`subId = slug` |
| Modrinth | `modrinth-<project_id>` | `<project_id>` | `/plugin/modrinth/<project_id>` | `id = project_id` |

`PluginCard` 直接用 `plugin.platformId` 拼接路径，因此 Hangar 的 `platformId` 必须包含斜杠，才能命中 `/plugin/:platform/:id/:subId` 路由。

### 2.2 平台映射差异

| 字段 | Spigot | Hangar | Modrinth |
| --- | --- | --- | --- |
| `rating` | `rating.average` | 未使用（有 `stars` 但未映射） | 未使用（有 `followers`） |
| `categories` | **空数组**（未从 `category` 映射） | `category + settings.tags` | `categories` |
| `version` | `testedVersions` 最后一个 | 未设置 | 搜索命中 `versions` 最后一项；详情未设置 |
| `author` | `author.name` 或 `contributors` | `namespace.owner` | 搜索命中 `author`；详情通过团队接口补全 |
| `images` | 未设置 | 未设置 | `gallery` |
| `description` | 详情接口直接返回 | pages 单次请求 + 项目简介回退 | `body` |

这些差异会导致：Spigot 卡片没有分类标签，Hangar 没有星级，Modrinth 详情在团队接口失败时仍可能缺少作者。详见 [11](11-conventions-and-known-issues.md)。

## 3. 上游 API 类型

### 3.1 Spiget

- `SpigetResource`（[L24-L50](../../src/types/index.ts#L24-L50)）：包含 `likes`、`file`、`testedVersions`、`links`、`rating`、`icon`、`releaseDate`/`updateDate`（秒级）、`downloads`、`external`/`premium`/`price`、`description`、`category`、`version(s)`、`author`、`reviews` 等。

适配器只消费其中一部分字段，`description` 在 Spiget 响应中是 **Base64 编码的 HTML**，需 `decodeBase64` 处理。

### 3.2 Hangar

- `HangarProject`（[L53-L64](../../src/types/index.ts#L53-L64)）：`namespace.owner/slug`、`stats`（views/downloads/recent*/stars）、`category`、`avatarUrl`、`description`、`settings.tags/links`。
- `HangarSearchResult`：`pagination` + `result[]`。

Hangar 的“评分”概念是 `stars`，当前未映射到 `rating`。

### 3.3 Modrinth

- `ModrinthProject`（[L72-L93](../../src/types/index.ts#L72-L93)）：`slug`、`title`、`description`、`body`、`categories`、`client_side`/`server_side`、`project_type`、`downloads`、`icon_url`、`color`、`id`、`team`、`published`/`updated`、`followers`、`license`、`versions`、`gallery`。
- `ModrinthSearchResult`：`hits[]` + 分页信息。
- `ModrinthSearchHit`：搜索结果精简结构，含 `project_id`、`author`、`date_modified`、`latest_version`、`gallery`。

## 4. AI 相关类型

| 类型 | 定义 | 说明 |
| --- | --- | --- |
| `AIProvider` | `'zhipu' \| 'openai-compatible'` | 仅用于设置页展示与标签；实际请求统一走 OpenAI 兼容协议 |
| `AIModelConfig` | `id`、`name`、`provider`、`model`、`apiKey`、`baseUrl`、`maxConcurrency`、`maxContext`、`enabled` | 一个可调用模型实例 |
| `AIRole` | `'search' \| 'translate' \| 'chat' \| 'vision' \| 'decision'` | 功能角色 |
| `AIRoleAssignment` | `{ role, modelId }` | 角色到模型的绑定 |
| `ChatMessage` | `{ role: 'user'\|'assistant'\|'system', content: string \| ChatContentPart[] }` | 支持纯文本与多模态内容 |
| `ChatContentPart` | `{ type: 'text'\|'image_url', text?, image_url? }` | 视觉消息 |

`ToolDefinition`、`ToolCallResult`、`ToolChoice`、`JSONSchemaProperty` 不在 `types/index.ts`，而是从 [ai.ts](../../src/services/ai.ts#L195-L227) 导出（见 05）。

## 5. Zustand Store

### 5.1 结构

[src/store/index.ts](../../src/store/index.ts) 使用 `create<AppState>((set, get) => ({...}))` 创建单例 Store。持久化策略：

```ts
const STORAGE_KEY = 'mc-plugin-market'
function loadFromStorage<T>(key, fallback) {
  const raw = localStorage.getItem(`${STORAGE_KEY}-${key}`)
  return raw ? JSON.parse(raw) : fallback
}
function saveToStorage(key, value) {
  localStorage.setItem(`${STORAGE_KEY}-${key}`, JSON.stringify(value))
}
```

- 读取时机：普通设置同步读取；**模型配置（含 API Key）通过 `loadModelsWithMigration` 异步读取并解密**。
- 写入时机：每个 action 内部显式调用 `saveToStorage` 或 `saveModels`，没有使用 Zustand `persist` 中间件。
- 容错：读取时 `try/catch` 回退默认值；写入时普通键 **没有 try/catch**，隐私模式或配额不足时可能抛错。
- 模型持久化：`saveModels` 通过串行 Promise 链调用 `saveSecureModels`，避免并发写入乱序。

### 5.1.1 API Key 加密存储

模型配置不再以明文写入 `localStorage`。实现位于 [services/secure-storage.ts](../../src/services/secure-storage.ts)：

1. 首次保存时生成 **AES-GCM 256 位**密钥，`extractable: false`，以 `CryptoKey` 形式存入 IndexedDB 数据库 `mc-plugin-market-secure` 的 `keys` 存储。
2. 使用随机 12 字节 IV 加密整个 `models` 数组，密文以 `v1.<iv>.<cipher>` 格式写入 `mc-plugin-market-models-secure`。
3. 启动时读取并解密；若发现旧版明文键 `mc-plugin-market-models`，会迁移到密文存储并立即删除明文键。
4. Web Crypto / IndexedDB 不可用（非安全上下文）时，不加密、不持久化，API Key 仅保留在内存，并在设置页显示提示。
5. 设置页“重置”会清除应用键、密文与 IndexedDB 密钥库，不再执行 `localStorage.clear()`。

> 加密主要降低“静态存储中的明文暴露”风险；同源 XSS 仍可调用应用的解密逻辑读取 Key，因此仍需配合 HTML 消毒与 CSP。

### 5.2 状态字段与 Action

| 分组 | 字段 | 类型 / 默认值 | 持久化键 | Action |
| --- | --- | --- | --- | --- |
| 主题 | `darkMode` | `boolean`，默认 `true` | `mc-plugin-market-darkMode` | `toggleDarkMode()`：翻转并同步 `<html class="dark">` |
| 平台 | `enabledPlatforms` | `Platform[]`，默认三平台全开 | `mc-plugin-market-platforms` | `togglePlatform(p)`：增删平台并持久化 |
| 收藏 | `favorites` | `Favorite[]`，默认 `[]` | `mc-plugin-market-favorites` | `addFavorite(plugin)`、`removeFavorite(id)`、`isFavorite(id)` |
| AI 模型 | `models` | `AIModelConfig[]`，默认 5 个 GLM 模型 | `mc-plugin-market-models-secure`（AES-GCM 密文） | `updateModel`、`addModel`、`removeModel`；通过 `saveSecureModels` 持久化 |
| AI 角色 | `roleAssignments` | `AIRoleAssignment[]`，默认 5 条 | `mc-plugin-market-roleAssignments` | `setRoleAssignment(role, modelId)`、`getModelForRole(role)` |
| 代理 | `corsProxy` | `string`，默认 `https://api.allorigins.win/raw?url=` | `mc-plugin-market-corsProxy` | `setCorsProxy(url)` |
| AI 代理 | `aiProxy` | `string`，默认空（直连） | `mc-plugin-market-aiProxy` | `setAiProxy(url)` |
| 插件缓存 | `pluginCache` | `Record<id, { data, timestamp }>`，默认 `{}` | `mc-plugin-market-pluginCache` | `cachePlugin(plugin)`、`getCachedPlugin(id)` |
| 搜索历史 | `searchHistory` | `string[]`，默认 `[]` | `mc-plugin-market-searchHistory` | `addSearchHistory(q)`（去重、上限 20）、`clearSearchHistory()` |

### 5.3 默认 AI 模型与角色分配

定义在 [store/index.ts#L35-L99](../../src/store/index.ts#L35-L99)。

| 模型 id | 显示名 | `model` | `baseUrl` | `maxConcurrency` | `maxContext` |
| --- | --- | --- | --- | --- | --- |
| `glm-4.7-flash` | GLM-4.7-Flash (决策/对话) | `glm-4.7-flash` | `https://open.bigmodel.cn/api/paas/v4` | 1 | 200000 |
| `glm-4.5-flash` | GLM-4.5-Flash (搜索筛选) | `GLM-4.5-Flash` | 同上 | 2 | 128000 |
| `glm-4-flash` | GLM-4-Flash (翻译/对话) | `GLM-4-Flash` | 同上 | 200 | 8000 |
| `glm-4.6v-flash` | GLM-4.6V-Flash (视觉) | `glm-4.6v-flash` | 同上 | 1 | 128000 |
| `glm-4v-flash` | GLM-4V-Flash (视觉) | `GLM-4V-Flash` | 同上 | 10 | 8000 |

所有默认模型 `apiKey` 为空、`enabled: true`。默认角色：

| 角色 | 默认模型 |
| --- | --- |
| `decision` | `glm-4.7-flash` |
| `search` | `glm-4.5-flash` |
| `chat` | `glm-4.7-flash` |
| `translate` | `glm-4-flash` |
| `vision` | `glm-4v-flash` |

`getModelForRole` 的解析链：`roleAssignments.find(role)` → 若不存在返回 `undefined` → `models.find(modelId)`。角色未分配或模型被删除时，AI 功能会提示“未配置”。

### 5.4 收藏数据

`Favorite` 保存 **插件快照** 与收藏时间：

```ts
interface Favorite {
  plugin: PluginBase
  addedAt: number
}
```

这意味着收藏页不依赖网络，但快照不会自动更新；平台下架或字段变更不会反映到已收藏数据。`PluginCard` 通过 `favoritePlugin` 保证收藏写入的是原始数据，而不是页面上的 AI 译文副本。

### 5.5 缓存语义

- 写入：`cachePlugin(plugin)` 以 `plugin.id` 为键，记录 `{ data, timestamp }`。
- 读取：`getCachedPlugin(id)` 在超过 **1 小时**（`3600000ms`）时返回 `undefined`，但不会主动删除旧记录。
- 读取键与 Store 写入键一致：`PluginDetailPage` 按 `plugin.id` 规则生成缓存键（Hangar 为 `hangar-<owner>-<slug>`），三个平台均可命中。Spigot 详情现在一次请求即包含描述，缓存也会保存 `description`。

### 5.6 使用模式

```ts
// 订阅单个字段（推荐，减少重渲染）
const darkMode = useAppStore(s => s.darkMode)

// 解构整个 Store（页面常用，任意字段变化都会触发重渲染）
const { models, roleAssignments, updateModel } = useAppStore()
```

`SettingsPage`、`MainPage`、`PluginDetailPage`、`PluginCard` 已改为按字段订阅选择器；`Header`、`PlatformToggle`、`SearchBar`、`FavoritesPage` 仍是整体解构，后续可按同样方式收敛。

## 6. 其他配置类型

| 类型 | 定义 | 当前使用情况 |
| --- | --- | --- |
| `SearchFilters` | `category`、`serverType`、`version`、`platforms` | 定义在 `types/index.ts`，由 `SearchBar` 产出、`MainPage` 消费并写入 URL |

### 6.1 主题与样式状态

- `darkMode` 默认 `true`，切换时 Store 同步 `document.documentElement.classList`，`App.tsx#L40-L46` 在挂载/变化时再次同步。
- Tailwind 使用 `darkMode: 'class'`，因此所有 `dark:` 变体依赖 `<html class="dark">`。
- 暗色样式统一由 `html.dark` 驱动；`body.dark-mode` 历史选择器已移除。

## 7. 状态持久化风险

| 风险 | 说明 |
| --- | --- |
| 加密密钥与数据同源 | AES-GCM 密钥存于 IndexedDB；同源 XSS 仍可能调用解密逻辑，需依赖消毒与 CSP |
| 非安全上下文不持久化 | `crypto.subtle` 不可用时 API Key 仅保留在内存，刷新后需重新填写 |
| 缓存无上限 | `pluginCache` 只增不减，长期使用可能占用较多空间 |
| 无跨标签页同步 | 除 AI 并发计数外，Store 变更不会广播到其他标签页 |
| 旧数据结构兼容 | 没有 schema 版本号或迁移逻辑（仅模型配置有明文→密文迁移），其他字段结构变化后旧数据可能不兼容 |
| 普通键写入异常 | `saveToStorage` 未捕获 `QuotaExceededError` |
