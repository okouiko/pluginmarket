# 10 · 构建、运行与部署

## 1. 环境要求

| 依赖 | 版本 / 说明 |
| --- | --- |
| Node.js | 20.x（CI 固定 Node 20；本地建议 ≥18） |
| npm | 随 Node 安装；仓库提供 `package-lock.json` |
| Rust | stable（仅桌面端） |
| Tauri CLI | `@tauri-apps/cli` 2.x（`npm run tauri` 或 `npx tauri`） |
| Linux 桌面依赖 | `libwebkit2gtk-4.1-dev`、`librsvg2-dev`、`patchelf`、`libgtk-3-dev`、`libayatana-appindicator3-dev` |
| 操作系统 | Web 端任意现代浏览器；桌面端 Windows / macOS / Linux |

## 2. npm 脚本

来自 [package.json](../../package.json)：

| 脚本 | 命令 | 作用 |
| --- | --- | --- |
| `npm run dev` | `vite` | 启动 Web 开发服务器，默认 `http://localhost:5173` |
| `npm run build` | `tsc -b && vite build` | TypeScript 类型检查 + 生产构建，输出 `dist/` |
| `npm run preview` | `vite preview` | 本地预览 `dist/` |
| `npm run lint` | `eslint .` | ESLint 静态检查 |
| `npm test` | `vitest run` | 单元测试 |
| `npm run typecheck` | `tsc -b` | 仅类型检查 |
| `npm run tauri` | `tauri` | Tauri CLI 透传（`npm run tauri dev` / `npm run tauri build`） |

仓库使用 **ESLint flat config**（`eslint.config.js`）与 **Vitest**（3 个测试文件），没有 Prettier 配置。

## 3. 本地开发

### 3.1 Web 模式

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。开发模式特征：

- API 通过 Vite 代理访问，不会触发 CORS。
- 未配置 AI Key 时，AI 入口显示提示，其余功能正常。
- 修改代码后 HMR 热更新。

### 3.2 桌面模式

```bash
npm run tauri dev
```

Tauri 会执行 `beforeDevCommand: npm run dev`，等待 `devUrl: http://localhost:5173`，再启动原生窗口。

### 3.3 开发环境下的 API 路由

| 平台 | 前端请求前缀 | Vite 代理目标 | rewrite |
| --- | --- | --- | --- |
| Spigot | `/api/spiget` | `https://api.spiget.org/v2` | 去掉 `/api/spiget` |
| Hangar | `/api/hangar` | `https://hangar.papermc.io/api/v1` | 去掉 `/api/hangar` |
| Modrinth | `/api/modrinth` | `https://api.modrinth.com/v2` | 去掉 `/api/modrinth` |

