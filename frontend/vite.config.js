import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/upload': 'http://127.0.0.1:8000',
      '/ask': 'http://127.0.0.1:8000',
      '/status': 'http://127.0.0.1:8000',
      '/reset': 'http://127.0.0.1:8000',
    }
  }
})
