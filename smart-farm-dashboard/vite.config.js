import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  build: {
    target: 'es2015'
  },
  server: {
    host: true, 
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // ชี้ไปที่ Flask ที่ port 8000
        changeOrigin: true,
        secure: false,
      }
    },
    allowedHosts: 'all' 
  }
})