import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { HttpsProxyAgent } from 'https-proxy-agent'

// 自动从环境变量读取代理（沙箱/CI 环境必须走 HTTP_PROXY 才能访问外网）
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy

const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

export default defineConfig({
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
})
