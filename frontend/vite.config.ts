import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Dev server dong vai tro nginx: /api va /ws deu tro vao api-gateway, nen SPA chay
    // same-origin giong het khi build vao container. Khong can dat VITE_* nao ca.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: false,
        ws: true,
      },
    },
  },
})
