import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, 
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://10.214.234.116:5000', // ต้องชี้ไปที่ IP เครื่องตัวเอง Port 5000
        changeOrigin: true,
        secure: false,
      }
    },
    allowedHosts: 'all' 
  }
})