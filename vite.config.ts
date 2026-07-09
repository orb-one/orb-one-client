import { defineConfig, defaultExclude } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'node:path'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = process.env.API_PROXY_TARGET ?? env.API_PROXY_TARGET

  return {
    plugins: [tanstackRouter({ target: 'react' }), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    ...(apiProxyTarget
      ? {
          server: {
            // 로컬 개발 전용 API proxy.
            // 서버 SameSite 정책을 낮추지 않고 HttpOnly 인증 cookie를 same-origin 흐름으로 검증한다.
            proxy: {
              '/auth': createApiProxy(apiProxyTarget),
              '/users': createApiProxy(apiProxyTarget),
            },
          },
        }
      : {}),
    test: {
      environment: 'jsdom',
      exclude: [...defaultExclude, 'e2e/**'],
      setupFiles: './src/test/setup.ts',
    },
  }
})

function createApiProxy(target: string) {
  return {
    target,
    changeOrigin: true,
    secure: true,
  }
}
