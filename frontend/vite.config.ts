import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    headers: {
      // Allow eval for Vite HMR in development and image loading
      'Content-Security-Policy': [
        "default-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "connect-src 'self' ws://localhost:* http://localhost:* wss://localhost:* https://localhost:*",
        "img-src 'self' data: blob: https://telemetry.refine.dev https://*.refine.dev https://via.placeholder.com",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
      ].join('; '),
    },
  },
})
