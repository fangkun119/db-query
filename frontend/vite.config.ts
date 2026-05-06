/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['node_modules', 'tests/e2e'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Increase timeout for long-running NL-to-SQL generation
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // Set longer timeout for proxy requests (2 minutes)
            if (proxyReq.path?.includes('/query/natural')) {
              proxyReq.setTimeout(120000);
            }
          });
        },
      },
    },
    headers: {
      // Allow eval for Vite HMR in development and image loading
      'Content-Security-Policy': "default-src 'self' 'unsafe-eval' 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' ws://localhost:* http://localhost:* wss://localhost:* https://localhost:* https://cdn.jsdelivr.net; img-src 'self' data: blob: https://telemetry.refine.dev https://*.refine.dev https://via.placeholder.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data: https://cdn.jsdelivr.net; worker-src 'self' blob:; child-src 'self' blob:;",
    },
  },
})