配置见 [vite.config.ts#L13-L30](../../vite.config.ts#L13-L30)。修改端口时需要同步 `src-tauri/tauri.conf.json` 的 `devUrl`。

## 4. 生产构建

### 4.1 Web 构建

```bash
npm run build
npm run preview   # 可选：本地预览 dist
```

构建细节：

- `tsc -b`：按 `tsconfig.json` 做类型检查（`noEmit: true`，仅检查）。
- `vite build`：输出到 `dist/`。
- `base: './'`：所有资源使用相对路径，适配 GitHub Pages 子路径与 Tauri。
- `@` 别名在 `vite.config.ts` 与 `tsconfig.json` 中保持一致。
- 文档以 `?raw` / `import.meta.glob` 打包，见 08。

产物结构（示意）：

```text
dist/
├── index.html
├── 404.html
├── favicon.svg
└── assets/
    ├── index-<hash>.js
    ├── index-<hash>.css
    ├── *.ttf
    └── 文档 chunk...
```

### 4.2 桌面构建

```bash
npx tauri build
# 或
npm run tauri build
```

流程：

1. `beforeBuildCommand` 执行 `npm run build`。
2. Tauri 使用 `frontendDist: ../dist`。
3. Rust Release 编译。
4. 按 `bundle.targets: "all"` 生成当前平台安装包，图标来自 `src-tauri/icons/`。

跨平台构建通常依赖 CI（见第 7 节），因为 Tauri 不支持从单一平台交叉编译所有目标。

## 5. 生产 Web 的 API 路由

Web 生产构建没有 Vite 代理，必须依赖 CORS 代理：

```text
corsProxy + encodeURIComponent("https://api.spiget.org/v2" + path)
```

默认：

```text
https://api.allorigins.win/raw?url=
```

用户可在 `/settings` 修改 `corsProxy`。可选方案：

- 自建轻量反向代理（推荐，稳定且可控）；
- 使用 Cloudflare Worker / Vercel Edge Function 转发；
- 其他支持 `?url=` 编码的公共 CORS 代理。

注意：

- 公共代理可能限流、失效或记录请求；
- 代理必须原样转发 JSON 与状态码；
- AI 请求 **不经过** `corsProxy`，由浏览器直连模型服务，要求模型服务允许跨域。

## 6. GitHub Pages 部署

工作流：[.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)

### 6.1 触发

```yaml
on:
  push:
    branches: [main]
```

推送到 `main` 即部署。

### 6.2 权限与并发

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: false
```

### 6.3 步骤

1. `actions/checkout@v4`
2. `actions/setup-node@v4`（Node 20，npm 缓存）
3. `npm ci`（严格按 `package-lock.json` 安装）
4. `npm run build`
5. `actions/configure-pages@v4`
6. `actions/upload-pages-artifact@v3` 上传 `./dist`
7. 独立 `deploy` job：`actions/deploy-pages@v4`

### 6.4 仓库设置

需要在 GitHub 仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**。首次部署后 URL 通常为：

```text
https://<owner>.github.io/<repo>/
```

`base: './'` 与 `HashRouter` 共同保证子路径下资源与路由可用。`public/404.html` 会把未知路径重定向回首页：

```html
<script>sessionStorage.redirect = location.href;</script>
<meta http-equiv="refresh" content="0;URL='/'">
```

> 该 404 页面只保存了原始 URL 到 `sessionStorage`，没有代码读取并恢复它；实际效果是回到首页。

## 7. Tauri Release 工作流

工作流：[.github/workflows/release.yml](../../.github/workflows/release.yml)

### 7.1 触发

```yaml
on:
  push:
    tags:
      - 'v*'
```

例如 `git tag v1.0.2 && git push origin v1.0.2`。

### 7.2 构建矩阵

| 平台 | Runner | Target | 产物 |
| --- | --- | --- | --- |
| Windows | `windows-latest` | `x86_64-pc-windows-msvc` | `.msi`、`.exe` |
| macOS | `macos-latest` | `aarch64-apple-darwin` | `.dmg`、`.app` |
| macOS | `macos-latest` | `x86_64-apple-darwin` | `.dmg`、`.app` |
| Linux | `ubuntu-22.04` | `x86_64-unknown-linux-gnu` | `.deb`、`.AppImage` |

`fail-fast: false`：单个平台失败不会取消其他平台。

### 7.3 步骤要点

- Node 20 + npm 缓存。
- `dtolnay/rust-toolchain@stable`，安装对应 target。
- Linux 安装 WebKit/GTK 依赖（见第 1 节）。
- `npm ci`（严格按 `package-lock.json` 安装）。
- `npx tauri build --target <target>`。
- 按平台上传 artifact。
- `release` job 下载全部 artifact，用 `softprops/action-gh-release@v2` 创建非草稿 Release，自动生成 release notes，附带所有安装包。

### 7.4 发布流程

```bash
# 1. 确认版本号一致
#    package.json / src-tauri/tauri.conf.json / src-tauri/Cargo.toml
# 2. 提交
git add .
git commit -m "release: v1.0.3"
# 3. 打标签并推送
git tag v1.0.3
git push origin main
git push origin v1.0.3
```

注意：`main` 推送会同时触发 Pages 部署，标签推送会触发桌面 Release。

## 8. 环境变量

项目 **没有** 使用 `.env` 或 `import.meta.env` 自定义变量（只使用 `import.meta.env.DEV` 判断环境）。因此：

- 不需要创建 `.env`；
- AI API Key 通过应用内设置写入 `localStorage`；
- CORS 代理通过设置页写入 `localStorage`；
- 若未来引入环境变量，Vite 侧需以 `VITE_` 前缀暴露。

`.gitignore` 已忽略 `.env`、`.env.local`、`.env.*.local`。

## 9. 质量校验现状

| 项目 | 状态 |
| --- | --- |
| TypeScript 类型检查 | `npm run typecheck` / `npm run build` |
| 单元测试 | `npm test`（Vitest，9 个用例） |
| 集成 / E2E 测试 | 无 |
| ESLint | `npm run lint`（flat config，0 error） |
| Prettier | 无 |
| 依赖审计 | 无 CI 步骤 |
| 提交钩子 | 无 |

## 10. 故障排查

| 现象 | 可能原因 | 解决 |
| --- | --- | --- |
| Web 端搜索一直为空 | CORS 代理失效 / 地址格式错误 | 在 `/settings` 换成可用代理；确认前缀以 `?url=` 结尾 |
| 开发环境 API 404 | Vite 代理未启动或路径拼错 | 检查 `vite.config.ts` 与 `api-base.ts` |
| AI 提示 401/403 | API Key 错误、过期或无权限 | 在设置页检查 Key 与 `baseUrl` |
| AI 提示“未配置模型” | 角色未分配或模型被禁用 | 设置页“AI 角色分配”选择启用模型 |
| AI 并发提示 | 同一模型被多标签页/多任务占用 | 等待、提高 `maxConcurrency`（无需刷新）或改用其他模型 |
| Tauri 窗口空白 | `devUrl` 端口与 Vite 不一致；`beforeDevCommand` 失败 | 检查 5173 端口占用与终端输出 |
| Tauri 端 API 走代理/报 CORS | 环境检测未识别 Tauri；或 CSP 阻止连接 | 确认 `isTauri()` 同时检测 `__TAURI_INTERNALS__`；检查 `tauri.conf.json` 的 `connect-src`（见 09） |
| Agent 读不到文件 | 目录不在 FS scope 白名单 / `serverPath` 错误 / 路径越界 | 将服务器放在 HOME、DOCUMENTS、DESKTOP、DOWNLOAD 下；检查路径与安全提示 |
| Linux 打包失败 | 缺少 WebKit/GTK 依赖 | 安装第 1 节列出的系统包 |
| `npm run build` 类型错误 | TS strict 模式 | 按错误修复；`noUnusedLocals` / `noUnusedParameters` 为 false，未使用变量不会报错 |
| CI 安装依赖失败 | lockfile 与 package.json 不一致 | 本地执行 `npm install` 更新 `package-lock.json` 并提交 |
| Pages 部署 404 | Pages Source 不是 GitHub Actions | 在仓库设置中切换 |
| Release 未生成 | 标签未以 `v` 开头或构建失败 | 检查 tag 与 Actions 日志 |

## 11. 依赖与版本一致性问题

以下三处版本号为 `1.0.2`，发布前需同步：

| 文件 | 字段 |
| --- | --- |
| `package.json` | `"version": "1.0.2"` |
| `src-tauri/tauri.conf.json` | `"version": "1.0.2"` |
| `src-tauri/Cargo.toml` | `version = "1.0.2"` |

GitHub Actions 使用 `npm ci` 并保留 `package-lock.json`，构建结果可复现：

```bash
npm ci   # 严格按 lockfile 安装
```

发布前若修改依赖，应在本地执行 `npm install` 更新 lockfile 并一起提交。
