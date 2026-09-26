import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { HttpsProxyAgent } from 'https-proxy-agent'

// 沙箱/CI 环境检测：存在 HTTP_PROXY/HTTPS_PROXY 时，给 vite proxy 配置 agent 走代理
// （这样前端在 DEV 模式下通过 vite proxy 能正确访问外部 API，
// 不需要走 allorigins.win 之类的 CORS 代理——那些 CORS 代理的后端服务器访问 Hangar/Spigot 不通）
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy

const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    base: './',
    server: {
      proxy: {
        '/api/spiget': {
          target: 'https://api.spiget.org/v2',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/spiget/, ''),
          agent: proxyAgent,
          timeout: 15000,
          proxyTimeout: 15000,
        },
        '/api/hangar': {
          target: 'https://hangar.papermc.io/api/v1',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/hangar/, ''),
          agent: proxyAgent,
          timeout: 15000,
          proxyTimeout: 15000,
        },
        '/api/modrinth': {
          target: 'https://api.modrinth.com/v2',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/modrinth/, ''),
          agent: proxyAgent,
          timeout: 15000,
          proxyTimeout: 15000,
        },
      },
    },
  }
})
