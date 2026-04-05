import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // These three rewrite /api/sensors → /sensors etc.
      // because the backend mounts them without /api prefix
      '/api/sensors': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sensors/, '/sensors'),
      },
      '/api/region': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/region/, '/region'),
      },
      '/api/audit': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/audit/, '/audit'),
      },
      // Everything else under /api goes through as-is (alerts, data, etc.)
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    }
  }
})