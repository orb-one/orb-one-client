import { defineConfig, defaultExclude } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'node:path'
import { loadEnv, type ProxyOptions } from 'vite'

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
              '/solutions': createApiProxy(apiProxyTarget),
              '/users': createApiProxy(apiProxyTarget),
              '/groups': createApiProxy(apiProxyTarget),
              '/problems': createApiProxy(apiProxyTarget),
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

function createApiProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    secure: true,
    configure(proxy) {
      // 브라우저는 Vite와 same-origin이고 CORS 판단은 proxy 경계에서 끝난다.
      // upstream에 localhost Origin을 전달하면 배포 API가 이를 외부 origin으로 거부한다.
      proxy.on('proxyReq', (proxyRequest) => {
        proxyRequest.removeHeader('origin')
      })
    },
    // client route와 API path가 같아도 HTML navigation은 SPA entry로 보낸다.
    bypass(request) {
      if (request.headers.accept?.includes('text/html')) {
        return '/index.html'
      }
    },
  }
}
