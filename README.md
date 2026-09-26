# MC 插件市场

Minecraft 插件聚合搜索工具，一次查询同时搜索 **Modrinth**、**Hangar**、**SpigotMC** 三大平台，内置版本历史、服务端兼容性、离线缓存、AI 助手。

> ⚡ 基于 React 19 + Vite + Tauri 2.x，支持 Web 和桌面端。

## ✨ 功能特性

| 模块 | 说明 |
|------|------|
| 🔍 聚合搜索 | 跨 Modrinth / Hangar / SpigotMC 一次查询，下载量排序 + 实时关键词高亮 |
| 💡 搜索建议 | 250ms 防抖自动补全，下拉显示插件图标 + 名称 + 平台徽章 |
| 📋 版本历史 | 每个插件完整版本列表（Spigot/Hangar/Modrinth API 直拉），含 changelog、MC 版本、**直接下载** |
| 🧩 服务端兼容 | 详情页显示支持的加载器（Paper / Spigot / Velocity / Fabric / Forge…）和 MC 版本标签 |
| 🔄 相似插件 | 跨平台自动推荐同类型插件和替代品 |
| 🤖 AI 助手 | 内置 AI 模型配置（智谱 GLM / OpenAI 兼容），对话 + 一键翻译插件描述 |
| ⭐ 收藏 + 文件夹 | 文件夹分组收藏，创建/重命名/删除，拖拽式"移动到文件夹"子菜单 |
| 🗄️ 两级缓存 | 内存 + localStorage 持久化；按 **搜索 / 热门 / 详情 / 版本 / 元数据** 分类 TTL，支持 stale-while-revalidate + 离线 fallback |
| 🌙 深色模式 | Tailwind CSS dark variant，一键切换 |
| 💻 桌面端 | Tauri 2.x 打包，Windows / macOS / Linux 原生应用 |
| 📚 内置教程 | 服务器搭建指南 + 热门插件使用教程 |

## 🛠️ 技术栈

- **前端**: React 19 + TypeScript + Vite 6
- **样式**: Tailwind CSS + lucide-react 图标
- **状态**: Zustand（持久化到 localStorage）
- **Markdown**: react-markdown + rehype-raw + remark-gfm
- **桌面**: Tauri 2.x + Rust
- **部署**: GitHub Actions → GitHub Pages + Tauri Release

## 🚀 快速开始

```bash
# 克隆
git clone https://github.com/okouiko/pluginmarket.git
cd pluginmarket

# 依赖
npm install

# Web 开发
npm run dev           # http://localhost:5173

# Tauri 桌面开发（需要 Rust）
npm run tauri dev

# 生产构建
npm run build
npm run tauri build   # 输出到 src-tauri/target/release/bundle
```

## 🏗️ 项目结构

```
src/
├── components/       # UI 组件（PluginCard / SearchBar / Settings…）
├── pages/             # 页面路由（MainPage / PluginDetail / Favorites / Settings / Docs）
├── services/          # API 适配层
│   ├── api-base.ts    # Fetch 核心：两级缓存 + 并发去重 + stale fallback
│   ├── spiget.ts      # SpigotMC 平台适配器
│   ├── hangar.ts      # Hangar 平台适配器
│   ├── modrinth.ts    # Modrinth 平台适配器
│   ├── versions.ts    # 版本历史统一 API
│   └── similar.ts     # 跨平台相似推荐
├── store/index.ts     # Zustand 全局状态（主题 / 平台开关 / 收藏 / 缓存配置 / AI 模型）
└── types/index.ts     # TypeScript 类型定义
```

## 🔌 后端平台

| 平台 | API | 特点 |
|------|-----|------|
| SpigotMC | `api.spiget.org/v2` | 资源 + 作者 + 分类 + 版本 |
| Hangar | `hangar.papermc.io/api/v1` | Paper 生态 + 完整 Markdown pages |
| Modrinth | `api.modrinth.com/v2` | 最丰富的 loader / game_version 数据 |

开发模式下走 Vite 代理（支持 HTTP_PROXY），生产环境通过 CORS 代理访问。桌面端（Tauri）直接请求。

## 🗄️ 缓存系统

设置页 → **API 缓存管理**，可按类型独立配置：

| 类型 | 用途 | 默认 TTL |
|------|------|----------|
| `search` | 关键词搜索列表 | 2 分钟 |
| `popular` | 首页热门推荐 | 10 分钟 |
| `detail` | 插件描述 + 评分 | 30 分钟 |
| `version` | 版本历史 + changelog | 15 分钟 |
| `meta` | 分类标签 + 作者信息 | 2 小时 |

缓存策略：
- 🧠 **两级存储**: 内存 Map（快）+ localStorage（持久化）
- 🔁 **stale-while-revalidate**: 过期缓存立即返回 + 后台静默刷新
- 📴 **离线 fallback**: 网络失败返回 24h 内的过期缓存
- 🚀 **并发去重**: 同 URL 同一时刻只发 1 个请求

## 🔑 AI 模型配置

设置页 → **AI 模型配置**，支持智谱 AI（默认 GLM-4.7-Flash 免费）和任何 OpenAI 兼容服务，按角色分配不同模型：

- 决策 / AI 搜索 / AI 对话 / AI 翻译 / 视觉识别

## 📦 部署

`.github/workflows/` 两个 Actions：

- `deploy.yml` — push 到 `main` 自动发布到 GitHub Pages
- `tauri-release.yml` — 打 `v*` tag 触发 Tauri 多平台构建 + Release

## 📄 协议

[GPL-3.0](LICENSE)
